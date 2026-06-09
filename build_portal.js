const fs = require('fs');
const main = fs.readFileSync('C:/Tools/ManageDay/dashboard.html', 'utf8');

// 1. CSS
const cssStart = main.indexOf('<style>');
const cssEnd   = main.indexOf('</style>') + 8;
const css      = main.slice(cssStart, cssEnd);

// 2. Main script (largest)
let mainScript = '';
const scriptRe = /<script>([\s\S]+?)<\/script>/g;
let m;
while ((m = scriptRe.exec(main)) !== null) {
  if (m[1].length > mainScript.length) mainScript = m[1];
}
console.log('Script:', mainScript.length, 'chars');

// 3. Hiring sections — start at the actual <section> tags, not the comment
const secStart = main.indexOf('<section id="sec-intdashboard"');
const secEnd   = main.indexOf('<section id="sec-schedule"');  // day schedule — exclude
const sections = main.slice(secStart, secEnd).trim();
console.log('Sections:', sections.length, 'chars | has intdashboard:', sections.includes('sec-intdashboard'));

// 4. Modals
const modalPairs = [
  ['<!-- Follow-Up Modal',       '<!-- Project Modal'],
  ['<!-- Project Modal',         '<!-- Interview Modal'],
  ['<!-- Interview Modal',       '<!-- Image Paste Resume Modal'],
  ['<!-- Image Paste Resume Modal','<!-- ── CSV Export Modal'],
  ['<!-- ── CSV Export Modal',   '<!-- ── Interview Questions Modal'],
  ['<!-- ── Interview Questions Modal','<!-- ── Schedules Modal'],
  ['<!-- ── Schedules Modal',    '<!-- ── Bulk Scanner Modal'],
  ['<!-- ── Bulk Scanner Modal', '<!-- ── Profile Scanner Modal'],
  ['<!-- ── Profile Scanner Modal','<!-- ── Sticky Note Widget'],
  ['<!-- ── Sticky Note Widget', '<!-- Upload Results Summary Modal'],
  ['<!-- Upload Results Summary Modal','<!-- Partner Name Modal'],
  ['<!-- Partner Name Modal',    '<!-- Round Modal'],
  ['<!-- Round Modal',           '<!-- API Key Settings Modal'],
  ['<!-- API Key Settings Modal','<!-- Team Modal'],
];
const modals = modalPairs.map(([s,e]) => {
  const si = main.indexOf(s), ei = main.indexOf(e);
  if (si < 0 || ei < 0) { console.log('Missing modal:', s); return ''; }
  return main.slice(si, ei).trim();
}).filter(Boolean).join('\n\n');
console.log('Modals:', modals.length, 'chars');

// 5. Null-safe proxy patch
const nullPatch = [
  '(function(){',
  '  const _orig=Document.prototype.getElementById;',
  '  const noop=function(){};',
  '  const dummy=new Proxy(function(){return dummy;},{',
  '    get:function(t,p){',
  "      if(['value','innerHTML','textContent','placeholder'].includes(p))return '';",
  "      if(p==='checked')return false;",
  "      if(p==='style')return new Proxy({},{get:function(){return'';},set:function(){return true;}});",
  "      if(p==='classList')return{add:noop,remove:noop,toggle:noop,contains:function(){return false;},replace:noop};",
  "      if(p==='dataset')return{};",
  "      if(p==='options')return{length:0};",
  "      if(p==='contains')return function(){return false;};",
  "      if(['appendChild','removeChild','setAttribute','removeAttribute','addEventListener','dispatchEvent','focus','blur','click','scrollIntoView'].includes(p))return noop;",
  "      if(p==='querySelectorAll'||p==='getElementsByClassName')return function(){return[];};",
  "      if(p==='querySelector')return function(){return null;};",
  "      if(p==='getBoundingClientRect')return function(){return{top:0,left:0,width:0,height:0,bottom:0,right:0};};",
  "      if(typeof p==='string'&&p!=='then'&&p!=='toJSON')return dummy;",
  '      return undefined;',
  '    },',
  '    set:function(){return true;},',
  '    apply:function(){return dummy;}',
  '  });',
  '  Document.prototype.getElementById=function(id){return _orig.call(this,id)||dummy;};',
  '})();',
].join('\n');

// 6. Config section (minimal)
const configSection = [
  '<section id="sec-config" class="section">',
  '  <h2>⚙️ Settings</h2>',
  '  <div class="card" style="max-width:480px;">',
  '    <h3>🤖 AI Provider</h3>',
  '    <label>Provider</label>',
  '    <select id="apikey-provider" onchange="onProviderChange()" style="margin-bottom:8px;">',
  '      <option value="groq">Groq (Free, Fast)</option>',
  '      <option value="anthropic">Anthropic (Claude)</option>',
  '    </select>',
  '    <label id="apikey-label">Groq API Key</label>',
  '    <input id="apikey-input" type="password" placeholder="Enter API key…">',
  '    <label>Model</label>',
  '    <input id="apikey-model" placeholder="e.g. llama-3.3-70b-versatile">',
  '    <div id="apikey-status" style="font-size:0.8rem;margin-top:6px;"></div>',
  '    <button class="btn-primary" onclick="saveApiKey()" style="margin-top:10px;">Save Key</button>',
  '  </div>',
  '</section>',
].join('\n');

// 7. Overrides script
const overrides = [
  '// === HIRING PORTAL OVERRIDES ===',
  "const HIRING_NAV = new Set(['intdashboard','interviews','intschedules','panelscheduler','scanreports','config']);",
  'const _origNav = navigate;',
  'navigate = function(s) {',
  "  if (!HIRING_NAV.has(s) && !s.startsWith('custom-')) s = 'intdashboard';",
  '  _origNav(s);',
  '};',
  '',
  'renderConfig = function() {',
  "  var prov = document.getElementById('apikey-provider');",
  "  var key  = document.getElementById('apikey-input');",
  "  var mod  = document.getElementById('apikey-model');",
  "  if (prov) prov.value = (DB.settings && DB.settings.aiProvider) || 'groq';",
  "  if (key)  key.value  = (DB.settings && (DB.settings.groqKey || DB.settings.apiKey)) || '';",
  "  if (mod)  mod.value  = (DB.settings && DB.settings.aiModel) || '';",
  '};',
  '',
  "navigate('intdashboard');",
  "if (typeof lucide !== 'undefined') lucide.createIcons();",
].join('\n');

// 8. Assemble
const parts = [
  '<!DOCTYPE html>',
  '<html lang="en" data-theme="dark">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width,initial-scale=1">',
  '  <title>BrainMap \xB7 Hiring Portal</title>',
  '  <link rel="preconnect" href="https://fonts.googleapis.com">',
  '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
  '  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"><\/script>',
  '  ' + css,
  '  <style>:root{--accent:#14b8a6;--accent2:#0d9488;}.section{display:none;}.section.active{display:block;}<\/style>',
  '</head>',
  '<body>',
  '<script>' + nullPatch + '<\/script>',
  '',
  '<div class="app-layout">',
  '  <nav id="sidebar" class="sidebar">',
  '    <div class="sidebar-header">',
  '      <span class="app-logo">🧠</span>',
  '      <span class="app-name">BrainMap</span>',
  '      <button class="sidebar-close" onclick="document.getElementById(\'sidebar\').classList.remove(\'open\')">✕</button>',
  '    </div>',
  '    <div class="nav-items">',
  '      <div class="nav-item active" data-section="intdashboard" onclick="navigate(\'intdashboard\')">📊 Dashboard</div>',
  '      <div class="nav-item" data-section="interviews" onclick="navigate(\'interviews\')">👥 Interviews</div>',
  '      <div class="nav-item" data-section="intschedules" onclick="navigate(\'intschedules\')">📅 Schedules</div>',
  '      <div class="nav-item" data-section="panelscheduler" onclick="navigate(\'panelscheduler\')">🗓️ Panel Scheduler</div>',
  '      <div class="nav-item" data-section="scanreports" onclick="navigate(\'scanreports\')">🔍 Scan Reports</div>',
  '      <div class="nav-item" data-section="config" onclick="navigate(\'config\')">⚙️ Settings</div>',
  '    </div>',
  '  </nav>',
  '  <div class="main-content">',
  '    <header class="header">',
  '      <button class="sidebar-toggle" onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')">☰</button>',
  '      <span id="header-title" style="font-weight:700;font-size:1rem;">Hiring Portal</span>',
  '      <div style="display:flex;gap:8px;align-items:center;margin-left:auto;">',
  '        <button onclick="openModal(\'apikey-modal\')" class="btn-secondary btn-sm" title="AI Key">🔓 API Key</button>',
  '        <button onclick="toggleTheme()" class="btn-secondary btn-sm" title="Toggle theme">☺</button>',
  '      </div>',
  '    </header>',
  '    <main class="content">',
  '',
  sections,
  '',
  configSection,
  '',
  '    </main>',
  '  </div>',
  '</div>',
  '',
  modals,
  '',
  '<script>',
  mainScript,
  '',
  overrides,
  '<\/script>',
  '</body>',
  '</html>',
];

const portal = parts.join('\n');
fs.writeFileSync('C:/Tools/ManageDay/hiring-portal/index.html', portal);
console.log('\nPortal rebuilt! Size:', portal.length, 'chars');

const checks = ['refreshAllViews','savePanelSchedule','parsePastedCandidates',
  'renderSchedulesPage','updateSchedPanel','updateRoundTime','updateRoundDate',
  'sched-page-tbody','round-modal','partner-upload-modal','interview-modal',
  'sec-intdashboard','sec-interviews','sec-intschedules','sec-panelscheduler','sec-scanreports'];
checks.forEach(k => { if (!portal.includes(k)) console.log('MISSING:', k); });
console.log('Verification done.');
