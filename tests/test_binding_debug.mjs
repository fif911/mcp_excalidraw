import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = 'http://localhost:3000';

async function debugBindings() {
  // Clear and create fresh
  await fetch(`${API}/api/elements/clear`, { method: 'DELETE' });
  await sleep(500);

  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1200, height: 800 } });
  const page = await browser.newPage();

  // Enable console logging from page
  page.on('console', msg => {
    if (msg.text().startsWith('[BIND]')) console.log(msg.text());
  });

  await page.goto(API, { waitUntil: 'networkidle0' });
  await sleep(2000);

  // Inject logging into the page to trace what happens during batch create
  await page.evaluate(() => {
    // Monkey-patch convertToExcalidrawElements to log before/after
    const origConvert = window.__excalidraw_convert__;
    // We can't easily patch the import, so let's just observe the WebSocket messages
    const origWsHandler = window._ws_onmessage;
  });

  // Now create elements via API — this triggers WebSocket → browser
  console.log('\nCreating elements via batch API...');
  const resp = await fetch(`${API}/api/elements/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elements: [
      { id: 'box-a', type: 'rectangle', x: 100, y: 200, width: 160, height: 80, label: { text: 'Box A', fontFamily: 'helvetica' }, backgroundColor: '#dbeafe', strokeColor: '#1e40af', fillStyle: 'solid', roughness: 0 },
      { id: 'box-b', type: 'rectangle', x: 400, y: 200, width: 160, height: 80, label: { text: 'Box B', fontFamily: 'helvetica' }, backgroundColor: '#dbeafe', strokeColor: '#1e40af', fillStyle: 'solid', roughness: 0 },
      { type: 'arrow', id: 'arr-1', x: 0, y: 0, start: { id: 'box-a' }, end: { id: 'box-b' }, strokeColor: '#1e40af' },
    ]})
  });
  const created = await resp.json();
  console.log('Server response:');
  for (const el of created.elements) {
    console.log(`  ${el.id}: startBinding=${JSON.stringify(el.startBinding)}, endBinding=${JSON.stringify(el.endBinding)}, boundElements=${JSON.stringify(el.boundElements)}`);
  }

  await sleep(2000); // Wait for WebSocket delivery

  // Now check what's in the browser
  const browserState = await page.evaluate(() => {
    const canvas = document.querySelector('.excalidraw');
    if (!canvas) return { error: 'no excalidraw' };
    const key = Object.keys(canvas).find(k => k.startsWith('__reactFiber$'));
    if (!key) return { error: 'no fiber' };

    let fiber = canvas[key];
    let api = null;
    for (let i = 0; i < 50 && fiber; i++) {
      if (fiber.memoizedState) {
        let hook = fiber.memoizedState;
        for (let j = 0; j < 30 && hook; j++) {
          const val = hook.memoizedState;
          if (val && typeof val === 'object' && typeof val.getSceneElements === 'function') {
            api = val;
            break;
          }
          if (hook.queue?.lastRenderedState?.getSceneElements) {
            api = hook.queue.lastRenderedState;
            break;
          }
          hook = hook.next;
        }
        if (api) break;
      }
      fiber = fiber.return;
    }
    if (!api) return { error: 'no API' };
    window._testAPI = api;

    const elements = api.getSceneElements().filter(e => !e.isDeleted);
    return elements.map(el => ({
      id: el.id,
      type: el.type,
      x: Math.round(el.x),
      y: Math.round(el.y),
      startBinding: el.startBinding || null,
      endBinding: el.endBinding || null,
      boundElements: el.boundElements || null,
      text: el.text || null,
      containerId: el.containerId || null,
    }));
  });

  console.log('\n=== BROWSER STATE ===');
  if (browserState.error) {
    console.log(`ERROR: ${browserState.error}`);
  } else {
    for (const el of browserState) {
      if (el.type === 'arrow') {
        console.log(`  ${el.id} (arrow): startBinding=${JSON.stringify(el.startBinding)}, endBinding=${JSON.stringify(el.endBinding)}`);
      } else if (el.type === 'text') {
        console.log(`  ${el.id} (text): "${el.text}", containerId=${el.containerId}`);
      } else {
        console.log(`  ${el.id} (${el.type}): boundElements=${JSON.stringify(el.boundElements)}`);
      }
    }

    // Check if binding is actually functional
    const hasArrowBindings = browserState.some(el => el.type === 'arrow' && (el.startBinding || el.endBinding));
    const hasShapeBindings = browserState.some(el => el.type !== 'arrow' && el.type !== 'text' && el.boundElements?.some(b => b.type === 'arrow'));

    console.log(`\nArrows have bindings: ${hasArrowBindings ? '✅' : '❌'}`);
    console.log(`Shapes have boundElements: ${hasShapeBindings ? '✅' : '❌'}`);

    if (!hasArrowBindings) {
      console.log('\n⚠️  Arrow bindings are being stripped by convertToExcalidrawElements() and NOT restored by restoreBindings()');
      console.log('   This means dragging a shape will NOT move connected arrows.');
    }
  }

  // Now try drag test
  if (!browserState.error) {
    const scrollInfo = await page.evaluate(() => {
      const api = window._testAPI;
      api.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.7 });
      const s = api.getAppState();
      return { scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom.value, offsetLeft: s.offsetLeft, offsetTop: s.offsetTop };
    });
    await sleep(500);

    // Recompute after scroll
    const coords2 = await page.evaluate(() => {
      const api = window._testAPI;
      const s = api.getAppState();
      const el = api.getSceneElements().find(e => e.id === 'box-a');
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      return {
        sx: (cx + s.scrollX) * s.zoom.value + s.offsetLeft,
        sy: (cy + s.scrollY) * s.zoom.value + s.offsetTop,
      };
    });

    console.log(`\nDrag test: clicking box-a at (${coords2.sx.toFixed(0)}, ${coords2.sy.toFixed(0)})`);
    await page.mouse.click(coords2.sx, coords2.sy);
    await sleep(300);

    await page.mouse.move(coords2.sx, coords2.sy);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(coords2.sx + i * 5, coords2.sy);
      await sleep(20);
    }
    await page.mouse.up();
    await sleep(500);

    const afterDrag = await page.evaluate(() => {
      const api = window._testAPI;
      return api.getSceneElements().filter(e => !e.isDeleted).map(el => ({
        id: el.id, type: el.type, x: Math.round(el.x),
      }));
    });

    const boxABefore = browserState.find(e => e.id === 'box-a');
    const boxAAfter = afterDrag.find(e => e.id === 'box-a');
    const arrBefore = browserState.find(e => e.id === 'arr-1');
    const arrAfter = afterDrag.find(e => e.id === 'arr-1');

    console.log(`box-a: ${boxABefore.x} → ${boxAAfter?.x} (dx=${(boxAAfter?.x||0) - boxABefore.x})`);
    console.log(`arr-1: ${arrBefore.x} → ${arrAfter?.x} (dx=${(arrAfter?.x||0) - arrBefore.x})`);
    console.log((arrAfter?.x||0) - arrBefore.x > 5 ? '✅ Arrow moved with box!' : '❌ Arrow stayed put — binding broken');
  }

  await sleep(3000);
  await browser.close();
}

debugBindings().catch(console.error);
