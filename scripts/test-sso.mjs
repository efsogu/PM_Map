import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { issueToken, verifyToken, issueSession, verifySession, parseCookies } = require('../lib/sso.js');

const secret = 'unit-test-secret';
const now = Math.floor(Date.now() / 1000);
const handoff = issueToken({
  sub: 'test-user',
  role: 'admin',
  aud: 'pm-map',
  iat: now,
  exp: now + 45,
  nonce: 'nonce-1'
}, secret);

assert.equal(verifyToken(handoff, secret, 'pm-map').role, 'admin');
assert.throws(() => verifyToken(handoff, secret, 'wrong-audience'), /bad_audience/);
assert.throws(() => verifyToken(`${handoff}x`, secret, 'pm-map'), /bad_signature|malformed/);

const session = issueSession(verifyToken(handoff, secret, 'pm-map'), secret);
const verifiedSession = verifySession(session, secret);
assert.equal(verifiedSession.sub, 'test-user');
assert.equal(verifiedSession.role, 'admin');
assert.equal(verifiedSession.aud, 'pm-map-session');

assert.deepEqual(
  parseCookies('a=1; __Host-pm_map_session=abc%2Edef'),
  { a:'1', '__Host-pm_map_session':'abc.def' }
);

console.log('PM SSO tests PASS');
