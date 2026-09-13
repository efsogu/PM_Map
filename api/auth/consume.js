'use strict';

const { verifyToken, issueSession } = require('../../lib/sso');

function readHandoff(req) {
  if (req.body && typeof req.body === 'object') return req.body.handoff || '';
  const raw = typeof req.body === 'string' ? req.body : '';
  return new URLSearchParams(raw).get('handoff') || '';
}

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }

  const secret = process.env.PORTAL_SSO_SECRET;
  if (!secret) return res.status(503).json({ ok:false, error:'sso_not_configured' });

  try {
    const handoff = verifyToken(readHandoff(req), secret, 'pm-map');
    const session = issueSession(handoff, secret);
    res.setHeader('Set-Cookie', `pm_map_session=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    res.setHeader('Location', '/');
    return res.status(303).end();
  } catch {
    return res.status(401).json({ ok:false, error:'invalid_handoff' });
  }
};
