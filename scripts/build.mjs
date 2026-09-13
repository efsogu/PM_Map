import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('index.html');
const outDir = path.resolve('dist');
const outPath = path.join(outDir, 'index.html');
const portalUrl = 'https://main-service-intelligence-portal-st.vercel.app/';

let html = fs.readFileSync(sourcePath, 'utf8');

// Remove the legacy browser-only credential gate from the deployed artifact.
const loginStart = html.indexOf('  function handleLogin(){');
if (loginStart < 0) throw new Error('handleLogin start marker not found');
const nextFunction = html.indexOf('\n  function ', loginStart + 20);
if (nextFunction < 0) throw new Error('handleLogin end marker not found');
html = html.slice(0, loginStart) +
`  function handleLogin(){
    window.location.assign('${portalUrl}');
  }
` + html.slice(nextFunction + 1);

// Replace the final guest initialization with a server-session bootstrap.
const initMarker = "  applyAuthRole('guest');";
const initPos = html.lastIndexOf(initMarker);
if (initPos < 0) throw new Error('final guest initialization marker not found');
const bootstrap = `  applyAuthRole('guest');
  fetch('/api/auth/session', { credentials:'same-origin', cache:'no-store' })
    .then(async response => {
      if(!response.ok) throw new Error('portal_session_required');
      const payload = await response.json();
      if(!payload?.ok || !payload?.role) throw new Error('invalid_session_payload');
      applyAuthRole(payload.role);
      if(E.loginError) E.loginError.textContent = '';
    })
    .catch(() => {
      window.location.replace('${portalUrl}');
    });`;
html = html.slice(0, initPos) + bootstrap + html.slice(initPos + initMarker.length);

// Defensive assertion: deployed artifact must not contain the legacy credential comparisons.
if (html.includes("user === 'admin' && pass === 'admin'") || html.includes("user === 'test' && pass === 'test'")) {
  throw new Error('legacy client credentials still present after build transform');
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Built ${outPath}; legacy client credential gate removed.`);
