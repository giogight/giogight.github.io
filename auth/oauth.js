(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GuanchaoOAuth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PRODUCTION = 'https://giogight.github.io';
  const CALLBACK = '/auth/callback.html';
  const ATTEMPT_KEY = 'gc-oauth-attempt-v1';
  const SESSION_KEY = 'gc-rating-session-v1';
  const TTL = 5 * 60 * 1000;
  const paths = Object.freeze({ games: '/#games', travel: '/#travel' });
  const safeReturn = value => Object.values(paths).includes(value) ? value : paths.travel;
  const fail = message => { throw Error(message); };
  function origin(value) {
    const url = new URL(value);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) fail('请在观潮官网登录');
    if (url.origin !== PRODUCTION && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) fail('请在观潮官网登录');
    return url.origin;
  }
  function project(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) fail('在线账号配置无效');
    return url.origin;
  }
  function base64url(bytes) {
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function createAttempt({ href, supabaseUrl, module = 'travel', cryptoImpl = crypto, now = Date.now() }) {
    if (!Object.hasOwn(paths, module)) fail('请从游戏或旅行模块登录');
    if (!cryptoImpl?.subtle || typeof cryptoImpl.getRandomValues !== 'function') fail('当前浏览器无法安全登录，请更新浏览器后重试');
    const currentOrigin = origin(href), verifier = base64url(cryptoImpl.getRandomValues(new Uint8Array(32)));
    const state = base64url(cryptoImpl.getRandomValues(new Uint8Array(24)));
    const challenge = base64url(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    const record = { v: 1, state, verifier, returnPath: paths[module], createdAt: now, origin: currentOrigin, project: project(supabaseUrl) };
    const redirect = new URL(CALLBACK, currentOrigin); redirect.searchParams.set('gc_state', state);
    return { record, challenge, redirectTo: redirect.href };
  }
  function saveAttempt(storage, record) {
    try { storage.setItem(ATTEMPT_KEY, JSON.stringify(record)); }
    catch (_) { fail('当前浏览器无法保留登录步骤，请允许网站存储后重试'); }
  }
  function clearAttempt(storage) { try { storage.removeItem(ATTEMPT_KEY); } catch (_) {} }
  function consumeAttempt(storage, href, now = Date.now()) {
    let saved = null, returnPath = paths.travel;
    try {
      const raw = storage.getItem(ATTEMPT_KEY);
      clearAttempt(storage);
      if (!raw || raw.length > 4096) fail('登录步骤已失效，请从官网重新登录');
      saved = JSON.parse(raw);
      returnPath = safeReturn(saved?.returnPath);
      if (!saved || Object.getPrototypeOf(saved) !== Object.prototype || saved.v !== 1 ||
          !Object.values(paths).includes(saved.returnPath) || !/^[A-Za-z0-9_-]{32}$/.test(saved.state) ||
          !/^[A-Za-z0-9_-]{43}$/.test(saved.verifier) || !Number.isSafeInteger(saved.createdAt) ||
          saved.createdAt > now || now - saved.createdAt > TTL) fail('登录步骤已失效，请重新登录');
      const url = new URL(href);
      if (url.origin !== origin(saved.origin) || url.pathname !== CALLBACK || url.hash || url.username || url.password ||
          url.searchParams.getAll('gc_state').length !== 1 || url.searchParams.get('gc_state') !== saved.state) fail('登录返回未通过核对，请重新登录');
      project(saved.project);
      if (url.searchParams.has('error')) fail('GitHub 登录未完成，请重新登录');
      const code = url.searchParams.get('code');
      if (url.searchParams.getAll('code').length !== 1 || typeof code !== 'string' || !code || code.length > 2000 || /[\s\u0000-\u001f\u007f]/.test(code)) fail('登录返回缺少有效确认，请重新登录');
      return { ...saved, code };
    } catch (error) {
      clearAttempt(storage);
      const safe = Error(error instanceof SyntaxError ? '登录步骤已失效，请重新登录' : error.message || '登录未完成，请重试');
      safe.returnPath = returnPath; throw safe;
    }
  }
  function persistSession(storage, session) {
    if (!session?.access_token || !session.refresh_token || typeof session.user?.id !== 'string') fail('登录尚未确认，请重试');
    try { storage.setItem(SESSION_KEY, JSON.stringify(session)); }
    catch (_) { fail('当前浏览器无法保存登录状态，请允许网站存储后重试'); }
  }
  return Object.freeze({ PRODUCTION, CALLBACK, ATTEMPT_KEY, SESSION_KEY, TTL, paths, origin, project, safeReturn, createAttempt, saveAttempt, clearAttempt, consumeAttempt, persistSession });
});
