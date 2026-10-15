// Captures screenshots of the real StyleSwift side panel for the promo video (public/panel/*.png).
//
// The real extension runs in Chromium and its page tools really run on the target website. Only the model is
// scripted: its requests are answered by a mock that calls View Page Structure → Search Page Elements →
// Apply Styles and then replies with the text in panel-runs.json, so no API key is needed.
//
// Usage (from styleswift-intro-video/):  node scripts/capture-panel.cjs
//   CHROME_PATH  full Chromium/Chrome build that can load extensions (Playwright's headless shell cannot)
//   HTTPS_PROXY  optional, used to reach the target websites
//   ONLY         optional comma-separated run keys to (re)capture, e.g. ONLY=linuxdo-cozy,douban-eink
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const {chromium} = require(require.resolve('playwright', {paths: [REPO]}));

const EXTENSION = path.join(REPO, 'extension');
const OUT = path.join(ROOT, 'public', 'panel');
const ALL_RUNS = JSON.parse(fs.readFileSync(path.join(__dirname, 'panel-runs.json'), 'utf8'));
const RUNS = process.env.ONLY ? ALL_RUNS.filter((r) => process.env.ONLY.split(',').includes(r.key)) : ALL_RUNS;
const API = 'https://api.openai.com/v1';
// 400×940 CSS px is the panel's slot in the video window (320×752) at 1.25×; shots are taken at 2× for crisp text.
const PANEL_VIEWPORT = {width: 400, height: 940};

const sse = (deltas, finish) =>
  [
    ...deltas.map((delta) => `data: ${JSON.stringify({choices: [{index: 0, delta}]})}\n\n`),
    `data: ${JSON.stringify({choices: [{index: 0, delta: {}, finish_reason: finish}], usage: {prompt_tokens: 1800, completion_tokens: 90}})}\n\n`,
    'data: [DONE]\n\n',
  ].join('');

const toolCall = (id, name, args) => ({tool_calls: [{index: 0, id, type: 'function', function: {name, arguments: JSON.stringify(args)}}]});

// The scripted model turn for a run, indexed by how many tool results the request already carries.
const scriptedTurn = (run, step) => {
  if (step === 0) return sse([{content: 'Let me look at the page first.'}, toolCall('call_1', 'get_page_structure', {})], 'tool_calls');
  if (step === 1) return sse([toolCall('call_2', 'grep', {query: 'header, nav, main', scope: 'children'})], 'tool_calls');
  if (step === 2) return sse([toolCall('call_3', 'apply_styles', {css: `/* ${run.key} */ body { scroll-behavior: smooth; }`, mode: 'save'})], 'tool_calls');
  return sse([{content: run.reply}], 'stop');
};

// The panel's icons are CSS masks fetched from api.iconify.design the first time each one is shown, so a screenshot
// can beat them. Render every icon class once off-screen and wait for the network before taking any shots.
async function warmIcons(panel) {
  await panel.evaluate(() => {
    const names = new Set();
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) for (const m of rule.selectorText?.match(/\.icon-[\w-]+/g) || []) names.add(m.slice(1));
    }
    const warm = document.createElement('div');
    warm.style.cssText = 'position:fixed;left:-9999px;top:0';
    warm.innerHTML = [...names].map((n) => `<span class="icon ${n}" style="display:inline-block;width:16px;height:16px"></span>`).join('');
    document.body.appendChild(warm);
  });
  await panel.waitForLoadState('networkidle', {timeout: 30000}).catch(() => console.warn('  icons may still be loading'));
}

async function main() {
  fs.mkdirSync(OUT, {recursive: true});
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-capture-'));
  const proxy = process.env.HTTPS_PROXY ? {server: process.env.HTTPS_PROXY} : undefined;
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
    locale: 'en-US',
    proxy,
    viewport: {width: 1440, height: 900},
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`, '--lang=en-US', '--headless=new'],
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker', {timeout: 20000});
    const extensionId = worker.url().split('/')[2];
    await worker.evaluate(async (apiBase) => {
      await chrome.storage.local.set({settings: {apiKey: 'sk-demo', apiBase, model: 'gpt-4o'}});
    }, API);

    // Serve the panel's icons from memory once fetched (with retries): later runs load heavy websites through the
    // same connection and fresh icon requests can fail, which would leave the panel without its icons.
    const icons = new Map();
    const iconUrls = new Set();
    for (const file of fs.readdirSync(path.join(EXTENSION, 'sidepanel')).filter((f) => f.endsWith('.css'))) {
      const css = fs.readFileSync(path.join(EXTENSION, 'sidepanel', file), 'utf8');
      for (const m of css.matchAll(/https:\/\/api\.iconify\.design\/[^"')]+/g)) iconUrls.add(m[0]);
    }
    for (const url of iconUrls) {
      for (let attempt = 0; !icons.has(url) && attempt < 6; attempt++) {
        const response = await context.request.get(url, {timeout: 15000}).catch(() => null);
        if (response?.ok()) icons.set(url, await response.body());
      }
    }
    console.log(`icons prefetched: ${icons.size}/${iconUrls.size}`);
    await context.route('https://api.iconify.design/**', async (route) => {
      const url = route.request().url();
      for (let attempt = 0; !icons.has(url) && attempt < 4; attempt++) {
        const response = await route.fetch({timeout: 15000}).catch(() => null);
        if (response?.ok()) icons.set(url, await response.body());
      }
      return icons.has(url) ? route.fulfill({status: 200, contentType: 'image/svg+xml', body: icons.get(url)}) : route.abort();
    });

    // Model mock. Each request waits for `release` so intermediate panel states can be photographed.
    let run = RUNS[0];
    let onRequest = null;
    await context.route(`${API}/**`, async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (!body.tools) return route.fulfill({status: 200, contentType: 'text/event-stream', body: sse([{content: run.prompt}], 'stop')});
      const step = (body.messages || []).filter((m) => m.role === 'tool').length;
      await new Promise((release) => (onRequest ? onRequest({step, release}) : release()));
      return route.fulfill({status: 200, contentType: 'text/event-stream', body: scriptedTurn(run, step)});
    });
    const nextRequest = () => new Promise((resolve) => (onRequest = (req) => ((onRequest = null), resolve(req))));

    const site = await context.newPage();
    for (let attempt = 1; ; attempt++) {
      const ok = await site.goto(RUNS[0].url, {waitUntil: 'domcontentloaded', timeout: 60000}).then(
        () => true,
        (e) => (console.warn(`  first load failed (attempt ${attempt}): ${e.name}`), false),
      );
      if (ok || attempt === 3) break;
    }
    const siteTabId = await worker.evaluate(async () => (await chrome.tabs.query({}))
      .find((t) => /^https?:/.test(t.url || '')).id);

    // The panel asks for "the active tab of this window"; point it at the website tab instead of itself.
    await context.addInitScript({
      content: `if (location.protocol === 'chrome-extension:' && globalThis.chrome?.tabs) {
        const query = chrome.tabs.query.bind(chrome.tabs);
        chrome.tabs.query = async (q = {}) => (q.active ? [await chrome.tabs.get(${siteTabId})] : query(q));
      }`,
    });
    const panel = await context.newPage();
    await panel.setViewportSize(PANEL_VIEWPORT);
    const shot = (name) => panel.screenshot({path: path.join(OUT, `${run.key}-${name}.png`)});
    const settle = (ms = 500) => panel.waitForTimeout(ms);

    for (run of RUNS) {
      console.log(`run ${run.key}`);
      if (site.url() !== run.url) await site.goto(run.url, {waitUntil: 'domcontentloaded', timeout: 60000}).catch((e) => console.warn('  page load:', e.message));
      await panel.goto(`chrome-extension://${extensionId}/sidepanel/index.html`);
      // The panel only enables input once the page's content script answers.
      const ready = await panel.waitForSelector('#message-input:not([disabled])', {timeout: 45000}).catch(() => null);
      if (!ready) {
        await shot('debug-not-ready');
        console.warn(`  skipped ${run.key}: input never enabled (see ${run.key}-debug-not-ready.png)`);
        continue;
      }
      await panel.click('#session-header');
      await panel.click('#new-session-btn');
      await warmIcons(panel);
      await settle(800);
      const gated = Boolean(run.capture);

      if (run.capture === 'full') {
        await shot('empty');
        for (let i = 1; i <= run.prompt.length; i++) {
          await panel.type('#message-input', run.prompt[i - 1]);
          await shot(`type-${String(i).padStart(2, '0')}`);
        }
      } else {
        await panel.fill('#message-input', run.prompt);
      }

      let request = gated ? nextRequest() : null;
      await panel.click('#send-btn');
      if (gated) {
        let req = await request;
        await settle();
        await shot('sent');
        for (let step = 1; step <= 3; step++) {
          request = nextRequest();
          req.release();
          req = await request;
          await settle(1500);
          await shot(`step${step}`);
        }
        req.release();
      }
      await panel.waitForSelector('#stop-btn.hidden', {state: 'attached', timeout: 30000});
      await settle(2500);
      await shot('done');
    }
  } finally {
    await context.close();
    fs.rmSync(userDataDir, {recursive: true, force: true});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
