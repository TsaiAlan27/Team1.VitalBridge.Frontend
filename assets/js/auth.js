// auth.js
// 前端 JWT 處理模組
// - access token 放記憶體
// - refresh token 放 cookie (HttpOnly cookie 需後端設定；若無 HttpOnly，前端仍會以 cookie 存取)
// - 提供 register/login/logout/refresh/me 功能
// - 自帶 fetch wrapper，會在遇到 401 時自動嘗試 refresh 然後重試

// 假設：
// - API 根路徑為相同 origin 的 /api/Auth/（根據後端範例）
// - login 回傳格式為 { accessToken: string, expiresInSeconds: number }（若後端也回傳 refreshToken，前端會存 cookie；更安全的做法是後端以 HttpOnly cookie 設定 refresh token）
// - register 回傳 200 OK
// - refresh 回傳 { accessToken: string, expiresInSeconds: number }

const API_BASE = '/api/Auth';

let accessToken = null; // 記憶體中的 access token
let isRefreshing = false;
let refreshPromise = null;

// Helper: 取得 cookie
function getCookie(name) {
    const v = document.cookie.match('(?:^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? decodeURIComponent(v[1]) : null;
}

// Helper: 設 cookie（簡單），path=/, 可設定 days
function setCookie(name, value, days) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value || '') + expires + '; path=/';
}

// Helper: 刪除 cookie
function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=0; path=/';
}

async function apiFetch(path, opts = {}, retry = true) {
    const headers = opts.headers ? { ...opts.headers } : {};
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
    if (!opts.credentials) opts.credentials = 'include';
    // 若有 server 設定 CSRF token cookie（例如 XSRF-TOKEN），將其放入標頭以通過 CSRF 驗證
    try {
        const xsrf = getCookie('XSRF-TOKEN') || getCookie('X-CSRF-TOKEN') || getCookie('XSRFTOKEN') || getCookie('csrf-token');
        if (xsrf) {
            // 常見 header 名稱
            headers['X-XSRF-TOKEN'] = xsrf;
            headers['RequestVerificationToken'] = xsrf;
        }
    } catch (e) {
        // ignore
    }
    // debug: console.debug('apiFetch', path, { hasAccessToken: !!accessToken, headers });
    const res = await fetch(API_BASE + path, { ...opts, headers });
    if (res.status === 401 && retry) {
        // 嘗試 refresh
        const ok = await ensureRefreshed();
        if (ok) return apiFetch(path, opts, false);
    }
    return res;
}

async function ensureRefreshed() {
    // 若已有正在 refresh 的 promise，等待它
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }
    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            // refresh endpoint 依後端實作可能會使用 HttpOnly cookie 辨識 refresh token
            console.debug('ensureRefreshed: calling refresh endpoint');
            // 讀取可能的 XSRF cookie 並放入 header
            const xsrf = getCookie('XSRF-TOKEN') || getCookie('X-CSRF-TOKEN') || getCookie('XSRFTOKEN') || getCookie('csrf-token');
            const refreshHeaders = xsrf ? { 'X-XSRF-TOKEN': xsrf, 'RequestVerificationToken': xsrf } : {};
            console.debug('ensureRefreshed: sending refresh with xsrf present', !!xsrf);
            const r = await fetch(API_BASE + '/refresh', { method: 'POST', credentials: 'include', headers: refreshHeaders });
            if (!r.ok) {
                // 嘗試讀取 body 以便 debug（後端可能回傳錯誤訊息或 stacktrace）
                let bodyText = '';
                try { bodyText = await r.text(); } catch (e) { bodyText = '<unable to read response text>'; }
                console.error('ensureRefreshed: refresh returned not OK', r.status, bodyText);
                clearAuth();
                return false;
            }
            const data = await r.json();
            // 後端回傳 { accessToken, expiresInSeconds }
            if (data?.accessToken) {
                accessToken = data.accessToken;
                console.debug('ensureRefreshed: obtained accessToken');
                // 自動更新 header UI（不等待也可，但 await 可確保 UI 立即反映）
                try { await updateHeaderUI(); } catch (e) { console.debug('updateHeaderUI failed', e); }
                return true;
            }
            console.warn('ensureRefreshed: refresh response missing accessToken', data);
            clearAuth();
            return false;
        } catch (e) {
            console.error('refresh failed', e);
            clearAuth();
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();
    return refreshPromise;
}

function clearAuth() {
    accessToken = null;
    // 若 refresh token 是存在 cookie 且非 HttpOnly，可刪除
    deleteCookie('refreshToken');
}

export async function register(dto) {
    const res = await fetch(API_BASE + '/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto), credentials: 'include' });
    if (!res.ok) throw new Error('註冊失敗');
    return await res.json().catch(() => null);
}

export async function login(dto, remember = false) {
    const res = await fetch(API_BASE + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto), credentials: 'include' });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '登入失敗');
    }
    const data = await res.json();
    if (data?.accessToken) {
        accessToken = data.accessToken;
    }
    // 如果 API 同時回傳 refreshToken（非 HttpOnly），可存 cookie（長期）
    if (data?.refreshToken) {
        // 記得設定安全性：若 production，應該由後端透過 HttpOnly cookie 設定
        setCookie('refreshToken', data.refreshToken, remember ? 30 : 1);
    }
    // 更新 header UI
    try { await updateHeaderUI(); } catch (e) { }
    return data;
}

export async function logout() {
    // 呼叫後端 logout
    try {
        await fetch(API_BASE + '/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + (accessToken || '') }, credentials: 'include' });
    } catch (e) { }
    clearAuth();
}

// 取得目前使用者並更新 header 顯示
export async function updateHeaderUI() {
    const container = document.getElementById('authArea');
    if (!container) return;
    try {
        const user = await me();
        renderAuthArea(user);
    } catch (e) {
        renderAuthArea(null);
    }
}

function renderAuthArea(user) {
    const container = document.getElementById('authArea');
    if (!container) return;
    container.innerHTML = '';
    if (!user) {
        // 未登入：顯示登入/註冊按鈕（圓角矩形＋褐色主題）
        const loginBtn = document.createElement('a');
        loginBtn.className = 'vb-link';
        loginBtn.href = '#';
        loginBtn.textContent = '登入';
        loginBtn.addEventListener('click', (e) => { e.preventDefault(); const el = new bootstrap.Modal(document.getElementById('loginModal')); el.show(); });

        const regBtn = document.createElement('a');
        regBtn.className = 'vb-link';
        regBtn.href = '#';
        regBtn.textContent = '註冊';
        regBtn.addEventListener('click', (e) => { e.preventDefault(); const el = new bootstrap.Modal(document.getElementById('registerModal')); el.show(); });

        container.appendChild(loginBtn);
        container.appendChild(regBtn);
        return;
    }

    // 已登入：顯示名稱、下拉與登出
    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex align-items-center';
    const nameEl = document.createElement('span');
    nameEl.className = 'user-name me-2';
    nameEl.textContent = user.Name || user.name || user.Email || '會員';

    const logoutBtn = document.createElement('a');
    logoutBtn.className = 'vb-link btn-logout';
    logoutBtn.href = '#';
    logoutBtn.textContent = '登出';
    logoutBtn.addEventListener('click', async (e) => { e.preventDefault(); await logout(); renderAuthArea(null); });

    wrapper.appendChild(nameEl);
    wrapper.appendChild(logoutBtn);
    container.appendChild(wrapper);
}

export async function me() {
    const res = await apiFetch('/me', { method: 'GET' });
    if (!res.ok) throw new Error('無法取得使用者資料');
    return await res.json();
}

// Setup DOM handlers if present
function setupDomHandlers() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const remember = document.getElementById('rememberMe').checked;
            const alertEl = document.getElementById('loginAlert');
            try {
                await login({ email, password }, remember);
                if (alertEl) { alertEl.classList.remove('d-none', 'alert-danger'); alertEl.classList.add('alert-success'); alertEl.textContent = '登入成功'; }
                // 關閉 modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                modal?.hide();
                // 重新載入頁面或更新 UI
                window.location.reload();
            } catch (err) {
                if (alertEl) { alertEl.classList.remove('d-none', 'alert-success'); alertEl.classList.add('alert-danger'); alertEl.textContent = err.message || '登入失敗'; }
            }
        });
    }

    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const alertEl = document.getElementById('regAlert');
            try {
                await register({ name, email, password });
                if (alertEl) { alertEl.classList.remove('d-none', 'alert-danger'); alertEl.classList.add('alert-success'); alertEl.textContent = '註冊成功，請登入'; }
                // 自動開啟登入 modal
                const regModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                regModal?.hide();
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            } catch (err) {
                if (alertEl) { alertEl.classList.remove('d-none', 'alert-success'); alertEl.classList.add('alert-danger'); alertEl.textContent = err.message || '註冊失敗'; }
            }
        });
    }

    // 可以在需要的位置掛 logout 按鈕，這裡示範全域事件
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.matches && t.matches('.btn-logout')) {
            e.preventDefault();
            logout().then(() => window.location.reload()).catch(() => window.location.reload());
        }
    });
}

// 初始化
// 初始化：總是嘗試透過 refresh 取得 access token（支援 HttpOnly cookie）
(async function init() {
    try {
        await ensureRefreshed();
    } catch (e) {
        // ignore
    }
    // 設定 DOM handler 並更新 header
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { setupDomHandlers(); updateHeaderUI(); });
    else { setupDomHandlers(); updateHeaderUI(); }
})();

// export default
export default {
    login, register, logout, me, apiFetch
};

// 暴露給開發者在 Console 使用，方便 debug
try {
    window.auth = window.auth || {};
    Object.assign(window.auth, {
        login,
        register,
        logout,
        me,
        apiFetch,
        ensureRefreshed,
        updateHeaderUI,
        getAccessToken: () => accessToken
    });
} catch (e) {
    // ignore (e.g., non-browser env)
}
