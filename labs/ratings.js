(() => {
  'use strict';
  const A = window.GuanchaoRatingsAPI, O = window.GuanchaoOAuth;
  if (!A) return;
  let api = null, configured = false, cloudConfig = null, selected = null, selection = 0, score = 0, busy = false;
  const sessionKey = 'gc-rating-session-v1';
  let nativeClient = location.protocol === 'file:';
  try { nativeClient = nativeClient || !!parent.guanchao || !!parent.Guanchao?.native || !!window.Capacitor?.isNativePlatform?.(); } catch (_) {}
  const module = () => location.hash === '#games' ? 'games' : 'travel';
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (text, cls) => { const node = el('button', text, cls); node.type = 'button'; return node; };

  const accountBar = el('div', null, 'rating-account-bar'); accountBar.hidden = true;
  const accountLabel = el('span'), accountButton = button('登录观潮', 'rating-account-button');
  accountBar.append(accountLabel, accountButton); document.body.prepend(accountBar);

  const dialog = el('dialog', null, 'rating-auth-dialog'), head = el('div', null, 'rating-dialog-head'), close = button('×');
  close.setAttribute('aria-label', '关闭登录'); close.onclick = () => dialog.close();
  head.append(el('h2', '观潮账号'), close);
  const github = button('使用 GitHub 登录', 'rating-github-login'); github.id = 'githubLogin';
  const intro = el('p', '使用 GitHub 登录，参与公开评分和城市照片分享。', 'rating-auth-intro');
  const nativeTip = el('p', null, 'rating-native-login-note'), website = el('a', '去官网登录并设置密码 ↗');
  website.href = 'https://giogight.github.io/#travel'; website.target = '_blank'; website.rel = 'noopener';
  nativeTip.append(document.createTextNode('第一次使用 App？先在官网用 GitHub 登录，设置 App 登录密码，再用同一邮箱和密码在这里登录。'), website);

  const emailDetails = el('details', null, 'rating-existing-account');
  emailDetails.append(el('summary', '已有邮箱密码账号登录'));
  const form = el('form'), email = el('input'), password = el('input');
  email.type = 'email'; email.autocomplete = 'email'; email.required = true; email.maxLength = 254;
  password.type = 'password'; password.autocomplete = 'current-password'; password.minLength = 8; password.maxLength = 128; password.required = true;
  const l1 = el('label', '邮箱'), l2 = el('label', '密码'); l1.append(email); l2.append(password);
  const actions = el('div', null, 'rating-auth-actions'), login = el('button', '登录已有账号'); login.type = 'submit'; actions.append(login);
  form.append(l1, l2, actions); emailDetails.append(form);

  const signedPanel = el('section', null, 'rating-signed-panel'), signedEmail = el('p', null, 'rating-signed-email');
  const logout = button('退出账号', 'rating-signout');
  const passwordPanel = el('details', null, 'rating-password-panel'); passwordPanel.append(el('summary', '设置 App 登录密码'));
  const passwordTip = el('p', '设置后，电脑和手机 App 都可以使用这里显示的同一邮箱与密码登录。', 'rating-hint');
  const passwordForm = el('form'), newPassword = el('input'), confirmPassword = el('input');
  for (const input of [newPassword, confirmPassword]) { input.type = 'password'; input.autocomplete = 'new-password'; input.minLength = 8; input.maxLength = 128; input.required = true; }
  const newLabel = el('label', 'App 登录密码（至少 8 位）'), confirmLabel = el('label', '再输入一次'); newLabel.append(newPassword); confirmLabel.append(confirmPassword);
  const passwordSubmit = el('button', '保存 App 登录密码', 'rating-password-save'); passwordSubmit.type = 'submit';
  passwordForm.append(newLabel, confirmLabel, passwordSubmit); passwordPanel.append(passwordTip, passwordForm); signedPanel.append(signedEmail, passwordPanel, logout);
  const authStatus = el('p', null, 'rating-status'); authStatus.id = 'cloudAuthStatus'; authStatus.setAttribute('role', 'status'); authStatus.setAttribute('aria-live', 'polite');
  dialog.append(head, intro, github, nativeTip, emailDetails, signedPanel, authStatus, el('p', '你的邮箱只在本人账号中显示。公开评分显示均值与人数。', 'rating-hint'));
  document.body.append(dialog);

  function githubIdentity() {
    const metadata = api?.session?.user?.app_metadata;
    return metadata?.provider === 'github' || (Array.isArray(metadata?.providers) && metadata.providers.includes('github'));
  }
  function webOAuthAvailable() { try { return !nativeClient && !!O && O.origin(location.href) === location.origin; } catch (_) { return false; } }
  function renderDialog() {
    const signed = !!api?.session;
    intro.hidden = signed || nativeClient; github.hidden = signed || nativeClient;
    github.disabled = busy || !configured || !webOAuthAvailable();
    nativeTip.hidden = signed || !nativeClient; website.href = 'https://giogight.github.io/#' + module();
    emailDetails.hidden = signed; if (nativeClient) emailDetails.open = true;
    signedPanel.hidden = !signed;
    signedEmail.textContent = signed ? api.session.user.email || '已登录观潮' : '';
    passwordPanel.hidden = !signed || nativeClient || !githubIdentity() || !api.session.user.email;
    login.disabled = logout.disabled = passwordSubmit.disabled = busy || !configured;
  }
  function renderAccount() {
    accountBar.hidden = !configured;
    accountLabel.textContent = api?.session ? '账号已登录' : '观潮账号';
    accountButton.textContent = api?.session ? '账号设置' : '登录观潮';
    renderDialog();
  }
  function openAccount() {
    if (!configured) return false;
    authStatus.textContent = ''; renderDialog(); if (!dialog.open) dialog.showModal(); return true;
  }
  accountButton.onclick = openAccount;
  let finishConfig; const configReadyPromise = new Promise(resolve => { finishConfig = resolve; });
  window.GuanchaoCloud = { get ready() { return configured; }, get api() { return api; }, configReadyPromise, requestLogin: openAccount };

  async function authenticate() {
    if (!api || busy || !form.reportValidity()) return;
    busy = true; renderDialog(); authStatus.textContent = '正在登录…';
    try {
      await api.signIn(email.value, password.value); password.value = ''; dialog.close(); renderAccount(); render(); await loadSelected();
    } catch (error) { authStatus.textContent = error.message; }
    finally { busy = false; renderDialog(); }
  }
  form.onsubmit = event => { event.preventDefault(); authenticate(); };
  github.onclick = async () => {
    if (busy || !api || !cloudConfig || !webOAuthAvailable()) return;
    busy = true; renderDialog(); authStatus.textContent = '正在前往 GitHub…';
    let store;
    try {
      const attempt = await O.createAttempt({ href: location.href, supabaseUrl: cloudConfig.supabaseUrl, module: module() });
      store = sessionStorage;
      O.saveAttempt(store, attempt.record);
      const target = api.signInOAuth({ provider: 'github', redirectTo: attempt.redirectTo, codeChallenge: attempt.challenge });
      const url = new URL(await target);
      if (url.origin !== attempt.record.project || url.pathname !== '/auth/v1/authorize' || url.searchParams.get('provider') !== 'github') throw Error('登录地址未通过核对，请重试');
      window.top.location.assign(url.href);
    } catch (error) { if (store) O.clearAttempt(store); authStatus.textContent = error.message; busy = false; renderDialog(); }
  };
  async function signOut() {
    if (!api || busy) return;
    busy = true; renderDialog(); authStatus.textContent = '正在退出…';
    try { await api.signOut(); score = 0; newPassword.value = confirmPassword.value = ''; if (O) O.clearAttempt(sessionStorage); renderAccount(); render(); authStatus.textContent = '已退出账号'; }
    catch (error) { authStatus.textContent = error.message; }
    finally { busy = false; renderDialog(); }
  }
  logout.onclick = signOut;
  passwordForm.onsubmit = async event => {
    event.preventDefault();
    if (!api || busy || nativeClient || !githubIdentity() || !passwordForm.reportValidity()) return;
    if (newPassword.value !== confirmPassword.value) { authStatus.textContent = '两次输入的密码不同，请检查'; confirmPassword.focus(); return; }
    busy = true; renderDialog(); authStatus.textContent = '正在设置 App 登录密码…';
    try {
      await api.updatePassword(newPassword.value); newPassword.value = confirmPassword.value = ''; passwordPanel.open = false;
      authStatus.textContent = 'App 登录密码已设置。在电脑或手机 App 使用 ' + api.session.user.email + ' 和刚才的密码登录。';
    } catch (error) { authStatus.textContent = error.message; }
    finally { busy = false; renderDialog(); }
  };
  function notify(row) { dispatchEvent(new CustomEvent('guanchao:place-rating-updated', { detail: row })); }
  function render() {
    const host = document.querySelector('#nearbyPlaceDetail .place-rating'); if (!host || !selected) return; host.replaceChildren();
    const toilet = selected.category === 'toilet', title = el('h4', toilet ? '干净程度' : '体验评分'), publicRow = el('p', '还没有公开评分', 'rating-public-score'); publicRow.id = 'ratingPublicScore'; host.append(title, publicRow);
    if (!configured) { host.append(el('p', '公开评分尚未开通，接通账号服务后即可参与。', 'rating-hint')); return; }
    const auth = button(api?.session ? '退出账号' : '登录后评分', 'rating-auth-link'); auth.onclick = () => api.session ? signOut() : openAccount(); host.append(auth);
    const stars = el('div', null, 'rating-stars'); stars.setAttribute('role', 'group'); stars.setAttribute('aria-label', toilet ? '厕所干净程度，1至5分' : '地点评分，1至5分');
    for (let value = 1; value <= 5; value++) { const b = button('★'); b.setAttribute('aria-label', value + ' 分'); b.setAttribute('aria-pressed', String(value === score)); b.dataset.filled = String(value <= score); b.disabled = !api.session; b.onclick = () => { score = value; render(); loadSelected(false); }; stars.append(b); }
    const submit = button('保存我的评分', 'rating-save'); submit.disabled = !api.session || !score || busy;
    const status = el('p', null, 'rating-status'); status.id = 'ratingStatus'; status.setAttribute('role', 'status');
    submit.onclick = async () => {
      if (busy || !selected) return; const p = selected, rev = selection; busy = true; submit.disabled = true; status.textContent = '正在保存…';
      try { await api.rate(p, score); if (rev === selection) { status.textContent = '评分已保存，再次评分会修改你的原评分。'; await loadSelected(false); } }
      catch (error) { if (rev === selection) status.textContent = error.message; }
      finally { busy = false; if (rev === selection) submit.disabled = !score; }
    };
    host.append(stars, submit, status, el('p', toilet ? '根据你最近使用时的情况评分，卫生状况会变化。' : '根据你的实际体验评分，每个账号对同一地点计一票。', 'rating-hint'));
  }
  async function loadSelected(own = true) {
    if (!api || !selected) return; const p = selected, rev = selection;
    try {
      const rows = await api.stats([p.id]); if (rev !== selection) return;
      const metric = p.category === 'toilet' ? 'cleanliness' : 'overall', row = rows.find(row => row.metric === metric);
      if (row) { const label = document.getElementById('ratingPublicScore'); if (label) label.textContent = (metric === 'cleanliness' ? '干净程度 ' : '体验 ') + row.average.toFixed(1) + ' / 5 · ' + row.count + ' 人评分'; notify(row); }
      if (own && api.session) { const mine = await api.own(p.id); if (rev !== selection) return; score = mine?.metric === metric ? Number(mine.score) : 0; render(); await loadSelected(false); }
    } catch (error) { if (rev === selection) { const status = document.getElementById('ratingStatus'); if (status) status.textContent = error.message; } }
  }
  addEventListener('guanchao:place-selected', event => { try { selected = A.place(event.detail); selection++; score = 0; render(); loadSelected(); } catch (_) {} });
  addEventListener('guanchao:places-loaded', async event => { if (!api) return; try { const ids = (event.detail?.places || []).slice(0, 200).map(p => A.place(p).id); for (const row of await api.stats(ids)) notify(row); } catch (_) {} });
  addEventListener('message', event => { if (event.source !== parent || (event.origin !== location.origin && !(location.protocol === 'file:' && event.origin === 'null'))) return; if (event.data?.type === 'guanchao:pause' && dialog.open) dialog.close(); });
  addEventListener('storage', async event => {
    if (!api || event.key !== sessionKey || event.storageArea !== sessionStorage) return;
    let saved = null;
    try { if (event.newValue && event.newValue.length < 20000) saved = JSON.parse(event.newValue); } catch (_) {}
    await api.restore(saved); score = 0; renderAccount(); render(); loadSelected();
  });
  async function init() {
    const remote = 'https://giogight.github.io/ratings-config.json';
    const paths = nativeClient ? [remote, new URL('../ratings-config.json', location.href).href] : [new URL('../ratings-config.json', location.href).href];
    for (const path of paths) {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(path, { signal: controller.signal, cache: 'no-cache' }); if (!response.ok) continue;
        const cfg = await response.json();
        if (!A.config(cfg)) {
          if (nativeClient && path === remote && cfg?.configurationVersion !== 1) continue;
          configured = false; break;
        }
        cloudConfig = cfg;
        api = A.create(cfg, { onSession: value => { dispatchEvent(new CustomEvent('guanchao:cloud-auth', { detail: { signedIn: !!value } })); try { value ? sessionStorage.setItem(sessionKey, JSON.stringify(value)) : sessionStorage.removeItem(sessionKey); } catch (_) {} renderAccount(); } });
        configured = true;
        let saved = null; try { const raw = sessionStorage.getItem(sessionKey); if (raw?.length < 20000) saved = JSON.parse(raw); } catch (_) {}
        if (saved) await api.restore(saved); break;
      } catch (_) {} finally { clearTimeout(timer); }
    }
    finishConfig(configured); dispatchEvent(new CustomEvent('guanchao:cloud-auth', { detail: { signedIn: !!api?.session } })); renderAccount(); render(); loadSelected();
  }
  init();
})();
