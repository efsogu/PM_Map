'use strict';

const { verifySession, parseCookies } = require('../../lib/sso');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }

  const secret = process.env.PORTAL_SSO_SECRET;
  if (!secret) return res.status(503).json({ ok:false, error:'sso_not_configured' });

  try {
    const cookies = parseCookies(req.headers.cookie);
    const session = verifySession(cookies.pm_map_session, secret);
    return res.status(200).json({ ok:true, role:session.role, sub:session.sub, exp:session.exp });
  } catch {
    return res.status(401).json({ ok:false, error:'session_required' });
  }
};
