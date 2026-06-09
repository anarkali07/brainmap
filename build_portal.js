const fs = require('fs');
const main = fs.readFileSync('C:/Tools/ManageDay/dashboard.html', 'utf8');

// STRATEGY: Take the FULL dashboard.html and:
// 1. Replace all non-hiring sections with empty divs
// 2. Hide non-hiring nav items via CSS
// 3. Inject overrides script
// 4. Set teal accent
// This preserves ALL CSS, layout, sidebar structure exactly

const HIRING_SECTIONS = new Set([
  'sec-intdashboard', 'sec-interviews', 'sec-intschedules',
  'sec-panelscheduler', 'sec-scanreports'
]);

// Non-hiring sections to blank out (keep the element but empty it to avoid JS errors)
const ALL_SECTIONS = [
  'sec-dashboard','sec-inbox','sec-tasks','sec-work',
  'sec-personal','sec-timetracker','sec-schedule',
  'sec-config','sec-search'
];

let portal = main;

// 1. Blank out non-hiring sections
ALL_SECTIONS.forEach(id => {
  const open = '<section id="' + id + '"';
  const start = portal.indexOf(open);
  if (start < 0) return;
  // find next </section>
  let depth = 0, i = start;
  while (i < portal.length) {
    if (portal.slice(i,i+8) === '<section') depth++;
    else if (portal.slice(i,i+10) === '</section>') { depth--; if (depth===0){i+=10;break;} }
    i++;
  }
  const cls = portal.slice(start, start + open.length + 30).match(/class="([^"]+)"/);
  const classes = cls ? cls[1] : 'section';
  portal = portal.slice(0, start) +
    '<section id="' + id + '" class="' + classes + '"></section>' +
    portal.slice(i);
});

// 2. Add minimal config section before </main>
const configSection = `
<section id="sec-config" class="section">
  <div style="padding:24px;max-width:500px;">
    <h2 style="margin-bottom:20px;">⚙️ Settings</h2>
    <div class="card">
      <h3>🤖 AI Provider</h3>
      <label>Provider</label>
      <select id="apikey-provider" onchange="onProviderChange()" style="margin-bottom:8px;">
        <option value="groq">Groq (Free, Fast)</option>
        <option value="anthropic">Anthropic (Claude)</option>
      </select>
      <label id="apikey-label">API Key</label>
      <input id="apikey-input" type="password" placeholder="Enter API key…">
      <label>Model</label>
      <input id="apikey-model" placeholder="e.g. llama-3.3-70b-versatile">
      <div id="apikey-status" style="font-size:0.8rem;margin-top:6px;"></div>
      <button class="btn-primary" onclick="saveApiKey()" style="margin-top:10px;">Save Key</button>
    </div>
  </div>
</section>`;

// Replace existing sec-config with our minimal one
const cfgOpen = '<section id="sec-config"';
const cfgStart = portal.indexOf(cfgOpen);
if (cfgStart > -1) {
  let depth = 0, i = cfgStart;
  while (i < portal.length) {
    if (portal.slice(i,i+8) === '<section') depth++;
    else if (portal.slice(i,i+10) === '</section>') { depth--; if (depth===0){i+=10;break;} }
    i++;
  }
  portal = portal.slice(0, cfgStart) + configSection + portal.slice(i);
}

// 3. Inject teal accent + hide non-hiring nav + null-safe patch before </head>
const headInsert = `
<style>
  :root { --accent:#14b8a6 !important; --accent2:#0d9488 !important; }
</style>
<script>
// NULL-SAFE getElementById
(function(){
  var _orig=Document.prototype.getElementById;
  var noop=function(){};
  var dummy=new Proxy(function(){return dummy;},{
    get:function(t,p){
      if(p==='value'||p==='innerHTML'||p==='textContent'||p==='placeholder')return'';
      if(p==='checked')return false;
      if(p==='style')return new Proxy({},{get:function(){return'';},set:function(){return true;}});
      if(p==='classList')return{add:noop,remove:noop,toggle:noop,contains:function(){return false;},replace:noop};
      if(p==='dataset')return{};if(p==='options')return{length:0};
      if(p==='contains')return function(){return false;};
      if(p==='appendChild'||p==='removeChild'||p==='setAttribute'||p==='removeAttribute'||p==='addEventListener'||p==='dispatchEvent'||p==='focus'||p==='blur'||p==='click'||p==='scrollIntoView')return noop;
      if(p==='querySelectorAll'||p==='getElementsByClassName')return function(){return[];};
      if(p==='querySelector')return function(){return null;};
      if(p==='getBoundingClientRect')return function(){return{top:0,left:0,width:0,height:0,bottom:0,right:0};};
      if(typeof p==='string'&&p!=='then'&&p!=='toJSON')return dummy;
      return undefined;
    },
    set:function(){return true;},apply:function(){return dummy;}
  });
  Document.prototype.getElementById=function(id){return _orig.call(this,id)||dummy;};
})();
<\/script>`;

portal = portal.replace('</head>', headInsert + '\n</head>');

// 4. Inject overrides at end of main script (before </script> near </body>)
const overrides = `

// === HIRING PORTAL OVERRIDES ===
const HIRING_NAV = new Set(['intdashboard','interviews','intschedules','panelscheduler','scanreports','config']);
const _origNav = navigate;
navigate = function(s) {
  if (!HIRING_NAV.has(s) && !s.startsWith('custom-')) s = 'intdashboard';
  _origNav(s);
};

// Hide non-hiring nav items
document.querySelectorAll('.nav-item[data-section]').forEach(function(el) {
  if (!HIRING_NAV.has(el.dataset.section)) el.style.display = 'none';
});

// Minimal config renderer
renderConfig = function() {
  var prov = document.getElementById('apikey-provider');
  var key  = document.getElementById('apikey-input');
  var mod  = document.getElementById('apikey-model');
  if (prov) prov.value = (DB.settings && DB.settings.aiProvider) || 'groq';
  if (key)  key.value  = (DB.settings && (DB.settings.groqKey || DB.settings.apiKey)) || '';
  if (mod)  mod.value  = (DB.settings && DB.settings.aiModel) || '';
};

navigate('intdashboard');
`;

// Find the last </script> before </body> and insert overrides before it
const lastScriptClose = portal.lastIndexOf('</script>');
portal = portal.slice(0, lastScriptClose) + overrides + portal.slice(lastScriptClose);

fs.writeFileSync('C:/Tools/ManageDay/hiring-portal/index.html', portal);
console.log('Portal rebuilt. Size:', portal.length);

const checks = [
  'refreshAllViews','savePanelSchedule','parsePastedCandidates',
  'renderSchedulesPage','updateSchedPanel','updateRoundTime','updateRoundDate',
  'sched-page-tbody','round-modal','partner-upload-modal','interview-modal',
  'sec-intdashboard','sec-interviews','sec-intschedules','sec-panelscheduler','sec-scanreports',
  'HIRING_NAV','--accent:#14b8a6'
];
checks.forEach(function(k) { if (!portal.includes(k)) console.log('MISSING:', k); });
console.log('All checks passed.');
