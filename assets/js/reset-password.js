// reset-password.js
// 讀取 URL 參數 email, token，自動填入並提交重設密碼請求
// API 規格：POST /api/Auth/reset-password { token, newPassword, confirmPassword }

const API_RESET = 'https://localhost:7104/api/Auth/reset-password';

(function init() {
    const qs = (id) => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || '';
    const token = params.get('token') || '';
    const emailInput = qs('rpEmail');
    if (emailInput) emailInput.value = email;

    function setAlert(type, msg) {
        const el = qs('rpAlert'); if (!el) return; el.className = 'alert alert-' + type; el.textContent = msg;
    }
    function clearAlert() { const el = qs('rpAlert'); if (!el) return; el.className = 'alert d-none'; el.textContent = ''; }

    const form = qs('rpForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const newPwd = qs('rpNewPwd')?.value || '';
        const newPwd2 = qs('rpNewPwd2')?.value || '';
        if (!token) { return setAlert('danger', '遺失驗證資訊，請重新從信件的重設連結開啟此頁'); }
        if (!newPwd || newPwd.length < 6) { return setAlert('danger', '新密碼至少 6 碼'); }
        if (newPwd !== newPwd2) { return setAlert('danger', '兩次密碼不一致'); }
        const btn = qs('rpSubmitBtn');
        const original = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>送出中...';
        let res, text = '';
        try {
            res = await fetch(API_RESET, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: newPwd, confirmPassword: newPwd2 }), credentials: 'include' });
            try { text = await res.text(); } catch { text = ''; }
        } catch { setAlert('danger', '無法連線伺服器'); btn.disabled = false; btn.innerHTML = original; return; }
        btn.disabled = false; btn.innerHTML = original;
        if (!res.ok) {
            const msg = parseMessage(text, '重設失敗');
            setAlert('danger', msg);
            return;
        }
        const okMsg = parseMessage(text, '密碼已更新');
        setAlert('success', okMsg);
        showSuccessModal(okMsg + '，即將返回首頁');
        // 自動回首頁
        setTimeout(() => { window.location.href = '/VitalBridge/index.html'; }, 2000);
    });

    function parseMessage(text, fallback) {
        if (!text) return fallback; try { const d = JSON.parse(text); return d.message || d.error || d.title || fallback; } catch { return text; }
    }
    function openLoginModal() {
        // 保留：使用者點「前往登入」時才開，不再自動於成功後顯示
        const modalEl = document.getElementById('loginModal');
        if (modalEl && window.bootstrap?.Modal) { new bootstrap.Modal(modalEl).show(); }
        else window.location.href = '/VitalBridge/index.html';
    }
    function showSuccessModal(msg) {
        const modalEl = document.getElementById('rpSuccessModal');
        if (!modalEl) return;
        const textEl = document.getElementById('rpSuccessMsg');
        if (textEl) textEl.textContent = msg;
        try { new bootstrap.Modal(modalEl).show(); } catch { }
    }
    const toLogin = qs('rpToLogin');
    toLogin?.addEventListener('click', (e) => { e.preventDefault(); openLoginModal(); });
})();
