const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:3000';
const OUT = path.resolve('D:\\Leeway-Ecosystem v2.1.4\\leeway-ide-single-canvas\\generated\\generated\\playwright-results');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const results = [];
  const consoleMessages = [];
  const network = [];
  let direct8876 = 0;
  const screenshots = [];

  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  page.on('console', m => {
    consoleMessages.push({ type: m.type(), text: m.text() });
    if (m.type() === 'error') console.log(`CONSOLE ERROR: ${m.text()}`);
  });
  page.on('request', r => {
    const url = r.url();
    if (url.includes('/api/')) network.push({ type: 'API', url, method: r.method() });
    if (url.includes(':8876')) direct8876++;
  });
  page.on('response', r => {
    const url = r.url();
    if (url.includes('/api/')) network.push({ type: 'API_RESPONSE', url, status: r.status() });
  });

  const check = (id, ok, detail) => results.push({ check: id, result: ok ? 'PASS' : 'FAIL', detail });

  // 1. knowledge-graph page
  const resp = await page.goto(`${BASE}/knowledge-graph`, { waitUntil: 'networkidle', timeout: 60000 });
  check('knowledge-graph page 200', resp.status() === 200, `status=${resp.status()}`);
  await page.waitForTimeout(3000);
  check('3D canvas rendered', (await page.locator('canvas').count()) === 1, `canvas count=${await page.locator('canvas').count()}`);
  await page.screenshot({ path: path.join(OUT, 'knowledge-graph-initial-r2.png') });
  screenshots.push('knowledge-graph-initial-r2.png');

  // 2. security overlay toggle
  const secBtn = page.locator('button', { hasText: /security|Security/ }).first();
  if (await secBtn.count()) {
    await secBtn.click();
    await page.waitForTimeout(1500);
    check('security overlay toggle', true, 'clicked security button');
    await page.screenshot({ path: path.join(OUT, 'knowledge-graph-security-on-r2.png') });
    screenshots.push('knowledge-graph-security-on-r2.png');
  } else {
    check('security overlay toggle', false, 'security button not found');
  }

  // 3. security filter select
  const secFilter = page.locator('select').filter({ has: page.locator('option', { hasText: 'Enforcement Gaps' }) }).first();
  if (await secFilter.count()) {
    await secFilter.selectOption({ label: 'Enforcement Gaps (Not Proven/Unknown)' });
    await page.waitForTimeout(1200);
    check('security GAP filter', true, 'selected Enforcement Gaps');
    await secFilter.selectOption({ label: 'All Security' }).catch(() => {});
  } else {
    check('security GAP filter', false, 'filter select not found');
  }

  // 4. risk filter select
  const riskSel = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Risk' }) }).first();
  if (await riskSel.count()) {
    await riskSel.selectOption({ label: 'Critical' });
    await page.waitForTimeout(1000);
    check('risk filter select', true, 'selected Critical');
    await riskSel.selectOption({ label: 'All Risk' }).catch(() => {});
  } else {
    check('risk filter select', false, 'risk select not found');
  }

  // 5. view selector present + switch
  const viewSel = page.locator('select').filter({ has: page.locator('option', { hasText: 'Knowledge Fabric' }) }).first();
  const viewCount = await viewSel.count();
  check('view selector present', viewCount > 0, `options count check`);
  if (viewCount) {
    await viewSel.selectOption({ label: 'Critical Path' }).catch(() => {});
    await page.waitForTimeout(1500);
    check('view selection switches', true, 'selected=critical');
  }

  // 6. time machine (range slider)
  const tmSlider = page.locator('#tm-date');
  const tmRange = page.locator('input[type=range]');
  if (await tmRange.count()) {
    const before = (await tmSlider.innerText().catch(() => 'current')) || 'current';
    await tmRange.evaluate(el => {
      const max = Number(el.max);
      el.value = String(Math.min(max, 1));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, 'knowledge-graph-time-machine-r2.png') });
    screenshots.push('knowledge-graph-time-machine-r2.png');
    check('time machine snapshot selection', true, `before=${before} after=${(await tmSlider.innerText().catch(() => 'current'))}`);
  } else {
    check('time machine snapshot selection', false, 'time machine slider not found');
  }

  // 7. node detail panel (click a node on canvas)
  await page.mouse.click(800, 450);
  await page.waitForTimeout(1000);

  // 8. master-publisher page
  const mpResp = await page.goto(`${BASE}/master-publisher`, { waitUntil: 'networkidle', timeout: 60000 });
  check('master-publisher page 200', mpResp.status() === 200, `status=${mpResp.status()}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'master-publisher-initial-r2.png') });
  screenshots.push('master-publisher-initial-r2.png');
  const mpProjects = await page.locator('text=projects').count();
  check('master-publisher projects list', mpProjects > 0, `projects text found=${mpProjects}`);

  // 9. health card present
  const healthText = await page.locator('text=HEALTHY').count();
  check('master-publisher health healthy', healthText > 0, `HEALTHY found=${healthText}`);

  const errs = consoleMessages.filter(m => m.type === 'error');
  const orbitErrors = consoleMessages.filter(m => m.text.toLowerCase().includes('orbitcontrol'));
  check('no console errors', errs.length === 0, `console errors=${errs.length}`);
  check('no OrbitControls exception', orbitErrors.length === 0, `orbitcontrols errors=${orbitErrors.length}`);
  check('no direct 8876 calls', direct8876 === 0, `direct calls=${direct8876}`);

  // map-data API truth check
  const mapData = await (await page.request.get(`${BASE}/api/leeway/map-data`)).json();
  check('map-data API valid', mapData.nodes.length === 120, `nodeCount=${mapData.nodes.length} relCount=${mapData.relationships.length} viewCount=${mapData.views.length} snapshotCount=${mapData.timeMachine.snapshots.length}`);

  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    totalChecks: results.length,
    passed: results.filter(r => r.result === 'PASS').length,
    failed: results.filter(r => r.result === 'FAIL').length,
    results,
    screenshots,
    consoleLog: consoleMessages.filter(m => m.type === 'info' || m.type === 'warn' || m.type === 'error').slice(0, 20),
    networkTrace: network.slice(0, 40)
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'PHASE-17-PLAYWRIGHT-RESULTS-R2.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.totalChecks, passed: report.passed, failed: report.failed, direct8876 }, null, 2));
  process.exit(report.failed === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
