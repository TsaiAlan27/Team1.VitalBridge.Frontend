// Vue 3 (CDN) 控制 Header Auth 區域與 Modals
// 依賴 window.Vue 與 /assets/js/auth.js 暴露的 API

(function () {
  // 啟用 Vue 模式旗標，讓 auth.js 不進行 DOM 綁定
  try { window.__VB_AUTH_VUE_ACTIVE = true; } catch { }

  if (!window.Vue) { console.error('Vue 3 未載入，auth-vue.js 跳過初始化'); return; }

  const { createApp, ref, reactive, onMounted } = Vue;

  // 等待 auth.js 就緒（避免 window.auth 尚未掛載導致競態）
  function waitAuthReady(timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (window.auth) return resolve(window.auth);
      let done = false;
      function finish() { if (done) return; done = true; resolve(window.auth || {}); }
      const timer = setTimeout(() => finish(), timeoutMs);
      try { window.addEventListener('vb:auth-ready', () => { clearTimeout(timer); finish(); }, { once: true }); } catch { }
      // 輪詢保險
      let tries = 0; const iv = setInterval(() => { if (window.auth || tries++ > 30) { clearInterval(iv); finish(); } }, 50);
    });
  }

  function openModal(id) {
    try {
      const el = document.getElementById(id); if (!el || !window.bootstrap || !bootstrap.Modal) return;
      const m = new bootstrap.Modal(el); m.show();
    } catch { }
  }
  function closeModal(id) {
    try { const inst = bootstrap.Modal.getInstance(document.getElementById(id)); inst?.hide(); } catch { }
  }

  // DOM fallback: 保證欄位下方能顯示錯誤（即使 Vue 綁定未生效）
  function ensureInvalidDisplay(inputId, message) {
    try {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.classList.add('is-invalid');
      let fb = input.nextElementSibling;
      const needCreate = !(fb && fb.classList && fb.classList.contains('invalid-feedback'));
      if (needCreate) {
        fb = document.createElement('div');
        fb.className = 'invalid-feedback';
        input.parentNode && input.parentNode.insertBefore(fb, input.nextSibling);
      }
      fb.textContent = message || '';
      // 清理：輸入時移除錯誤
      input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
        if (fb && fb.classList && fb.classList.contains('invalid-feedback')) fb.textContent = '';
      }, { once: true });
    } catch { }
  }

  // 共享狀態/方法：讓註冊 Modal 也能用 Vue 綁定
  let api = null; // 由主 app mounted 後設置
  const regForm = reactive({ name: '', email: '', password: '', alert: { type: '', msg: '' } });
  const regErrors = reactive({ name: '', email: '', password: '' });
  const regSubmitting = ref(false);

  // 登入欄位錯誤與提交狀態（提供 loginModal 綁定）
  const loginErrors = reactive({ email: '', password: '' });
  const loginSubmitting = ref(false);

  async function doRegister() {
    if (regSubmitting.value) return; // 防止重複點擊
    // 清空提示
    regForm.alert = { type: '', msg: '' };
    regErrors.name = regErrors.email = regErrors.password = '';

    // 前端一次性檢查所有欄位
    const name = (regForm.name || '').trim();
    const email = (regForm.email || '').trim();
    const pwd = regForm.password || '';
    if (!name) regErrors.name = '請輸入姓名';
    if (!email) regErrors.email = '請輸入 Email';
    else if (!/^\S+@\S+\.\S+$/.test(email)) regErrors.email = 'Email 格式不正確';
    if (!pwd) regErrors.password = '請輸入密碼';
    else if (pwd.length < 6) regErrors.password = '密碼至少需 6 個字元';
    if (regErrors.name || regErrors.email || regErrors.password) return; // 有錯誤就不送 API

    try {
      if (!api || !api.register) throw new Error('系統初始化中，請稍後再試');
      regSubmitting.value = true;
      await api.register({ name, email, password: pwd });
      closeModal('registerModal');
      // 成功後顯示成功窗
      try { const span = document.getElementById('regSuccessEmail'); if (span) span.textContent = email; } catch { }
      openModal('registerSuccessModal');
    } catch (e) {
      // 解析後端錯誤並分配到欄位
      const status = e?.status;
      const body = (e?.body || '').toString();
      const data = e?.data || null;
      let mapped = false;
      // ModelState 格式
      const errors = data?.errors || data?.Errors || null;
      if (errors && typeof errors === 'object') {
        const takeFirst = (v) => Array.isArray(v) && v.length ? (v[0] || '') : '';
        const n = takeFirst(errors.Name || errors.name || errors["name"]);
        const m = takeFirst(errors.Email || errors.email || errors["email"]);
        const p = takeFirst(errors.Password || errors.password || errors["password"]);
        if (n) { regErrors.name = n; mapped = true; }
        if (m) { regErrors.email = m; mapped = true; }
        if (p) { regErrors.password = p; mapped = true; }
      }
      // ASP.NET Identity 陣列 errors
      const errArr = Array.isArray(data?.errors) ? data.errors : (Array.isArray(data?.Errors) ? data.Errors : null);
      if (!mapped && errArr && errArr.length) {
        const desc = errArr.map(x => x?.description || x?.Description || '').filter(Boolean).join('\n');
        if (/(Duplicate|已存在|已被使用|已被註冊|已註冊|already\s*exists|already\s*taken|in\s*use)/i.test(desc) || /(Email|信箱)/i.test(desc)) { regErrors.email = '此 Email 已被使用'; mapped = true; }
        if (/(least\s*6|密碼至少\s*6|password.*6)/i.test(desc)) { regErrors.password = '密碼至少需 6 個字元'; mapped = true; }
        if (!mapped && desc) { regForm.alert = { type: 'danger', msg: desc.split('\n')[0] }; mapped = true; }
      }
      // 409 當作 Email 重複
      if (!mapped && status === 409) { regErrors.email = '此 Email 已被使用'; mapped = true; }
      // 本文關鍵字判斷
      if (!mapped && /(已存在|已被使用|已被註冊|已註冊|duplicate|exists?|already\s*taken|already\s*exists|in\s*use)/i.test(body)) { regErrors.email = '此 Email 已被使用'; mapped = true; }
      if (!mapped && /(least\s*6|密碼至少\s*6|password.*6)/i.test(body)) { regErrors.password = '密碼至少需 6 個字元'; mapped = true; }
      // 若仍未對應到欄位，顯示一般錯誤
      if (!mapped) { const msg = (e?.message || '註冊失敗').toString(); regForm.alert = { type: 'danger', msg }; }
    } finally {
      regSubmitting.value = false;
    }
  }

  const app = createApp({
    setup() {
      // login 與使用者區域狀態
      const user = ref(null);
      const ready = ref(false); // 初次判定完成後再渲染，避免先顯示「登入/註冊」的閃爍

      // login form state
      const loginForm = reactive({ email: '', password: '', remember: false, alert: { type: '', msg: '' } });

      async function refreshUser() {
        try {
          if (api && api.me) {
            user.value = await api.me();
          }
        } catch {
          user.value = null;
        } finally {
          ready.value = true;
        }
      }

      async function doLogin() {
        loginForm.alert = { type: '', msg: '' };
        loginErrors.email = loginErrors.password = '';
        loginSubmitting.value = true;
        try {
          if (!api || !api.login) throw new Error('系統初始化中，請稍後再試');
          await api.login({ email: loginForm.email, password: loginForm.password }, loginForm.remember);
          closeModal('loginModal');
          await refreshUser();
          window.location.reload();
        } catch (e) {
          const status = e?.status;
          const body = (e?.body || '').toString();
          const data = e?.data || null;
          let mapped = false;
          const genericCredMsg = '帳號或密碼錯誤';
          // 常見密碼錯誤訊息
          const pwdRegex = /(password.*(wrong|invalid|incorrect)|密碼.*(錯誤|不正確|無效)|帳號或密碼.*(錯誤|不正確))/i;
          const msg = (data && typeof data === 'object' && ('message' in data)) ? (data.message || '') : (e?.message || '');
          if (status === 401 || status === 400 || pwdRegex.test(body) || pwdRegex.test(msg)) {
            loginErrors.password = genericCredMsg;
            ensureInvalidDisplay('loginPassword', genericCredMsg);
            mapped = true;
          }
          // ModelState 解析
          const errors = data?.errors || data?.Errors || null;
          if (!mapped && errors && typeof errors === 'object') {
            const takeFirst = (v) => Array.isArray(v) && v.length ? (v[0] || '') : '';
            const p = takeFirst(errors.Password || errors.password || errors['password']);
            if (p) {
              const text = pwdRegex.test(p) ? genericCredMsg : p;
              loginErrors.password = text;
              ensureInvalidDisplay('loginPassword', text);
              mapped = true;
            }
            const em = takeFirst(errors.Email || errors.email || errors['email']);
            if (!mapped && em) { loginErrors.email = em; ensureInvalidDisplay('loginEmail', em); mapped = true; }
          }
          if (!mapped) loginForm.alert = { type: 'danger', msg: msg || e?.message || '登入失敗' };
        } finally { loginSubmitting.value = false; }
      }

      async function doLogout() {
        try { if (api && api.logout) await api.logout(); } finally { window.location.reload(); }
      }

      function openLogin() { openModal('loginModal'); }
      function openRegister() { openModal('registerModal'); }
      function openLoginFromSuccess() { closeModal('registerSuccessModal'); openLogin(); }

      onMounted(() => { waitAuthReady().then((a) => { api = a; refreshUser(); }); });

      return { user, ready, loginForm, loginErrors, regForm, doLogin, doRegister, doLogout, openLogin, openRegister, openLoginFromSuccess };
    },
    template: `
      <template v-if="ready">
        <div class="d-flex align-items-center vb-fade-in">
          <template v-if="!user">
            <a href="#" class="vb-link" @click.prevent="openLogin">登入</a>
            <a href="#" class="vb-link" @click.prevent="openRegister">註冊</a>
          </template>
          <template v-else>
            <span class="user-name me-2">{{ user.Name || user.name || user.Email || '會員' }}</span>
            <a href="#" class="vb-link" @click.prevent="doLogout">登出</a>
          </template>
        </div>
      </template>
      <template v-else>
        <div class="d-flex align-items-center" style="gap:6px; min-width: 100px;">
          <span class="vb-skeleton" style="width:64px; height:14px;"></span>
          <span class="vb-skeleton" style="width:36px; height:14px;"></span>
        </div>
      </template>

      <!-- 占位，不覆蓋既有 Modal 標記 -->
      <div style="display:none"></div>
    `
  });

  // 掛到 header 內的 #authArea
  const mountEl = document.getElementById('authArea');
  if (mountEl) app.mount(mountEl);

  // 註冊 Modal 專用的輕量 Vue app（讓表單可用 v-model/@submit 綁定）
  const regModalEl = document.getElementById('registerModal');
  if (regModalEl) {
    const regApp = createApp({
      setup() { return { regForm, regErrors, doRegister, regSubmitting }; }
    });
    regApp.mount(regModalEl);
  }

  // 登入 Modal 的輕量綁定（讓按鈕 disabled 與錯誤提示生效）
  const loginModalEl = document.getElementById('loginModal');
  if (loginModalEl) {
    const loginApp = createApp({
      setup() { return { loginErrors, loginSubmitting }; }
    });
    loginApp.mount(loginModalEl);
  }

  // 綁定現有 modal 的互動（不重畫 modal 結構，直接用原本 DOM）
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t && t.id === 'btnOpenLoginFromSuccess') {
      e.preventDefault();
      try { const s = bootstrap.Modal.getInstance(document.getElementById('registerSuccessModal')); s?.hide(); } catch { }
      try { const m = new bootstrap.Modal(document.getElementById('loginModal')); m.show(); } catch { }
    }
  });

  // 接管既有表單 submit（沿用原標記，阻止預設送出，走 Vue 方法）
  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return; // 已被 Vue 的 @submit.prevent 處理
    const form = e.target;
    if (form && form.id === 'loginForm') {
      e.preventDefault();
      // 讀現有表單欄位值
      const email = document.getElementById('loginEmail')?.value || '';
      const password = document.getElementById('loginPassword')?.value || '';
      const remember = document.getElementById('rememberMe')?.checked || false;
      const vm = app._instance?.proxy;
      if (vm) { vm.loginForm.email = email; vm.loginForm.password = password; vm.loginForm.remember = remember; vm.doLogin(); }
    }
    // registerForm 交給註冊 Modal 的 Vue 綁定處理
  });
})();
