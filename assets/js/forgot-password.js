// 模組採 IIFE，並掛到 window.forgotPassword 供除錯（不污染 auth.js）
(function initForgotPassword() {
    // ===================== 設定區 =====================
    /** 後端 API 根（強制固定 7104，不再允許覆寫） */
    const API_BASE = 'https://localhost:7104/api/Auth';
    const ENDPOINT = {
        request: API_BASE + '/forgot-password',
        // reset endpoint 將在獨立 reset-password.html 使用，這裡僅保留名稱（不再於此流程使用）
        reset: API_BASE + '/reset-password'
    };

    // ===================== DOM / 工具 =====================
    const qs = (id) => document.getElementById(id);
    const show = (el) => el && el.classList.remove('d-none');
    const hide = (el) => el && el.classList.add('d-none');
    const setAlert = (el, type, msg) => { if (!el) return; el.className = 'alert alert-' + type; el.textContent = msg; };
    const clearAlert = (el) => { if (!el) return; el.className = 'alert d-none'; el.textContent = ''; };
    const withLoading = (btn, loadingText, fn) => {
        if (!btn) return fn();
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span>${loadingText}`;
        return Promise.resolve(fn())
            .finally(() => { btn.disabled = false; btn.innerHTML = original; });
    };
    const parseMaybeJsonMessage = (text, fallback) => {
        if (!text) return fallback;
        try { const d = JSON.parse(text); return d?.message || d?.error || d?.title || fallback; } catch { return text; }
    };

    function switchStep(step) {
        const step1 = qs('fpRequestForm');
        const step2 = qs('fpResetForm');
        if (step === 1) { show(step1); hide(step2); }
        else if (step === 2) { hide(step1); show(step2); }
    }
    function openModal() {
        const el = qs('forgotPasswordModal');
        if (el && window.bootstrap?.Modal) { new bootstrap.Modal(el).show(); }
    }
    function backToLogin() {
        try { bootstrap.Modal.getInstance(qs('forgotPasswordModal'))?.hide(); } catch { }
        try { new bootstrap.Modal(qs('loginModal')).show(); } catch { }
    }

    // ===================== API =====================
    /**
     * 呼叫 API
     * @param {string} url
     * @param {object} bodyObj
     * @param {string} failDefault
     * @param {string} successDefault
     */
    async function postJson(url, bodyObj, failDefault, successDefault) {
        let res, text = '';
        try {
            res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj), credentials: 'include' });
            try { text = await res.text(); } catch { text = ''; }
        } catch { throw new Error('無法連線伺服器'); }
        if (!res.ok) { throw new Error(parseMaybeJsonMessage(text, failDefault)); }
        if (!text) return successDefault;
        const msg = parseMaybeJsonMessage(text, successDefault);
        return msg || successDefault;
    }
    const requestReset = (email) => postJson(ENDPOINT.request, { email }, '寄送失敗', '已寄出重設密碼信');
    // resetPassword 由獨立頁面負責，這裡不再實際呼叫；保留介面避免外部既有呼叫壞掉
    const resetPassword = () => Promise.reject(new Error('請使用獨立重設密碼頁面'));

    // ===================== 綁定事件 =====================
    function bindGlobalLinks() {
        // 觸發「忘記密碼」
        const link = qs('linkForgotPassword');
        if (link) {
            link.addEventListener('click', e => {
                e.preventDefault();
                clearAlert(qs('fpRequestAlert')); clearAlert(qs('fpResetAlert'));
                switchStep(1);
                // 若登入 Modal 正在顯示，先關閉以避免重疊
                try {
                    const lme = document.getElementById('loginModal');
                    if (lme && window.bootstrap?.Modal) {
                        const inst = bootstrap.Modal.getInstance(lme) || new bootstrap.Modal(lme);
                        inst.hide();
                        // 等待淡出動畫結束再開啟忘記密碼視窗
                        setTimeout(openModal, 250);
                        return;
                    }
                } catch { }
                openModal();
            });
        }
        // 動態委派：返回登入 / 上一步
        document.addEventListener('click', e => {
            const t = e.target;
            if (!t?.getAttribute) return;
            const act = t.getAttribute('data-fp-action');
            if (!act) return;
            e.preventDefault();
            if (act === 'to-login') backToLogin();
            else if (act === 'back-step1') switchStep(1);
        });
    }

    function bindRequestForm() {
        const form = qs('fpRequestForm');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const email = (qs('fpEmail')?.value || '').trim();
            const alertEl = qs('fpRequestAlert');
            clearAlert(alertEl);
            if (!email) { setAlert(alertEl, 'danger', '請輸入 Email'); return; }
            const btn = qs('fpRequestBtn');
            withLoading(btn, '寄送中...', () => requestReset(email)
                .then(msg => {
                    setAlert(alertEl, 'success', msg + '，請前往信箱點擊重設連結');
                })
                .catch(err => setAlert(alertEl, 'danger', err.message || '寄送失敗')));
        });
    }

    function bindResetForm() {
        // 現在改為獨立頁面，不再於 Modal 內重設，若舊 DOM 尚存在則隱藏
        const legacyForm = qs('fpResetForm');
        if (legacyForm) legacyForm.classList.add('d-none');
    }

    function bind() {
        bindGlobalLinks();
        bindRequestForm();
        bindResetForm();
    }

    // ===================== 初始化 =====================
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

    // ===================== Debug 暴露 =====================
    try {
        window.forgotPassword = Object.assign(window.forgotPassword || {}, {
            requestReset, resetPassword, switchStep, openModal
        });
    } catch { }
})();
