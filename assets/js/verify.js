// verify.js
// 說明：
//   寄出的 Email 驗證連結應指向前端：  https://<前端域名>/verify.html?email=...&token=...
//   此頁會解析參數再呼叫後端 /api/Auth/verify
//   若有反向代理 (例如前端 7184 -> 後端 7104)，建議由代理把 /api 轉發到後端，
//   這樣前端只要用相對路徑 /api/Auth/verify 免 CORS。
//   目前組員說使用 7184，因此改為動態判斷：
//     1. 若同源已提供 /api (反向代理)，走相對路徑
//     2. 否則 fallback 到原本後端主機 7104

// 可自訂後端基底（若部署時想強制指定，可在 index/verify 之前於 window.__BACKEND_BASE 設定）
const BACKEND_BASE = (function () {
    if (window.__BACKEND_BASE) return window.__BACKEND_BASE.replace(/\/$/, '');
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocal) {
        // 若使用 7184 (目前是反向代理只放前端，未代理 /api)，直接指向後端 7104
        if (location.port === '7184') return 'https://localhost:7104';
        // 一般 Vite 開發預設 5173，後端 7104
        return 'https://localhost:7104';
    }
    // 正式環境：若前端與後端同網域有 /api 轉發 => 使用相對路徑
    return '';
})();

const VERIFY_API_PATH = '/api/Auth/verify';
const RESEND_API_PATH = '/api/Auth/resend-verification';
const RESEND_COOLDOWN_MS = 60000; // 60秒冷卻

function buildUrl(path) {
    if (!BACKEND_BASE) return path; // 相對路徑（同源）
    return BACKEND_BASE + path;
}

// ==== 子路徑支援 (e.g. /VitalBridge/) ====
const SITE_BASE = (function () {
    // 取第一層 segment；若第一層是 VitalBridge 則當作 base
    const segs = location.pathname.split('/').filter(Boolean);
    if (segs[0] && /vitalbridge/i.test(segs[0])) return '/' + segs[0];
    return '';
})();

function siteLink(path) {
    if (!path.startsWith('/')) path = '/' + path;
    if (!SITE_BASE) return path;
    if (path.toLowerCase().startsWith(SITE_BASE.toLowerCase() + '/')) return path;
    return SITE_BASE + path;
}

// ===== 冷卻 / 倒數工具 =====
function cooldownKey(email) { return 'verifyResend:' + (email || '').toLowerCase(); }
function setCooldown(email) { try { localStorage.setItem(cooldownKey(email), Date.now().toString()); } catch { } }
function getCooldownRemaining(email) {
    try { const ts = parseInt(localStorage.getItem(cooldownKey(email)) || '0', 10); if (!ts) return 0; const remain = RESEND_COOLDOWN_MS - (Date.now() - ts); return remain > 0 ? remain : 0; } catch { return 0; }
}
function formatSec(ms) { return Math.ceil(ms / 1000); }
function startCountdown(btn, email, baseText) {
    if (!btn) return;
    function tick() {
        const remain = getCooldownRemaining(email);
        if (remain <= 0) { btn.disabled = false; btn.textContent = baseText; return; }
        btn.disabled = true; btn.textContent = `${baseText} (${formatSec(remain)}s)`; setTimeout(tick, 1000);
    }
    tick();
}
function prepareResendButton(email, id, baseText) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const remain = getCooldownRemaining(email);
    if (remain > 0) startCountdown(btn, email, baseText);
}

function qs(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
}

function escapeHtml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function runVerify() {
    const email = qs('email');
    const token = qs('token');
    const loadingBox = document.getElementById('loadingBox');
    const resultBox = document.getElementById('resultBox');
    if (!email || !token) {
        loadingBox?.classList.add('d-none');
        resultBox.className = 'alert alert-danger fade-in';
        resultBox.innerHTML = '<h5 class="mb-2">驗證參數缺失</h5><p class="mb-3">請確認您點擊的是完整的驗證連結，或重新要求寄送驗證信。</p><a class="btn btn-primary" href="' + siteLink('/index.html') + '">回首頁</a>';
        resultBox.classList.remove('d-none');
        return;
    }
    try {
        const apiUrl = buildUrl(VERIFY_API_PATH) + `?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
        console.debug('[verify] calling', apiUrl, 'BACKEND_BASE=', BACKEND_BASE || '(same-origin)');
        const res = await fetch(apiUrl, { method: 'GET', credentials: 'include' });
        let text = '';
        try { text = await res.text(); } catch { text = ''; }
        loadingBox?.classList.add('d-none');
        if (!res.ok) {
            // 若後端回傳 JSON，嘗試解析 message
            let msg = '驗證失敗，請稍後再試';
            try { const data = JSON.parse(text); msg = data.message || data.error || msg; } catch { if (text) msg = text; }
            resultBox.className = 'alert alert-danger fade-in';
            resultBox.innerHTML = `<h5 class="mb-2">驗證失敗</h5><p class="mb-2">${escapeHtml(msg)}</p><p class="text-muted small mb-3">(status: ${res.status})</p><div class="d-flex gap-2 flex-wrap"><a class="btn btn-outline-secondary" href="${siteLink('/index.html')}">回首頁</a><button class="btn btn-primary" id="btnResend">重新寄送驗證信</button></div>`;
            resultBox.classList.remove('d-none');
            // 綁定重新寄送
            const br = document.getElementById('btnResend');
            br?.addEventListener('click', () => resend(email));
            prepareResendButton(email, 'btnResend', '重新寄送驗證信');
            return;
        }
        // 成功：後端可能回傳文字 "驗證成功" 或 JSON
        let successMsg = '您的帳號已完成驗證，現在可以登入。';
        if (text) {
            try {
                const data = JSON.parse(text);
                successMsg = data.message || data.Message || data.result || successMsg;
            } catch {
                // 純文字
                if (/成功/.test(text)) successMsg = text.trim();
            }
        }
        resultBox.className = 'alert alert-success fade-in';
        resultBox.innerHTML = `<div class="d-flex flex-column align-items-center"><div class="verify-icon text-success mb-3"><i class="bi bi-check-circle-fill"></i></div><h5 class="mb-2">驗證成功</h5><p class="mb-3 text-center">${escapeHtml(successMsg)}<br><small class="text-muted">Email: ${escapeHtml(email)}</small></p><div class="d-flex gap-2 flex-wrap justify-content-center"><a class="btn btn-primary" href="${siteLink('/index.html')}" id="btnGoLogin">前往登入</a><a class="btn btn-outline-secondary" href="${siteLink('/index.html')}">回首頁</a></div></div>`;
        resultBox.classList.remove('d-none');
        // 如果 header 已載入且有登入 modal，點按鈕打開
        document.getElementById('btnGoLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                const loginModalEl = document.getElementById('loginModal');
                if (loginModalEl && window.bootstrap && bootstrap.Modal) {
                    const m = new bootstrap.Modal(loginModalEl);
                    m.show();
                } else {
                    window.location.href = siteLink('/index.html');
                }
            } catch {
                window.location.href = siteLink('/index.html');
            }
        });
    } catch (err) {
        loadingBox?.classList.add('d-none');
        const resultBox = document.getElementById('resultBox');
        if (resultBox) {
            resultBox.className = 'alert alert-danger fade-in';
            resultBox.innerHTML = `<h5 class="mb-2">系統錯誤</h5><p class="mb-3">${escapeHtml(err?.message || '請稍後再試')}</p><a class="btn btn-outline-secondary" href="${siteLink('/index.html')}">回首頁</a>`;
            resultBox.classList.remove('d-none');
        }
    }
}

async function resend(email) {
    const resultBox = document.getElementById('resultBox');
    const btn = document.getElementById('btnResend') || document.getElementById('btnResendAgain');
    if (!email) return;
    const remain = getCooldownRemaining(email);
    if (remain > 0) {
        if (btn) startCountdown(btn, email, btn.id === 'btnResendAgain' ? '再試一次' : '重新寄送驗證信');
        return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 寄送中'; }
    try {
        const baseUrl = buildUrl(RESEND_API_PATH);
        console.debug('[verify] resend sequence to', baseUrl);
        let finalResp = null, finalText = '';
        // 1) application/json "email"
        try {
            let r = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(email), credentials: 'include' });
            finalResp = r; try { finalText = await r.text(); } catch { finalText = ''; }
            if (!r.ok && [400, 415, 422].includes(r.status)) {
                // 2) text/plain
                r = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: email, credentials: 'include' });
                finalResp = r; try { finalText = await r.text(); } catch { finalText = ''; }
            }
            if (!finalResp.ok && [400, 415, 422].includes(finalResp.status)) {
                // 3) JSON 物件 variants
                const variants = [{ email }, { Email: email }, { email, type: 'verify' }];
                for (const v of variants) {
                    const rr = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v), credentials: 'include' });
                    finalResp = rr; try { finalText = await rr.text(); } catch { finalText = ''; }
                    if (rr.ok) break; if (![400, 415, 422].includes(rr.status)) break;
                }
            }
            if (!finalResp.ok && [400, 415, 422].includes(finalResp.status)) {
                // 4) Query 參數 + 空 body
                const rr = await fetch(baseUrl + `?email=${encodeURIComponent(email)}`, { method: 'POST', credentials: 'include' });
                finalResp = rr; try { finalText = await rr.text(); } catch { finalText = ''; }
            }
        } catch (e) { finalResp = null; finalText = e.message || 'network error'; }

        let msg = '重新寄送申請已送出，請稍候查收郵件。';
        if (finalText) { try { const data = JSON.parse(finalText); msg = data.message || data.result || data.title || msg; } catch { if (finalText.trim()) msg = finalText.trim(); } }
        setCooldown(email);
        if (!finalResp || !finalResp.ok) {
            const status = finalResp ? finalResp.status : 'no-response';
            resultBox.className = 'alert alert-danger fade-in';
            resultBox.innerHTML = `<h5 class="mb-2">重新寄送失敗</h5><p class="mb-2">${escapeHtml(msg)}</p><p class="text-muted small mb-3">status: ${status}</p><div class="d-flex gap-2 flex-wrap"><a class="btn btn-outline-secondary" href="${siteLink('/index.html')}">回首頁</a><button class="btn btn-primary" id="btnResendAgain">再試一次</button></div>`;
            setTimeout(() => { const again = document.getElementById('btnResendAgain'); again?.addEventListener('click', () => resend(email)); prepareResendButton(email, 'btnResendAgain', '再試一次'); }, 0);
        } else {
            resultBox.className = 'alert alert-info fade-in';
            resultBox.innerHTML = `<h5 class=\"mb-2\">已重新寄送</h5><p class=\"mb-3\">${escapeHtml(msg)}</p><a class=\"btn btn-primary\" href=\"${siteLink('/index.html')}\">回首頁</a>`;
        }
    } catch (e) {
        resultBox.className = 'alert alert-danger fade-in';
        resultBox.innerHTML = `<h5 class="mb-2">系統錯誤</h5><p class="mb-3">${escapeHtml(e.message || '請稍後再試')}</p><a class="btn btn-outline-secondary" href="${siteLink('/index.html')}">回首頁</a>`;
    }
    const activeBtn = document.getElementById('btnResend') || document.getElementById('btnResendAgain');
    if (activeBtn) {
        const base = activeBtn.id === 'btnResendAgain' ? '再試一次' : '重新寄送驗證信';
        startCountdown(activeBtn, email, base);
    }
}

// 啟動
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runVerify); else runVerify();
