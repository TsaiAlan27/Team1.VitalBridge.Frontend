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

  const app = createApp({
    setup() {
      let api = null; // mounted 後設置
      const user = ref(null);
      const loading = ref(false);
  const ready = ref(false); // 初次判定完成後再渲染，避免先顯示「登入/註冊」的閃爍

      // login form state
      const loginForm = reactive({ email: '', password: '', remember: false, alert: { type: '', msg: '' } });
      // register form state
      const regForm = reactive({ name: '', email: '', password: '', alert: { type: '', msg: '' } });
      const regSuccessEmail = ref('');

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
        loading.value = true;
        try {
          if (!api || !api.login) throw new Error('系統初始化中，請稍後再試');
          await api.login({ email: loginForm.email, password: loginForm.password }, loginForm.remember);
          closeModal('loginModal');
          await refreshUser();
          window.location.reload();
        } catch (e) {
          loginForm.alert = { type: 'danger', msg: e?.message || '登入失敗' };
        } finally { loading.value = false; }
      }

      async function doRegister() {
        regForm.alert = { type: '', msg: '' };
        loading.value = true;
        try {
          // 簡單前端驗證
          if (!regForm.name?.trim()) throw new Error('請輸入姓名');
          if (!/^\S+@\S+\.\S+$/.test(regForm.email)) throw new Error('Email 格式不正確');
          if (!regForm.password || regForm.password.length < 6) throw new Error('密碼至少需 6 個字元');
          if (!api || !api.register) throw new Error('系統初始化中，請稍後再試');
          await api.register({ name: regForm.name.trim(), email: regForm.email.trim(), password: regForm.password });
          regSuccessEmail.value = regForm.email.trim();
          closeModal('registerModal');
          openModal('registerSuccessModal');
        } catch (e) {
          regForm.alert = { type: 'danger', msg: e?.message || '註冊失敗' };
        } finally { loading.value = false; }
      }

      async function doLogout() {
        try { if (api && api.logout) await api.logout(); } finally { window.location.reload(); }
      }

      function openLogin() { openModal('loginModal'); }
      function openRegister() { openModal('registerModal'); }
      function openLoginFromSuccess() { closeModal('registerSuccessModal'); openLogin(); }

      onMounted(() => {
        waitAuthReady().then((a) => { api = a; refreshUser(); });
      });

      return { user, loading, ready, loginForm, regForm, regSuccessEmail, doLogin, doRegister, doLogout, openLogin, openRegister, openLoginFromSuccess };
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
    if (form && form.id === 'registerForm') {
      e.preventDefault();
      const name = document.getElementById('regName')?.value || '';
      const email = document.getElementById('regEmail')?.value || '';
      const password = document.getElementById('regPassword')?.value || '';
      const vm = app._instance?.proxy;
      if (vm) { vm.regForm.name = name; vm.regForm.email = email; vm.regForm.password = password; vm.doRegister(); }
    }
  });
})();
