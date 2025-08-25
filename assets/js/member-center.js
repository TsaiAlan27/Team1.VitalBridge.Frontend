// member-center.js
// 會員中心 個人資料讀取 (僅此檔案，勿修改 auth.js)
// API: https://localhost:7104/api/Member/profile (固定 7104)
// 後端欄位: UserId, Name, Phone, Email, CityId, City, TownshipId, Township, Address, CreatedAt, UpdatedAt, LastLoginAt, RoleNames

(function () {
    const PROFILE_API = 'https://localhost:7104/api/Member/profile'; // 強制 7104
    let profileLoaded = false;
    let loadingPromise = null;

    const log = (...a) => { try { console.debug('[member-center]', ...a); } catch { } };

    function waitForAuthReady(timeout = 4000) {
        if (window.auth && typeof window.auth.getAccessToken === 'function') return Promise.resolve();
        return new Promise(res => {
            const start = Date.now();
            const iv = setInterval(() => {
                if (window.auth && typeof window.auth.getAccessToken === 'function') { clearInterval(iv); clearTimeout(to); res(); }
                else if (Date.now() - start > timeout) { clearInterval(iv); clearTimeout(to); log('waitForAuthReady timeout'); res(); }
            }, 120);
            const to = setTimeout(() => { clearInterval(iv); res(); }, timeout + 200);
        });
    }

    function getAccessToken() { try { return window.auth && window.auth.getAccessToken && window.auth.getAccessToken(); } catch { return null; } }
    function ensureRefreshed() { try { return window.auth && window.auth.ensureRefreshed && window.auth.ensureRefreshed(); } catch { return Promise.resolve(false); } }

    function getCookie(name) { try { const m = document.cookie.match('(?:^|;)\\s*' + name + '\\s*=\\s*([^;]+)'); return m ? decodeURIComponent(m[1]) : null; } catch { return null; } }
    function getXsrf() {
        const names = ['XSRF-TOKEN', 'X-CSRF-TOKEN', 'XSRFTOKEN', 'csrf-token'];
        for (const n of names) { const v = getCookie(n); if (v) return v; }
        try { const m = document.cookie.match(/(?:^|;)\s*(\.AspNetCore\.Antiforgery[^=]*)=\s*([^;]+)/); if (m && m[2]) return decodeURIComponent(m[2]); } catch { }
        return null;
    }

    async function fetchProfile() {
        await waitForAuthReady();
        let token = getAccessToken();
        if (!token) { try { await ensureRefreshed(); token = getAccessToken(); } catch { } }
        const headers = { 'Accept': 'application/json' };
        const xsrf = getXsrf();
        if (xsrf) { headers['X-XSRF-TOKEN'] = xsrf; headers['RequestVerificationToken'] = xsrf; }
        if (token) headers['Authorization'] = 'Bearer ' + token;
        let res;
        try { res = await fetch(PROFILE_API + '?_=' + Date.now(), { method: 'GET', headers, credentials: 'include' }); } catch (e) { throw new Error('連線失敗:' + e.message); }
        if (res.status === 401) {
            const ok = await ensureRefreshed();
            if (ok) {
                const nt = getAccessToken();
                if (nt) { headers['Authorization'] = 'Bearer ' + nt; }
                res = await fetch(PROFILE_API + '?_=' + Date.now(), { method: 'GET', headers, credentials: 'include' });
            }
        }
        if (!res.ok) throw new Error('讀取失敗(' + res.status + ')');
        return await res.json();
    }

    // ---- UI helpers ----
    const txt = (id, v) => { const el = document.getElementById(id); if (!el) return; el.textContent = (v === null || v === undefined || v === '') ? '--' : v; };
    const val = (id, v) => { const el = document.getElementById(id); if (!el) return; el.value = v == null ? '' : v; };
    function ensureOpt(sel, value, label) { if (!sel || value == null || value === '') return; if (!Array.from(sel.options).some(o => o.value == value || o.text == label)) { const o = document.createElement('option'); o.value = value; o.text = label || value; sel.appendChild(o); } sel.value = value; }
    const fmt = dt => { try { const d = dt instanceof Date ? dt : new Date(dt); if (isNaN(d.getTime())) return '--'; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; } catch { return '--'; } };
    function renderRoles(roles) { try { const box = document.getElementById('memberRoles'); if (!box) return; if (!Array.isArray(roles) || !roles.length) { box.hidden = true; box.innerHTML = ''; return; } box.hidden = false; const cls = r => { const n = (r || '').toLowerCase(); if (/admin|管理/.test(n)) return 'role-admin'; if (/vip|premium|尊榮/.test(n)) return 'role-alt'; if (/pending|未驗證|unverified/.test(n)) return 'role-warn'; return ''; }; box.innerHTML = roles.map(r => `<span class="badge ${cls(r)}">${r}</span>`).join(''); } catch { } }
    function completeness() { const ids = ['profileName', 'profilePhone', 'profileCity', 'profileDistrict', 'profileAddressDetail']; let filled = 0; ids.forEach(id => { const el = document.getElementById(id); const v = el && ('value' in el) ? (el.value || '').trim() : ''; if (v) filled++; }); const pct = Math.round(filled / ids.length * 100);['qaProfilePercent', 'qaProfilePercentInline'].forEach(i => { const e = document.getElementById(i); if (e) e.textContent = pct + '%'; }); const badge = document.getElementById('profileCompletenessBadge'); if (badge) { badge.classList.remove('pc-low', 'pc-mid', 'pc-high'); if (pct < 40) badge.classList.add('pc-low'); else if (pct < 80) badge.classList.add('pc-mid'); else badge.classList.add('pc-high'); } }

    function normalize(p) {
        if (!p) return null;
        // 後端可能是 camelCase 或 PascalCase，統一回 PascalCase 供 UI / 其它程式使用
        return {
            UserId: p.UserId ?? p.userId ?? p.id ?? p.Id ?? null,
            Name: p.Name ?? p.name ?? '',
            Phone: p.Phone ?? p.phone ?? '',
            Email: p.Email ?? p.email ?? '',
            CityId: p.CityId ?? p.cityId ?? null,
            City: p.City ?? p.city ?? null,
            TownshipId: p.TownshipId ?? p.townshipId ?? null,
            Township: p.Township ?? p.township ?? null,
            Address: p.Address ?? p.address ?? '',
            CreatedAt: p.CreatedAt ?? p.createdAt ?? null,
            UpdatedAt: p.UpdatedAt ?? p.updatedAt ?? null,
            LastLoginAt: p.LastLoginAt ?? p.lastLoginAt ?? null,
            RoleNames: p.RoleNames ?? p.roleNames ?? p.roles ?? []
        };
    }
    function fill(pRaw) {
        const p = normalize(pRaw);
        if (!p) return;
        try { window.memberCenter.profile = p; } catch { }
        txt('memberName', p.Name || '--');
        txt('memberEmail', p.Email || '--');
        renderRoles(p.RoleNames);
        // 會員編號顯示：使用後端回傳的 UserId
        txt('profileId', p.UserId || '--');
        // 若頁面還有其它放會員編號的節點（例如 memberId / memberUserId），一併填入
        txt('memberId', p.UserId || '--');
        txt('memberUserId', p.UserId || '--');
        val('profileName', p.Name || '');
        val('profileEmail', p.Email || '');
        val('profilePhone', p.Phone || '');
        const citySel = document.getElementById('profileCity');
        const distSel = document.getElementById('profileDistrict');
        if (p.City) ensureOpt(citySel, p.CityId || p.City, p.City);
        if (p.Township) { if (distSel && distSel.disabled) distSel.disabled = false; ensureOpt(distSel, p.TownshipId || p.Township, p.Township); }
        val('profileAddressDetail', p.Address || '');
        txt('profileCreatedAt', fmt(p.CreatedAt));
        txt('profileUpdatedAt', fmt(p.UpdatedAt));
        txt('profileLastLoginAt', fmt(p.LastLoginAt));
        completeness();
    }

    async function loadProfile() {
        if (profileLoaded) return window.memberCenter.profile;
        if (loadingPromise) return loadingPromise;
        const status = document.getElementById('profileSaveStatus');
        if (status) status.textContent = '載入中...';
        loadingPromise = (async () => {
            try {
                const data = await fetchProfile();
                fill(data);
                profileLoaded = true;
                if (status) status.textContent = '';
                return window.memberCenter.profile;
            } catch (e) {
                if (status) status.textContent = e.message || '載入失敗';
                throw e;
            } finally { loadingPromise = null; }
        })();
        return loadingPromise;
    }

    function bindTab() { document.addEventListener('shown.bs.tab', e => { try { const t = e.target && e.target.getAttribute('data-bs-target'); if (t === '#pane-profile') loadProfile(); } catch { } }); if (location.hash === '#pane-profile') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadProfile); else loadProfile(); } }
    function bindFields() { const handler = e => { const id = e.target && e.target.id; if (id && /^profile(Name|Phone|City|District|AddressDetail)$/.test(id)) completeness(); }; document.addEventListener('input', handler); document.addEventListener('change', handler); }

    function init() { if (document.getElementById('formProfile')) { bindTab(); bindFields(); } }

    // 初始先用 "--" 佔位，避免空白或閃爍
    function setInitialPlaceholders() {
        const textIds = [
            'memberName', 'memberEmail', 'profileId', 'memberId', 'memberUserId',
            'profileCreatedAt', 'profileUpdatedAt', 'profileLastLoginAt',
            'qaProfilePercent', 'qaProfilePercentInline'
        ];
        textIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });
        const inputIds = ['profileName', 'profileEmail', 'profilePhone', 'profileAddressDetail'];
        inputIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        ['profileCity', 'profileDistrict'].forEach(id => { const sel = document.getElementById(id); if (sel && sel.tagName === 'SELECT') { if (!sel.querySelector('option[value=""]')) { const opt = document.createElement('option'); opt.value = ''; opt.textContent = '--'; sel.appendChild(opt); } sel.value = ''; } });
        ['profileCompletenessBadge'].forEach(id => { const b = document.getElementById(id); if (b) { b.classList.remove('pc-low', 'pc-mid', 'pc-high'); } });
    }

    function init() { if (document.getElementById('formProfile')) { setInitialPlaceholders(); bindTab(); bindFields(); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    try { window.memberCenter = window.memberCenter || {}; window.memberCenter.loadProfile = loadProfile; } catch { }
})();
