// change-password.js
// 修改密碼獨立模組：依賴 auth.js (token) 與 Bootstrap (可選)
// 將密碼表單放於 #pane-security 分頁。表單 id: formChangePassword
// 可調整 API 路徑 CHANGE_PWD_API
(function () {
    const CHANGE_PWD_API = 'https://localhost:7104/api/Auth/change-password'; // TODO: 若後端路徑不同請修改
    let changing = false;

    function waitForAuthReady(timeout = 4000) {
        if (window.auth && typeof window.auth.getAccessToken === 'function') return Promise.resolve();
        return new Promise(res => { const start = Date.now(); const iv = setInterval(() => { if (window.auth && typeof window.auth.getAccessToken === 'function') { clearInterval(iv); clearTimeout(to); res(); } else if (Date.now() - start > timeout) { clearInterval(iv); clearTimeout(to); res(); } }, 120); const to = setTimeout(() => { clearInterval(iv); res(); }, timeout + 200); });
    }
    function getAccessToken() { try { return window.auth && window.auth.getAccessToken && window.auth.getAccessToken(); } catch { return null; } }
    function ensureRefreshed() { try { return window.auth && window.auth.ensureRefreshed && window.auth.ensureRefreshed(); } catch { return Promise.resolve(false); } }
    function getCookie(name) { try { const m = document.cookie.match('(?:^|;)\\s*' + name + '\\s*=\\s*([^;]+)'); return m ? decodeURIComponent(m[1]) : null; } catch { return null; } }
    function getXsrf() { const names = ['XSRF-TOKEN', 'X-CSRF-TOKEN', 'XSRFTOKEN', 'csrf-token']; for (const n of names) { const v = getCookie(n); if (v) return v; } try { const m = document.cookie.match(/(?:^|;)\s*(\.AspNetCore\.Antiforgery[^=]*)=\s*([^;]+)/); if (m && m[2]) return decodeURIComponent(m[2]); } catch { } return null; }
    async function buildHeaders(json = true) { await waitForAuthReady(); let token = getAccessToken(); if (!token) { try { await ensureRefreshed(); token = getAccessToken(); } catch { } } const h = { 'Accept': 'application/json' }; if (json) h['Content-Type'] = 'application/json'; const xsrf = getXsrf(); if (xsrf) { h['X-XSRF-TOKEN'] = xsrf; h['RequestVerificationToken'] = xsrf; } if (token) h['Authorization'] = 'Bearer ' + token; return h; }

    async function apiChangePassword(oldPwd, newPwd, confirmPwd) {
        // 後端採用 camelCase: oldPassword/newPassword/confirmPassword
        // 保留 PascalCase 以兼容可能的另一種模型綁定
        const payload = {
            oldPassword: oldPwd,
            newPassword: newPwd,
            confirmPassword: confirmPwd,
            OldPassword: oldPwd,
            NewPassword: newPwd,
            ConfirmPassword: confirmPwd
        };
        let headers = await buildHeaders(true);
        const body = JSON.stringify(payload);
        let res = await fetch(CHANGE_PWD_API, { method: 'POST', headers, credentials: 'include', body });
        if (res.status === 401) { const ok = await ensureRefreshed(); if (ok) { headers = await buildHeaders(true); res = await fetch(CHANGE_PWD_API, { method: 'POST', headers, credentials: 'include', body }); } }
        if (!res.ok) {
            let msg = '更新失敗(' + res.status + ')';
            try {
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) {
                    const j = await res.json();
                    if (j && j.errors) {
                        const first = Object.values(j.errors).flat()[0];
                        if (first) msg = first;
                    } else if (j.title) { msg += ' ' + j.title; }
                } else { const t = await res.text(); if (t) msg += ' ' + t.slice(0, 150); }
            } catch { }
            throw new Error(msg);
        }
        try { return await res.json(); } catch { return true; }
    }

    function strengthScore(pwd) { if (!pwd) return 0; let score = 0; if (pwd.length >= 6) score++; if (/[A-Z]/.test(pwd)) score++; if (/[a-z]/.test(pwd)) score++; if (/\d/.test(pwd)) score++; if (/[^A-Za-z0-9]/.test(pwd)) score++; return score; }
    function strengthText(pwd) { const score = strengthScore(pwd); if (score === 0) return ''; const levels = ['非常弱', '弱', '中', '強', '很強']; return '強度：' + levels[Math.min(score - 1, levels.length - 1)]; }

    function bind() { const form = document.getElementById('formChangePassword'); if (!form) return; const strengthEl = document.getElementById('pwStrength'); const meter = document.getElementById('pwMeter'); function updateMeter(pwd) { const score = strengthScore(pwd); if (meter) { meter.setAttribute('data-score', String(score)); } if (strengthEl) strengthEl.textContent = strengthText(pwd); } form.addEventListener('click', e => { const btn = e.target.closest('.btn-toggle-pw'); if (!btn) return; const sel = btn.getAttribute('data-target'); if (!sel) return; const input = form.querySelector(sel); if (!input) return; const icon = btn.querySelector('i'); if (input.type === 'password') { input.type = 'text'; if (icon) { icon.classList.remove('bi-eye'); icon.classList.add('bi-eye-slash'); } } else { input.type = 'password'; if (icon) { icon.classList.remove('bi-eye-slash'); icon.classList.add('bi-eye'); } } }); form.addEventListener('input', e => { if (e.target && e.target.id === 'cpNew') { updateMeter(e.target.value); } }); form.addEventListener('submit', async e => { e.preventDefault(); if (changing) return; const oldEl = document.getElementById('cpOld'); const newEl = document.getElementById('cpNew'); const new2El = document.getElementById('cpNew2'); const status = document.getElementById('cpStatus'); const btn = document.getElementById('btnChangePassword'); const oldVal = (oldEl?.value || '').trim(); const newVal = (newEl?.value || '').trim(); const new2Val = (new2El?.value || '').trim(); if (!oldVal || !newVal || !new2Val) { if (status) status.textContent = '請完整填寫'; return; } if (newVal.length < 6) { if (status) status.textContent = '新密碼至少 6 碼'; return; } if (newVal !== new2Val) { if (status) status.textContent = '新密碼不一致'; return; } changing = true; if (status) { status.classList.remove('text-danger', 'text-success'); status.textContent = ''; } if (btn) { btn.disabled = true; btn.dataset.originalText = btn.textContent; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>更新中...'; } try { await apiChangePassword(oldVal, newVal, new2Val); if (status) { status.classList.remove('text-danger'); status.classList.add('text-success'); status.textContent = '已更新，下次登入生效'; } if (oldEl) oldEl.value = ''; if (newEl) newEl.value = ''; if (new2El) new2El.value = ''; updateMeter(''); } catch (err) { if (status) { status.classList.remove('text-success'); status.classList.add('text-danger'); status.textContent = err.message || '更新失敗'; } } finally { changing = false; if (btn) { btn.disabled = false; if (btn.dataset.originalText) { btn.textContent = btn.dataset.originalText; delete btn.dataset.originalText; } else { btn.textContent = '更新密碼'; } } } }); }

    function init() { bind(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
