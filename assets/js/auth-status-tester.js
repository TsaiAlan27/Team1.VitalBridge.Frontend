// auth-status-tester.js
// 簡易登入狀態測試工具：可自動顯示「已登入/未登入」，也可指定容器渲染或主動呼叫檢查。
// 依賴 /assets/js/auth.js 暴露的 window.auth（waitReady/me/getAccessToken）。
(function () {
    'use strict';

    // 等待 auth 初始化完成（最多 timeoutMs 毫秒）
    function waitAuthReady(timeoutMs = 2000) {
        return new Promise(function (resolve) {
            // 已經有 window.auth 且具有 waitReady
            if (window.auth && typeof window.auth.waitReady === 'function') {
                var done = false;
                var timer = setTimeout(function () { if (!done) { done = true; resolve(); } }, timeoutMs);
                window.auth.waitReady().then(function () { if (!done) { done = true; clearTimeout(timer); resolve(); } })
                    .catch(function () { if (!done) { done = true; clearTimeout(timer); resolve(); } });
                return;
            }
            // 等 vb:auth-ready 事件或逾時
            var finished = false;
            function finish() { if (finished) return; finished = true; resolve(); }
            var to = setTimeout(finish, timeoutMs);
            try { window.addEventListener('vb:auth-ready', function () { clearTimeout(to); finish(); }, { once: true }); } catch { setTimeout(finish, 0); }
        });
    }

    async function getLoginStatus() {
        await waitAuthReady(2000);
        var haveToken = false;
        try { haveToken = !!(window.auth && typeof window.auth.getAccessToken === 'function' && window.auth.getAccessToken()); } catch { }
        // 嘗試取得使用者（若未登入會 401）
        try {
            if (window.auth && typeof window.auth.me === 'function') {
                var user = await window.auth.me();
                return { ready: true, loggedIn: true, user: user || null, hasToken: !!haveToken };
            }
        } catch (e) {
            // 401 視為未登入；其他錯誤則記錄
            var status = (e && e.status) || null;
            if (status === 401) return { ready: true, loggedIn: false, user: null, hasToken: !!haveToken };
            console.warn('[AuthStatusTester] me() error:', e);
            return { ready: true, loggedIn: false, user: null, hasToken: !!haveToken, error: e };
        }
        // 沒有 window.auth.me 可呼叫時，依 token 粗略判斷
        return { ready: true, loggedIn: !!haveToken, user: null, hasToken: !!haveToken };
    }

    function createPanel() {
        var panel = document.createElement('div');
        panel.id = 'vb-auth-test-panel';
        panel.style.position = 'fixed';
        panel.style.right = '12px';
        panel.style.bottom = '12px';
        panel.style.zIndex = '2147483000';
        panel.style.background = 'rgba(0,0,0,0.75)';
        panel.style.color = '#fff';
        panel.style.padding = '10px 12px';
        panel.style.borderRadius = '8px';
        panel.style.fontSize = '13px';
        panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        panel.style.maxWidth = '320px';

        var title = document.createElement('div');
        title.textContent = 'Auth 狀態';
        title.style.fontWeight = '600';
        title.style.marginBottom = '6px';
        panel.appendChild(title);

        var body = document.createElement('div');
        body.id = 'vb-auth-test-body';
        body.textContent = '檢查中...';
        panel.appendChild(body);

        var actions = document.createElement('div');
        actions.style.marginTop = '8px';
        actions.style.display = 'flex';
        actions.style.gap = '6px';

        var refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.textContent = '重新檢查';
        refreshBtn.style.background = '#0d6efd';
        refreshBtn.style.color = '#fff';
        refreshBtn.style.border = 'none';
        refreshBtn.style.borderRadius = '4px';
        refreshBtn.style.padding = '4px 8px';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.addEventListener('click', function () { window.AuthStatusTester && window.AuthStatusTester.render(); });

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '關閉';
        closeBtn.style.background = '#6c757d';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.padding = '4px 8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', function () { panel.remove(); });

        actions.appendChild(refreshBtn);
        actions.appendChild(closeBtn);
        panel.appendChild(actions);

        // API 測試區塊
        var apiRow = document.createElement('div');
        apiRow.style.marginTop = '8px';
        var testApiFetchBtn = document.createElement('button');
        testApiFetchBtn.type = 'button';
        testApiFetchBtn.textContent = '測試 /me (apiFetch)';
        testApiFetchBtn.style.background = '#198754';
        testApiFetchBtn.style.color = '#fff';
        testApiFetchBtn.style.border = 'none';
        testApiFetchBtn.style.borderRadius = '4px';
        testApiFetchBtn.style.padding = '4px 8px';
        testApiFetchBtn.style.cursor = 'pointer';
        testApiFetchBtn.style.marginRight = '6px';
        testApiFetchBtn.addEventListener('click', function () { window.AuthStatusTester && window.AuthStatusTester.call('/me', { method: 'GET' }, false); });

        var testAuthedFetchBtn = document.createElement('button');
        testAuthedFetchBtn.type = 'button';
        testAuthedFetchBtn.textContent = '測試 /me (authedFetch)';
        testAuthedFetchBtn.style.background = '#20c997';
        testAuthedFetchBtn.style.color = '#00332b';
        testAuthedFetchBtn.style.border = 'none';
        testAuthedFetchBtn.style.borderRadius = '4px';
        testAuthedFetchBtn.style.padding = '4px 8px';
        testAuthedFetchBtn.style.cursor = 'pointer';
        testAuthedFetchBtn.addEventListener('click', function () { window.AuthStatusTester && window.AuthStatusTester.call('/me', { method: 'GET' }, true); });

        var apiResult = document.createElement('div');
        apiResult.id = 'vb-auth-test-api-result';
        apiResult.style.marginTop = '6px';
        apiResult.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        apiResult.style.fontSize = '12px';
        apiResult.style.whiteSpace = 'pre-wrap';

        apiRow.appendChild(testApiFetchBtn);
        apiRow.appendChild(testAuthedFetchBtn);

        // getAllNotify 測試按鈕
        var testNotifyApiFetchBtn = document.createElement('button');
        testNotifyApiFetchBtn.type = 'button';
        testNotifyApiFetchBtn.textContent = '測試 /getAllNotify (apiFetch)';
        testNotifyApiFetchBtn.style.background = '#6f42c1';
        testNotifyApiFetchBtn.style.color = '#fff';
        testNotifyApiFetchBtn.style.border = 'none';
        testNotifyApiFetchBtn.style.borderRadius = '4px';
        testNotifyApiFetchBtn.style.padding = '4px 8px';
        testNotifyApiFetchBtn.style.cursor = 'pointer';
        testNotifyApiFetchBtn.style.marginLeft = '6px';
        testNotifyApiFetchBtn.addEventListener('click', function () { window.AuthStatusTester && window.AuthStatusTester.call('/getAllNotify', { method: 'GET' }, false); });

        var testNotifyAuthedFetchBtn = document.createElement('button');
        testNotifyAuthedFetchBtn.type = 'button';
        testNotifyAuthedFetchBtn.textContent = '測試 /getAllNotify (authedFetch)';
        testNotifyAuthedFetchBtn.style.background = '#ffc107';
        testNotifyAuthedFetchBtn.style.color = '#3b2f00';
        testNotifyAuthedFetchBtn.style.border = 'none';
        testNotifyAuthedFetchBtn.style.borderRadius = '4px';
        testNotifyAuthedFetchBtn.style.padding = '4px 8px';
        testNotifyAuthedFetchBtn.style.cursor = 'pointer';
        testNotifyAuthedFetchBtn.style.marginLeft = '6px';
        testNotifyAuthedFetchBtn.addEventListener('click', function () { window.AuthStatusTester && window.AuthStatusTester.call('/getAllNotify', { method: 'GET' }, true); });

        apiRow.appendChild(testNotifyApiFetchBtn);
        apiRow.appendChild(testNotifyAuthedFetchBtn);
        panel.appendChild(apiRow);
        panel.appendChild(apiResult);

        document.body.appendChild(panel);
        return panel;
    }

    function ensureContainer(selector) {
        if (selector) {
            var el = (typeof selector === 'string') ? document.querySelector(selector) : selector;
            if (el) return { el: el, isPanel: false };
        }
        var panel = document.getElementById('vb-auth-test-panel') || createPanel();
        return { el: panel.querySelector('#vb-auth-test-body') || panel, isPanel: true };
    }

    function formatUser(u) {
        if (!u || typeof u !== 'object') return '';
        var name = u.Name || u.name || '';
        var email = u.Email || u.email || '';
        var parts = [];
        if (name) parts.push(name);
        if (email) parts.push('<' + email + '>');
        return parts.join(' ');
    }

    async function render(selector) {
        try {
            var target = ensureContainer(selector);
            var status = await getLoginStatus();
            var lines = [];
            lines.push('ready: ' + (status.ready ? 'yes' : 'no'));
            lines.push('loggedIn: ' + (status.loggedIn ? 'yes' : 'no'));
            lines.push('hasToken: ' + (status.hasToken ? 'yes' : 'no'));
            if (status.user) lines.push('user: ' + formatUser(status.user));
            if (status.error) lines.push('note: ' + (status.error.message || status.error.toString()));
            target.el.innerHTML = lines.join('<br/>');
        } catch (e) {
            console.error('[AuthStatusTester] render error:', e);
        }
    }

    async function call(path, opts, useAuthed) {
        try {
            await waitAuthReady(2000);
            var fn = (useAuthed && window.auth && typeof window.auth.authedFetch === 'function')
                ? window.auth.authedFetch
                : (window.auth && typeof window.auth.apiFetch === 'function' ? window.auth.apiFetch : null);
            if (!fn) throw new Error('auth API 不可用');
            var res = await fn(path, opts || {});
            var text = '';
            try { text = await res.clone().text(); } catch { text = '<no body>'; }
            var out = '# ' + (useAuthed ? 'authedFetch' : 'apiFetch') + ' ' + path + '\nstatus: ' + res.status + '\n';
            if (text) out += 'body: ' + (text.length > 600 ? text.slice(0, 600) + '... (truncated)' : text);
            var box = document.getElementById('vb-auth-test-api-result');
            if (box) { box.textContent = out; }
            else { console.log('[AuthStatusTester]\n' + out); }
            return res;
        } catch (e) {
            var msg = '[AuthStatusTester] call failed: ' + (e && e.message ? e.message : e);
            var box2 = document.getElementById('vb-auth-test-api-result');
            if (box2) { box2.textContent = msg; }
            console.error(msg);
            throw e;
        }
    }

    var autoTimer = null;
    function startAutoRefresh(intervalMs = 5000, selector) {
        stopAutoRefresh();
        autoTimer = setInterval(function () { render(selector); }, Math.max(1000, intervalMs));
    }
    function stopAutoRefresh() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

    // 導出全域 API
    window.AuthStatusTester = {
        check: getLoginStatus,
        render: render,
        call: call,
        startAutoRefresh: startAutoRefresh,
        stopAutoRefresh: stopAutoRefresh
    };

    // Auto 模式：
    // - 若頁面存在 id=auth-test 的元素，或全域設定 window.VB_AUTH_TEST_TARGET，則渲染到該元素。
    // - 否則建立右下角浮動面板顯示狀態。
    function autoRun() {
        try {
            var targetSel = window.VB_AUTH_TEST_TARGET || '#auth-test';
            var targetEl = document.querySelector(targetSel);
            if (targetEl) render(targetSel); else render();
        } catch {
            render();
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoRun);
    else autoRun();
})();
