// member-center.js
// 會員中心 個人資料讀取 (僅此檔案，勿修改 auth.js)
// API: https://localhost:7104/api/Member/profile (固定 7104)
// 後端欄位: UserId, Name, Phone, Email, CityId, City, TownshipId, Township, Address, CreatedAt, UpdatedAt, LastLoginAt, RoleNames

(function () {
    const PROFILE_API = 'https://localhost:7104/api/Member/profile'; // 強制 7104
    const LOCATION_BASE = 'https://localhost:7104/api/location'; // 新增: 位置 API base
    let profileLoaded = false;
    let loadingPromise = null;
    let citiesCache = null; // [{id,name}]
    const townshipCache = new Map(); // cityId => [{id,name}]

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

    // ---- JWT payload utilities ----
    function decodeJwtPayload(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        try { return JSON.parse(atob(parts[1])); } catch { return null; }
    }
    function tokenHasSub(token) {
        const p = decodeJwtPayload(token);
        if (!p) return false;
        const candidates = [
            'sub', 'nameid', 'nameId', 'nameID', 'NameId',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ];
        return candidates.some(k => p[k] != null && p[k] !== '');
    }

    async function fetchProfile() {
        await waitForAuthReady();
        const debugOn = !!(window.memberCenter && window.memberCenter.debugProfile);
        const dbg = (...m) => { if (debugOn) log('[profile]', ...m); };
        let headers = await buildAuthHeaders(false);
        if (debugOn && headers.Authorization) {
            try { dbg('token payload', decodeJwtPayload(headers.Authorization.replace(/^Bearer\s+/, ''))); } catch { }
        }
        // 第一次打
        let res = await fetch(PROFILE_API + '?_=' + Date.now(), { method: 'GET', headers, credentials: 'include' });
        if (res.status === 401) {
            dbg('401 -> refresh retry');
            const ok = await ensureRefreshed();
            if (ok) { headers = await buildAuthHeaders(false); res = await fetch(PROFILE_API + '?_=' + Date.now(), { method: 'GET', headers, credentials: 'include' }); }
        }
        if (!res.ok) { let body = ''; try { body = await res.text(); } catch { } dbg('fail', res.status, body.slice(0, 200)); throw new Error('讀取失敗(' + res.status + ')'); }
        const json = await res.json();
        dbg('ok keys', Object.keys(json || {}));
        return json;
    }

    // 共用：建構帶權杖/防偽標頭（支援可選 Content-Type）
    async function buildAuthHeaders(json = false) {
        await waitForAuthReady();
        let token = getAccessToken();
        if (!token) { try { await ensureRefreshed(); token = getAccessToken(); } catch { } }
        const headers = { 'Accept': 'application/json' };
        if (json) headers['Content-Type'] = 'application/json';
        const xsrf = getXsrf();
        if (xsrf) { headers['X-XSRF-TOKEN'] = xsrf; headers['RequestVerificationToken'] = xsrf; }
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    // 共用 GET JSON（給城市/鄉鎮）
    async function apiGetJson(url) {
        await waitForAuthReady();
        let token = getAccessToken();
        if (!token) { try { await ensureRefreshed(); token = getAccessToken(); } catch { } }
        const headers = { 'Accept': 'application/json' };
        const xsrf = getXsrf();
        if (xsrf) { headers['X-XSRF-TOKEN'] = xsrf; headers['RequestVerificationToken'] = xsrf; }
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { headers, credentials: 'include' });
        if (res.status === 401) {
            const ok = await ensureRefreshed();
            if (ok) {
                const nt = getAccessToken();
                if (nt) headers['Authorization'] = 'Bearer ' + nt;
                return apiGetJson(url); // retry 一次
            }
        }
        if (!res.ok) throw new Error('API 失敗(' + res.status + ')');
        try { return await res.json(); } catch { return null; }
    }

    // 載入所有縣市
    async function loadCities(selectedId) {
        const sel = document.getElementById('profileCity');
        if (!sel) return;
        if (citiesCache && citiesCache.length) {
            renderCityOptions(sel, citiesCache, selectedId);
            return;
        }
        sel.disabled = true;
        try {
            const data = await apiGetJson(LOCATION_BASE + '/cities');
            // 彈性解析: 可能是陣列字串或物件
            let list = [];
            if (Array.isArray(data)) list = data;
            else if (data && Array.isArray(data.items)) list = data.items;
            citiesCache = list.map(c => ({
                id: c.id ?? c.cityId ?? c.value ?? c.code ?? c.Id ?? c.CityId,
                name: c.name ?? c.cityName ?? c.text ?? c.label ?? c.Name ?? c.CityName
            })).filter(c => c.id && c.name);
            renderCityOptions(sel, citiesCache, selectedId);
        } catch (e) {
            log('loadCities error', e);
            if (!sel.querySelector('option[value=""]')) { const opt = document.createElement('option'); opt.value = ''; opt.textContent = '--'; sel.appendChild(opt); }
        } finally { sel.disabled = false; }
    }

    function renderCityOptions(sel, list, selectedId) {
        if (!sel) return;
        const current = sel.value;
        const keepSelected = selectedId ?? current;
        sel.innerHTML = '<option value="">請選擇</option>' + list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (keepSelected && sel.querySelector(`option[value="${keepSelected}"]`)) sel.value = keepSelected;
    }

    // 載入鄉鎮（需 cityId）
    async function loadTownships(cityId, selectedId) {
        const sel = document.getElementById('profileDistrict');
        if (!sel) return;
        if (!cityId) {
            sel.innerHTML = '<option value="">請先選縣市</option>';
            sel.disabled = true;
            return;
        }
        const cacheKey = cityId;
        if (townshipCache.has(cacheKey)) {
            renderTownshipOptions(sel, townshipCache.get(cacheKey), selectedId);
            return;
        }
        sel.disabled = true;
        sel.innerHTML = '<option value="">載入中...</option>';
        try {
            const data = await apiGetJson(LOCATION_BASE + '/townships?cityId=' + encodeURIComponent(cityId));
            let list = [];
            if (Array.isArray(data)) list = data;
            else if (data && Array.isArray(data.items)) list = data.items;
            const mapped = list.map(t => ({
                id: t.id ?? t.townshipId ?? t.value ?? t.code ?? t.Id ?? t.TownshipId,
                name: t.name ?? t.townshipName ?? t.text ?? t.label ?? t.Name ?? t.TownshipName
            })).filter(t => t.id && t.name);
            townshipCache.set(cacheKey, mapped);
            renderTownshipOptions(sel, mapped, selectedId);
        } catch (e) {
            log('loadTownships error', e);
            sel.innerHTML = '<option value="">載入失敗</option>';
        } finally { sel.disabled = false; }
    }

    function renderTownshipOptions(sel, list, selectedId) {
        if (!sel) return;
        const current = sel.value;
        const keepSelected = selectedId ?? current;
        sel.innerHTML = '<option value="">請選擇</option>' + list.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        if (keepSelected && sel.querySelector(`option[value="${keepSelected}"]`)) sel.value = keepSelected;
        sel.disabled = false;
    }

    // ========== 更新資料 (PUT /api/member/profile) ==========
    let saving = false;
    function collectFormPayload() {
        const name = (document.getElementById('profileName')?.value || '').trim();
        const phone = (document.getElementById('profilePhone')?.value || '').trim();
        const cityIdRaw = document.getElementById('profileCity')?.value || '';
        const townshipIdRaw = document.getElementById('profileDistrict')?.value || '';
        const address = (document.getElementById('profileAddressDetail')?.value || '').trim();
        const cityId = cityIdRaw === '' ? null : (isNaN(Number(cityIdRaw)) ? cityIdRaw : Number(cityIdRaw));
        const townshipId = townshipIdRaw === '' ? null : (isNaN(Number(townshipIdRaw)) ? townshipIdRaw : Number(townshipIdRaw));
        return { name, phone, cityId, townshipId, address };
    }

    function payloadChanged(pOld, payload) {
        if (!pOld) return true;
        return (
            (payload.name ?? '') !== (pOld.Name ?? '') ||
            (payload.phone ?? '') !== (pOld.Phone ?? '') ||
            (payload.cityId ?? null) != (pOld.CityId ?? null) ||
            (payload.townshipId ?? null) != (pOld.TownshipId ?? null) ||
            (payload.address ?? '') !== (pOld.Address ?? '')
        );
    }

    async function updateProfile() {
        if (saving) return;
        const debugOn = !!(window.memberCenter && window.memberCenter.debugProfile);
        const dbg = (...m) => { if (debugOn) log('[update]', ...m); };
        const statusEl = document.getElementById('profileSaveStatus');
        const btn = document.querySelector('#formProfile button[type="submit"]');
        const payload = collectFormPayload();
        const current = window.memberCenter?.profile;
        if (!payload.name) { if (statusEl) statusEl.textContent = '姓名必填'; return; }
        if (!payloadChanged(current, payload)) { if (statusEl) statusEl.textContent = '沒有變更'; return; }
        saving = true; if (statusEl) statusEl.textContent = '';
        if (btn) {
            btn.disabled = true;
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>儲存中...';
        }
        try {
            let headers = await buildAuthHeaders(true);
            let res = await fetch(PROFILE_API, { method: 'PUT', headers, credentials: 'include', body: JSON.stringify(payload) });
            if (res.status === 401) {
                dbg('401 -> refresh retry');
                const ok = await ensureRefreshed();
                if (ok) { headers = await buildAuthHeaders(true); res = await fetch(PROFILE_API, { method: 'PUT', headers, credentials: 'include', body: JSON.stringify(payload) }); }
            }
            if (!res.ok) { let body = ''; try { body = await res.text(); } catch { } dbg('fail', res.status, body.slice(0, 200)); if (statusEl) statusEl.textContent = '儲存失敗(' + res.status + ')'; return; }
            let updated = null; try { updated = await res.json(); } catch { }
            if (updated) fill(updated); else if (current) { current.Name = payload.name; current.Phone = payload.phone; current.CityId = payload.cityId; current.TownshipId = payload.townshipId; current.Address = payload.address; completeness(); }
            if (statusEl) { statusEl.textContent = '已儲存'; }
        } catch (e) { if (statusEl) statusEl.textContent = '錯誤:' + (e.message || '無法儲存'); dbg('exception', e); }
        finally { saving = false; if (btn) { btn.disabled = false; if (btn.dataset.originalHtml) { btn.innerHTML = btn.dataset.originalHtml; delete btn.dataset.originalHtml; } else { btn.textContent = '儲存變更'; } } }
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
        // 載入城市與鄉鎮（若 profile 有既存資料）
        (async () => {
            try {
                await loadCities(p.CityId || p.City);
                if (p.CityId || p.City) {
                    const cityValue = p.CityId || p.City; // cityId 優先
                    await loadTownships(cityValue, p.TownshipId || p.Township);
                }
            } catch (e) { log('prefill location error', e); }
        })();

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
    function bindFields() {
        const handler = e => { const id = e.target && e.target.id; if (id && /^profile(Name|Phone|City|District|AddressDetail)$/.test(id)) completeness(); };
        document.addEventListener('input', handler);
        document.addEventListener('change', handler);
        // 城市改變 -> 重載鄉鎮並清空地址明細
        const citySel = document.getElementById('profileCity');
        if (citySel) {
            citySel.addEventListener('change', async () => {
                const cityId = citySel.value || '';
                await loadTownships(cityId, null);
                const distSel = document.getElementById('profileDistrict');
                if (distSel) distSel.value = '';
                const addr = document.getElementById('profileAddressDetail');
                if (addr) addr.value = '';
                completeness();
            });
        }
        const form = document.getElementById('formProfile');
        if (form) {
            form.addEventListener('submit', e => { e.preventDefault(); updateProfile(); });
        }
    }

    function initCore() { if (document.getElementById('formProfile')) { bindTab(); bindFields(); /* 初次不立即載入城市，待使用者開啟或 profile 填入 */ } }

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

    function init() { if (document.getElementById('formProfile')) { setInitialPlaceholders(); initCore(); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    try { window.memberCenter = window.memberCenter || {}; window.memberCenter.loadProfile = loadProfile; window.memberCenter.updateProfile = updateProfile; } catch { }
})();
