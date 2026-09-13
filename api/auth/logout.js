'use strict';

const COOKIE_NAME = '__Host-pm_map_session';
const PORTAL_URL = 'https://main-service-intelligence-portal-st.vercel.app/';

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  res.setHeader('Location', PORTAL_URL);
  return res.status(303).end();
};
