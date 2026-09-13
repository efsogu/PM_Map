'use strict';

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!['POST','GET'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }
  res.setHeader('Set-Cookie', 'pm_map_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.setHeader('Location', 'https://main-service-intelligence-portal-st.vercel.app/');
  return res.status(303).end();
};
