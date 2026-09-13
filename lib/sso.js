'use strict';

const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signBody(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function issueToken(payload, secret) {
  if (!secret) throw new Error('sso_secret_missing');
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signBody(body, secret)}`;
}

function verifyToken(token, secret, expectedAudience) {
  if (!secret) throw new Error('sso_secret_missing');
  const [body, signature, extra] = String(token || '').split('.');
  if (!body || !signature || extra) throw new Error('malformed_token');
  const expected = signBody(body, secret);
  if (!timingSafeEqualText(signature, expected)) throw new Error('bad_signature');

  let payload;
  try {
    payload = JSON.parse(fromB64url(body));
  } catch {
    throw new Error('bad_payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) throw new Error('bad_timestamps');
  if (payload.exp <= payload.iat) throw new Error('bad_timestamps');
  if (payload.iat > now + 30) throw new Error('issued_in_future');
  if (payload.exp <= now) throw new Error('expired_token');
  if (payload.exp - payload.iat > 90) throw new Error('handoff_ttl_too_long');
  if (expectedAudience && payload.aud !== expectedAudience) throw new Error('bad_audience');
  if (!['admin', 'test'].includes(payload.role)) throw new Error('bad_role');
  if (!payload.sub || !payload.nonce) throw new Error('missing_subject_or_nonce');
  return payload;
}

function issueSession(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  return issueToken({
    sub: payload.sub,
    role: payload.role,
    aud: 'pm-map-session',
    iat: now,
    exp: now + (8 * 60 * 60),
    nonce: crypto.randomBytes(18).toString('base64url')
  }, secret);
}

function verifySession(token, secret) {
  if (!secret) throw new Error('sso_secret_missing');
  const [body, signature, extra] = String(token || '').split('.');
  if (!body || !signature || extra) throw new Error('malformed_token');
  const expected = signBody(body, secret);
  if (!timingSafeEqualText(signature, expected)) throw new Error('bad_signature');
  let payload;
  try { payload = JSON.parse(fromB64url(body)); } catch { throw new Error('bad_payload'); }
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== 'pm-map-session') throw new Error('bad_audience');
  if (!['admin', 'test'].includes(payload.role)) throw new Error('bad_role');
  if (!payload.sub || !Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) throw new Error('invalid_session');
  if (payload.exp <= payload.iat || payload.iat > now + 30 || payload.exp <= now) throw new Error('expired_or_invalid_session');
  if (payload.exp - payload.iat > (8 * 60 * 60)) throw new Error('session_ttl_too_long');
  return payload;
}

function parseCookies(header) {
  return Object.fromEntries(String(header || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

module.exports = { issueToken, verifyToken, issueSession, verifySession, parseCookies };
