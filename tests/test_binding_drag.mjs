import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = 'http://localhost:3000';

async function testBindingDrag() {
  // 1. First clear and create elements via REST API
  console.log('Setting up test elements...');
  await fetch(`${API}/api/elements/clear`, { method: 'DELETE' });
  await sleep(500);

  const createResp = await fetch(`${API}/api/elements/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elements: [
      { id: 'input', type: 'rectangle', x: 100, y: 200, width: 160, height: 80, label: { text: 'Input', fontFamily: 'helvetica' }, backgroundColor: '#dbeafe', strokeColor: '#1e40af', fillStyle: 'solid', roughness: 0 },
      { id: 'process', type: 'rectangle', x: 400, y: 200, width: 160, height: 80, label: { text: 'Process', fontFamily: 'helvetica' }, backgroundColor: '#dbeafe', strokeColor: '#1e40af', fillStyle: 'solid', roughness: 0 },
      { id: 'output', type: 'rectangle', x: 700, y: 200, width: 160, height: 80, label: { text: 'Output', fontFamily: 'helvetica' }, backgroundColor: '#dbeafe', strokeColor: '#1e40af', fillStyle: 'solid', roughness: 0 },
      { type: 'arrow', id: 'a1', x: 0, y: 0, start: { id: 'input' }, end: { id: 'process' }, strokeColor: '#1e40af' },
      { type: 'arrow', id: 'a2', x: 0, y: 0, start: { id: 'process' }, end: { id: 'output' }, strokeColor: '#1e40af' },
    ]})
  });
  const created = await createResp.json();
  console.log(`Created ${created.count} elements`);

  // Print server-side binding state
  console.log('\n=== SERVER-SIDE BINDINGS ===');
  for (const el of created.elements) {
    if (el.type === 'arrow') {
      console.log(`  ${el.id} (arrow): startBinding=${JSON.stringify(el.startBinding)}, endBinding=${JSON.stringify(el.endBinding)}`);
    } else {
      console.log(`  ${el.id} (${el.type}): boundElements=${JSON.stringify(el.boundElements)}`);
    }
  }

  // 2. Launch browser
  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1200, height: 800 } });
  const page = await browser.newPage();
  await page.goto(API, { waitUntil: 'networkidle0' });
  await sleep(3000);

  // 3. Access the Excalidraw API through React fiber
  const browserBindings = await page.evaluate(() => {
    // Find excalidraw canvas and walk React fiber to get API
    const canvas = document.querySelector('.excalidraw');
    if (!canvas) return { error: 'no excalidraw element' };

    // Try to find the API through React internals
    const key = Object.keys(canvas).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (!key) return { error: 'no React fiber found' };

    let fiber = canvas[key];
    let api = null;
    // Walk up the fiber tree to find the component with excalidrawAPI state
    for (let i = 0; i < 50 && fiber; i++) {
      if (fiber.memoizedState) {
        // Walk the hooks chain
        let hook = fiber.memoizedState;
        for (let j = 0; j < 30 && hook; j++) {
          const val = hook.memoizedState;
          if (val && typeof val === 'object' && typeof val.getSceneElements === 'function') {
            api = val;
            break;
          }
          // Check queue for useState pairs
          if (hook.queue && hook.queue.lastRenderedState && typeof hook.queue.lastRenderedState === 'object') {
            const st = hook.queue.lastRenderedState;
            if (st && typeof st.getSceneElements === 'function') {
              api = st;
              break;
            }
          }
          hook = hook.next;
        }
        if (api) break;
      }
      fiber = fiber.return;
    }

    if (!api) return { error: 'excalidrawAPI not found in fiber tree' };

    // Expose it globally for later use
    window._testAPI = api;

    const elements = api.getSceneElements().filter(e => !e.isDeleted);
    const result = {};
    for (const el of elements) {
      result[el.id] = {
        type: el.type,
        x: Math.round(el.x),
        y: Math.round(el.y),
        startBinding: el.startBinding || null,
        endBinding: el.endBinding || null,
        boundElements: el.boundElements || null,
      };
    }
    return { elementCount: elements.length, elements: result };
  });

  console.log('\n=== BROWSER-SIDE BINDINGS (before drag) ===');
  if (browserBindings.error) {
    console.log(`ERROR: ${browserBindings.error}`);
    await browser.close();
    return;
  }
  console.log(`Elements in browser: ${browserBindings.elementCount}`);
  for (const [id, el] of Object.entries(browserBindings.elements)) {
    if (el.type === 'arrow') {
      console.log(`  ${id} (arrow): x=${el.x}, startBinding=${JSON.stringify(el.startBinding)}, endBinding=${JSON.stringify(el.endBinding)}`);
    } else {
      console.log(`  ${id} (${el.type}): x=${el.x}, y=${el.y}, boundElements=${JSON.stringify(el.boundElements)}`);
    }
  }

  // 4. Scroll to content first
  await page.evaluate(() => {
    window._testAPI.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.7 });
  });
  await sleep(1000);

  // 5. Get the screen coordinates for the input box
  const coords = await page.evaluate(() => {
    const api = window._testAPI;
    const state = api.getAppState();
    const inputEl = api.getSceneElements().find(e => e.id === 'input' && !e.isDeleted);
    if (!inputEl) return null;

    // Scene to screen coordinate conversion
    const centerX = inputEl.x + inputEl.width / 2;
    const centerY = inputEl.y + inputEl.height / 2;
    const screenX = (centerX + state.scrollX) * state.zoom.value + state.offsetLeft;
    const screenY = (centerY + state.scrollY) * state.zoom.value + state.offsetTop;
    return { screenX, screenY, zoom: state.zoom.value, scrollX: state.scrollX, scrollY: state.scrollY };
  });

  if (!coords) {
    console.log('ERROR: Could not find input element coordinates');
    await browser.close();
    return;
  }

  console.log(`\nInput box screen center: (${coords.screenX.toFixed(0)}, ${coords.screenY.toFixed(0)}), zoom=${coords.zoom.toFixed(2)}`);

  // 6. Click to select, then drag
  await page.mouse.click(coords.screenX, coords.screenY);
  await sleep(500);

  // Verify selection
  const selected = await page.evaluate(() => {
    const state = window._testAPI.getAppState();
    return Object.keys(state.selectedElementIds);
  });
  console.log(`Selected elements: ${JSON.stringify(selected)}`);

  console.log('Dragging input box 100px right...');
  await page.mouse.move(coords.screenX, coords.screenY);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(coords.screenX + i * 5, coords.screenY);
    await sleep(20);
  }
  await page.mouse.up();
  await sleep(1000);

  // 7. Check AFTER drag
  const afterDrag = await page.evaluate(() => {
    const api = window._testAPI;
    const elements = api.getSceneElements().filter(e => !e.isDeleted);
    const result = {};
    for (const el of elements) {
      result[el.id] = {
        type: el.type,
        x: Math.round(el.x),
        y: Math.round(el.y),
      };
    }
    return result;
  });

  console.log('\n=== AFTER DRAG ===');
  const inputBefore = browserBindings.elements['input'];
  const inputAfter = afterDrag['input'];
  const a1Before = browserBindings.elements['a1'];
  const a1After = afterDrag['a1'];

  if (inputAfter) {
    console.log(`  input box: x=${inputBefore.x} → ${inputAfter.x} (dx=${inputAfter.x - inputBefore.x})`);
  }
  if (a1After) {
    console.log(`  arrow a1:  x=${a1Before.x} → ${a1After.x} (dx=${a1After.x - a1Before.x})`);
    if (Math.abs(a1After.x - a1Before.x) > 5) {
      console.log('  ✅ BINDING WORKS — arrow followed the box!');
    } else {
      console.log('  ❌ BINDING BROKEN — arrow did NOT move with the box');
    }
  }

  console.log('\nAll positions after drag:');
  for (const [id, el] of Object.entries(afterDrag)) {
    console.log(`  ${id}: x=${el.x}, y=${el.y}`);
  }

  await sleep(3000);
  await browser.close();
}

testBindingDrag().catch(console.error);
