// GoogleLogin.js
// 處理 Google 一鍵登入並呼叫後端 /api/Auth/google
// 依賴: auth.js (window.auth.applyTokenResponse)

// 可於全域先行注入 (在任一主頁面 header 片段載入前)
const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '1047575666373-sgsi01nm6qhh987dbrnj7ccnf0aduhcc.apps.googleusercontent.com';
// 後端根 URL 可允許覆寫 (e.g., window.API_BASE_AUTH = 'https://api.example.com/api/Auth')
const BACKEND_GOOGLE_ENDPOINT = (window.API_BASE_AUTH || 'https://localhost:7104/api/Auth') + '/google';

function ensureGsiLoaded() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
        let attempts = 0;
        const max = 40; // 最多等 8 秒 (200ms * 40)
        const timer = setInterval(() => {
            attempts++;
            if (window.google && window.google.accounts && window.google.accounts.id) {
                clearInterval(timer); resolve();
            } else if (attempts >= max) {
                clearInterval(timer); reject(new Error('Google 身分服務載入逾時'));
            }
        }, 200);
    });
}

function renderGoogleButton() {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;
    container.innerHTML = '';
    window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320
    });
}

function decodeJwt(idToken) {
    try {
        const parts = idToken.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
        return payload; // { aud, email, name, sub, iss, exp, ... }
    } catch { return null; }
}

async function handleCredentialResponse(resp) {
    if (!resp || !resp.credential) return;
    // 本地先解碼 (僅為除錯顯示，不代表驗證過) 方便排查 aud mismatch
    const decoded = decodeJwt(resp.credential);
    if (decoded) {
        console.debug('[GoogleLogin] Decoded ID Token payload:', {
            aud: decoded.aud,
            email: decoded.email,
            name: decoded.name,
            sub: decoded.sub,
            iss: decoded.iss,
            exp: decoded.exp,
            now: Math.floor(Date.now() / 1000)
        });
    } else {
        console.debug('[GoogleLogin] Unable to decode ID token (payload).');
    }
    try {
        const r = await fetch(BACKEND_GOOGLE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'include', // 允許後端寫 refresh / antiforgery cookie
            body: JSON.stringify({ idToken: resp.credential })
        });
        if (!r.ok) {
            let bodyText = '';
            try { bodyText = await r.text(); } catch { bodyText = ''; }
            let msg = 'Google 登入失敗 (' + r.status + ')';
            // 嘗試 JSON
            try {
                const obj = bodyText ? JSON.parse(bodyText) : null;
                if (obj) {
                    msg = obj.message || obj.title || msg;
                }
            } catch { /* not json */ }
            // 針對 401 可能原因提示
            if (r.status === 401) {
                if (decoded && decoded.aud && GOOGLE_CLIENT_ID && decoded.aud !== GOOGLE_CLIENT_ID) {
                    msg += '：可能是 Google Client ID (aud) 不符，token aud=' + decoded.aud + ' 須等於後端設定 ClientId';
                } else {
                    msg += '：請確認後端 GoogleLogin:ClientId、CORS、或 token 已失效';
                }
            }
            const err = new Error(msg + (bodyText && bodyText.length < 400 ? ' | raw=' + bodyText : ''));
            err.status = r.status;
            throw err;
        }
        const data = await r.json().catch(() => ({}));
        if (window.auth && typeof window.auth.applyTokenResponse === 'function') {
            window.auth.applyTokenResponse(data, true);
        }
        try { // 關閉登入 Modal
            const loginModalEl = document.getElementById('loginModal');
            if (loginModalEl && window.bootstrap) {
                const inst = window.bootstrap.Modal.getInstance(loginModalEl) || new window.bootstrap.Modal(loginModalEl);
                inst.hide();
            }
        } catch { }
        try { window.location.reload(); } catch { }
    } catch (e) {
        console.error('[GoogleLogin] error', e);
        const alertEl = document.getElementById('loginAlert');
        if (alertEl) {
            alertEl.classList.remove('d-none', 'alert-success');
            alertEl.classList.add('alert-danger');
            alertEl.textContent = e.message || 'Google 登入失敗';
        }
    }
}

async function initGoogleLogin() {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('替換')) {
        console.warn('尚未設定 GOOGLE_CLIENT_ID');
    }
    await ensureGsiLoaded();
    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        ux_mode: 'popup',
        context: 'signin'
    });
    renderGoogleButton();
}

// 當登入 Modal 開啟時重新 render (確保元素存在)
function bindModalEvents() {
    const loginModalEl = document.getElementById('loginModal');
    if (!loginModalEl) return;
    loginModalEl.addEventListener('shown.bs.modal', () => {
        try { renderGoogleButton(); } catch { }
    });
}

(function bootstrapInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { initGoogleLogin().catch(console.error); bindModalEvents(); });
    } else {
        initGoogleLogin().catch(console.error); bindModalEvents();
    }
})();

export { initGoogleLogin };
