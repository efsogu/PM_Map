import { next } from '@vercel/functions';

const PORTAL_URL = 'https://main-service-intelligence-portal-st.vercel.app/';
const COOKIE_NAME = '__Host-pm_map_session';

function getCookie(header, name) {
  const parts = String(header || '').split(';');
  for (const part of parts) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

function decodePayload(body) {
  const normalized = body.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function bytesToB64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function constantTimeTextEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function verifySession(token, secret) {
  try {
    const [body, signature, extra] = String(token || '').split('.');
    if (!body || !signature || extra || !secret) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name:'HMAC', hash:'SHA-256' },
      false,
      ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expected = bytesToB64url(new Uint8Array(signed));
    if (!constantTimeTextEqual(signature, expected)) return false;

    const payload = decodePayload(body);
    const now = Math.floor(Date.now() / 1000);
    if (payload?.aud !== 'pm-map-session') return false;
    if (!['admin', 'test'].includes(payload?.role)) return false;
    if (!payload?.sub || !Number.isFinite(payload?.iat) || !Number.isFinite(payload?.exp)) return false;
    if (payload.exp <= payload.iat || payload.iat > now + 30 || payload.exp <= now) return false;
    if (payload.exp - payload.iat > 8 * 60 * 60) return false;
    return true;
  } catch {
    return false;
  }
}

function portalRedirect() {
  return new Response(null, {
    status: 307,
    headers: {
      'Location': PORTAL_URL,
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/auth/')) return next();

  const secret = process.env.PORTAL_SSO_SECRET;
  if (!secret) return portalRedirect();

  const token = getCookie(request.headers.get('cookie'), COOKIE_NAME);
  if (!(await verifySession(token, secret))) return portalRedirect();

  return next({
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}

export const config = { matcher: '/:path*' };
