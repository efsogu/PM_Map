import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('index.html');
const outputDirs = [path.resolve('dist'), path.resolve('public')];
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

// The Vercel project historically used `public` as its Output Directory while
// the preview branch declares `dist` in vercel.json. Emit the same hardened
// artifact to both locations so the preview remains fail-safe regardless of
// which setting has precedence. This change is preview-branch only.
for (const outDir of outputDirs) {
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Built ${outPath}; legacy client credential gate removed.`);
}
