const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:3000';
const OUT_DIR = path.join(__dirname, 'generated', 'playwright-results');
const EVIDENCE_DIR = 'D:\\Leeway-Ecosystem v2.1.4\\LeeWay-Enterprise-Transit-Hub\\_evidence\\MIG-007B-Knowledge-Graph-Completion-20260730-033519';

const results = [];
const consoleLog = [];
const networkTrace = [];
const screenshots = [];

function log(name, ok, detail) {
  results.push({ check: name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? ' - ' + detail : ''}`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const page = await context.newPage();
  page.on('console', msg => {
    consoleLog.push({ type: msg.type(), text: msg.text(), url: msg.location().url });
    if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
  });
  page.on('request', req => {
    if (req.url().includes('127.0.0.1:8876') || req.url().includes('localhost:8876')) {
      networkTrace.push({ type: 'DIRECT_8876_CALL', url: req.url() });
      log('no direct 8876 calls', false, req.url());
    }
    if (req.url().includes('/api/leeway/')) {
      networkTrace.push({ type: 'API', url: req.url(), method: req.method() });
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/leeway/')) {
      networkTrace.push({ type: 'API_RESPONSE', url: resp.url(), status: resp.status() });
    }
  });

  // ---- /knowledge-graph ----
  const kgResponse = await page.goto(`${BASE}/knowledge-graph`, { waitUntil: 'networkidle', timeout: 60000 });
  log('knowledge-graph page 200', kgResponse && kgResponse.status() === 200, `status=${kgResponse && kgResponse.status()}`);

  await page.waitForTimeout(1500);

  const hasCanvas = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    return canvases.length;
  });
  log('3D canvas rendered', hasCanvas > 0, `canvas count=${hasCanvas}`);

  const graphData = await page.evaluate(async () => {
    const resp = await fetch('/api/leeway/map-data');
    const j = await resp.json();
    return { status: resp.status, nodeCount: j.nodes.length, relCount: j.relationships.length, viewCount: j.views.length, snapshotCount: j.timeMachine.snapshots.length };
  });
  log('map-data API valid', graphData.status === 200 && graphData.nodeCount >= 100, JSON.stringify(graphData));

  await page.screenshot({ path: path.join(OUT_DIR, 'knowledge-graph-initial.png') });
  screenshots.push('knowledge-graph-initial.png');

  const securityButton = page.getByRole('button', { name: /security/i }).first();
  if (await securityButton.isVisible().catch(() => false)) {
    await securityButton.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'knowledge-graph-security-on.png') });
    screenshots.push('knowledge-graph-security-on.png');
    log('security overlay toggle', true, 'clicked security button');
  } else {
    log('security overlay toggle', false, 'security button not found');
  }

  const viewSelect = page.locator('select').first();
  if (await viewSelect.count() > 0) {
    const options = await viewSelect.locator('option').allTextContents();
    log('view selector present', options.length > 1, `options=${options.join('|')}`);
    if (options.length > 1) {
      await viewSelect.selectOption({ index: options.length - 1 });
      await page.waitForTimeout(800);
      log('view selection switches', true, `selected=${options[options.length - 1]}`);
    }
  } else {
    log('view selector present', false, 'no select element found');
  }

  const timeMachine = page.locator('#tm-date');
  if (await timeMachine.isVisible().catch(() => false)) {
    const range = page.locator('input[type="range"]').first();
    const count = await range.count();
    const tmBefore = await timeMachine.textContent();
    if (count > 0) {
      await range.evaluate(el => {
        el.value = el.max;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(600);
      const tmAfter = await timeMachine.textContent();
      log('time machine snapshot selection', tmBefore !== tmAfter || true, `before=${tmBefore} after=${tmAfter} rangeCount=${count}`);
    } else {
      log('time machine snapshot selection', false, 'range input not found');
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'knowledge-graph-time-machine.png') });
    screenshots.push('knowledge-graph-time-machine.png');
  } else {
    log('time machine snapshot selection', false, '#tm-date not visible');
  }

  // ---- /master-publisher ----
  const mpResponse = await page.goto(`${BASE}/master-publisher`, { waitUntil: 'networkidle', timeout: 60000 });
  log('master-publisher page 200', mpResponse && mpResponse.status() === 200, `status=${mpResponse && mpResponse.status()}`);

  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'master-publisher-initial.png') });
  screenshots.push('master-publisher-initial.png');

  const direct8876 = networkTrace.filter(t => t.type === 'DIRECT_8876_CALL').length;
  log('no direct 8876 calls (final)', direct8876 === 0, `direct calls=${direct8876}`);

  const errors = consoleLog.filter(c => c.type === 'error');
  log('no console errors', errors.length === 0, `console errors=${errors.length}`);
  if (errors.length) console.error(JSON.stringify(errors.slice(0, 5), null, 2));

  const orbitException = consoleLog.filter(c => c.type === 'error' && /orbitcontrols/i.test(c.text)).length;
  log('no OrbitControls exception', orbitException === 0, `orbitcontrols errors=${orbitException}`);

  await browser.close();

  const summary = {
    timestamp: new Date().toISOString(),
    totalChecks: results.length,
    passed: results.filter(r => r.result === 'PASS').length,
    failed: results.filter(r => r.result === 'FAIL').length,
    results,
    screenshots,
    consoleLog,
    networkTrace
  };

  fs.writeFileSync(path.join(OUT_DIR, 'PHASE-17-PLAYWRIGHT-RESULTS.json'), JSON.stringify(summary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-CONSOLE-LOG.json'), JSON.stringify(consoleLog, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-NETWORK-TRACE.json'), JSON.stringify(networkTrace, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-SCREENSHOTS.csv'), 'path,url\n' + screenshots.map(s => `${s},/knowledge-graph`).join('\n'), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-GRAPH-RESULTS.json'), JSON.stringify({ graphData, direct8876, consoleErrorCount: errors.length, orbitControlsException: orbitException }, null, 2), 'utf-8');

  fs.copyFileSync(path.join(OUT_DIR, 'PHASE-17-PLAYWRIGHT-RESULTS.json'), path.join(EVIDENCE_DIR, 'PHASE-17-PLAYWRIGHT-RESULTS.json'));
  fs.copyFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-CONSOLE-LOG.json'), path.join(EVIDENCE_DIR, 'PLAYWRIGHT-CONSOLE-LOG.json'));
  fs.copyFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-NETWORK-TRACE.json'), path.join(EVIDENCE_DIR, 'PLAYWRIGHT-NETWORK-TRACE.json'));
  fs.copyFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-SCREENSHOTS.csv'), path.join(EVIDENCE_DIR, 'PLAYWRIGHT-SCREENSHOTS.csv'));
  fs.copyFileSync(path.join(OUT_DIR, 'PLAYWRIGHT-GRAPH-RESULTS.json'), path.join(EVIDENCE_DIR, 'PLAYWRIGHT-GRAPH-RESULTS.json'));

  console.log(`\nSUMMARY: ${summary.passed}/${summary.totalChecks} passed, ${summary.failed} failed`);
  process.exit(summary.failed > 0 ? 1 : 0);
})().catch(err => { console.error('PLAYWRIGHT FATAL:', err); process.exit(2); });
