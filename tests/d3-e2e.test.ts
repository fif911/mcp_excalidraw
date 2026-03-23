import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn, type ChildProcess } from 'child_process';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('E2E: D3 via HTTP API', () => {
  const PORT = 3099;
  let serverProcess: ChildProcess | null = null;

  beforeAll(async () => {
    // Use spawn (not exec) for reliable process cleanup
    serverProcess = spawn('node', ['dist/server.js'], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'pipe',
    });

    // Wait for server to be ready
    let retries = 20;
    while (retries > 0) {
      try {
        const res = await fetch(`http://localhost:${PORT}/api/elements`);
        if (res.ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 500));
      retries--;
    }
    if (retries === 0) {
      serverProcess?.kill('SIGTERM');
      throw new Error(`Server failed to start on port ${PORT}`);
    }
  }, 30000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  it('converts coordinate-free D3 and returns correct counts', async () => {
    const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-auto.d3'), 'utf-8');

    const res = await fetch(`http://localhost:${PORT}/api/elements/from-d3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ d3Diagram: d3Source }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.elementCount).toBeGreaterThanOrEqual(60);
    expect(data.containers).toBeGreaterThanOrEqual(5);
    expect(data.nodes).toBeGreaterThanOrEqual(15);
    expect(data.arrows).toBeGreaterThanOrEqual(9);
    expect(data.badges).toBeGreaterThanOrEqual(8);

    // No critical validation issues (ARROW_REROUTED is informational — it means
    // the system auto-corrected a diagonal; only flag unfixed DIAGONAL: issues)
    const critical = (data.validationIssues || []).filter((i: string) =>
      i.startsWith('DIAGONAL:') || i.includes('overlap'));
    expect(critical).toEqual([]);
  });

  it('existing coordinate-heavy D3 still works (regression)', async () => {
    const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-current.d3'), 'utf-8');

    const res = await fetch(`http://localhost:${PORT}/api/elements/from-d3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ d3Diagram: d3Source }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.elementCount).toBeGreaterThanOrEqual(60);
  });
});
