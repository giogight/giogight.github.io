(() => {
  'use strict';
  const O = window.GuanchaoOAuth, A = window.GuanchaoRatingsAPI;
  const title = document.getElementById('authTitle'), status = document.getElementById('authStatus'), back = document.getElementById('authReturn');
  const href = location.href;
  history.replaceState(null, '', O?.CALLBACK || '/auth/callback.html');
  let returnPath = '/#travel';
  const updateBack = () => { back.href = returnPath; back.textContent = returnPath === '/#games' ? '返回玩了么' : '返回逛了么'; };
  async function run() {
    let attempt, store;
    try {
      if (!O || !A) throw Error('登录页面加载未完成，请回官网重试');
      store = sessionStorage;
      attempt = O.consumeAttempt(store, href); returnPath = attempt.returnPath; updateBack();
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 7000);
      let cfg;
      try {
        const response = await fetch('/ratings-config.json', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw Error('在线账号配置暂时无法读取，请重新登录');
        const text = await response.text(); if (text.length > 16384) throw Error('在线账号配置无效'); cfg = JSON.parse(text);
      } finally { clearTimeout(timer); }
      const checked = A.config(cfg);
      if (!checked || checked.url !== attempt.project) throw Error('在线账号配置已变化，请重新登录');
      const api = A.create(cfg, { onSession: value => { if (value) O.persistSession(store, value); } });
      const session = await api.exchangeCode(attempt.code, attempt.verifier);
      O.persistSession(store, session);
      title.textContent = '登录成功';
      status.textContent = '正在返回观潮。需要在 App 登录时，可以在账号里设置登录密码。';
      document.documentElement.dataset.auth = 'success';
      setTimeout(() => location.replace(returnPath), 300);
    } catch (error) {
      if (O && store) O.clearAttempt(store);
      returnPath = O ? O.safeReturn(error.returnPath || returnPath) : '/#travel'; updateBack();
      title.textContent = '这次登录没有完成';
      const known = typeof error.message === 'string' && error.message.length < 180 && !/access_token|refresh_token|code_verifier|https?:\/\//i.test(error.message);
      status.textContent = error.name === 'AbortError' || error instanceof TypeError ? '连接暂时中断，请回到观潮重新登录。' : known ? error.message : '请回到观潮重新登录。';
      document.documentElement.dataset.auth = 'error';
    }
  }
  run();
})();
