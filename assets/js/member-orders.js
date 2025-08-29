// member-orders.js
// 訂單列表與統計模組：負責載入 /api/Orders/user、渲染列表、更新概覽快捷卡與統計
// 依賴：auth.js (auth.apiFetch)、jQuery、formatDateTime (由頁面內定義)、Bootstrap (可選)

(function (global) {
    const state = {
        allOrders: [],
        loading: false,
        lastLoadedAt: null,
        page: 1,
        pageSize: 6,
        currentFilter: 'all'
    };

    // ---- Mock 設定 ----
    const USE_MOCK = true; // 依需求改成 false 即可再啟用真實 API
    const MOCK_ORDERS = [
        // 今日產生的最近訂單（模擬使用者剛下單 / 待付款）
        { Id: 201, OrderNumber: 'O202508290015', TotalAmount: 1280, CreatedAt: new Date(Date.now() - 1000 * 60 * 15), Status: '待付款', StatusId: 1 },
        { Id: 202, OrderNumber: 'O202508290014', TotalAmount: 2860, CreatedAt: new Date(Date.now() - 1000 * 60 * 35), Status: '待出貨', StatusId: 2 },
        { Id: 203, OrderNumber: 'O202508290013', TotalAmount: 450, CreatedAt: new Date(Date.now() - 1000 * 60 * 55), Status: '待出貨', StatusId: 2 },
        { Id: 204, OrderNumber: 'O202508290012', TotalAmount: 999, CreatedAt: new Date(Date.now() - 1000 * 60 * 90), Status: '已出貨', StatusId: 3 },
        // 昨日訂單（已出貨 -> 準備成為待收貨）
        { Id: 205, OrderNumber: 'O202508280011', TotalAmount: 3499, CreatedAt: new Date(Date.now() - 86400000 * 1 - 1000 * 60 * 30), Status: '已出貨', StatusId: 3 },
        // 前日已完成
        { Id: 206, OrderNumber: 'O202508270010', TotalAmount: 220, CreatedAt: new Date(Date.now() - 86400000 * 2 - 1000 * 60 * 10), Status: '已完成', StatusId: 4 },
        // 取消紀錄（模擬使用者取消）
        { Id: 207, OrderNumber: 'O202508260009', TotalAmount: 790, CreatedAt: new Date(Date.now() - 86400000 * 3 - 1000 * 60 * 5), Status: '已取消', StatusId: 5 },
        // 退貨流程（進行中與已退貨）
        { Id: 208, OrderNumber: 'O202508250008', TotalAmount: 1500, CreatedAt: new Date(Date.now() - 86400000 * 4 - 1000 * 60 * 45), Status: '退貨中', StatusId: 6 },
        { Id: 209, OrderNumber: 'O202508240007', TotalAmount: 1500, CreatedAt: new Date(Date.now() - 86400000 * 5), Status: '已退貨', StatusId: 7 },
        // 再多一些歷史紀錄（分布不同金額與狀態）
        { Id: 210, OrderNumber: 'O202508230006', TotalAmount: 560, CreatedAt: new Date(Date.now() - 86400000 * 6), Status: '已完成', StatusId: 4 },
        { Id: 211, OrderNumber: 'O202508220005', TotalAmount: 2300, CreatedAt: new Date(Date.now() - 86400000 * 7), Status: '已完成', StatusId: 4 },
        { Id: 212, OrderNumber: 'O202508210004', TotalAmount: 1880, CreatedAt: new Date(Date.now() - 86400000 * 8), Status: '已出貨', StatusId: 3 },
        { Id: 213, OrderNumber: 'O202508200003', TotalAmount: 420, CreatedAt: new Date(Date.now() - 86400000 * 9), Status: '已取消', StatusId: 5 },
        { Id: 214, OrderNumber: 'O202508190002', TotalAmount: 3200, CreatedAt: new Date(Date.now() - 86400000 * 10), Status: '已完成', StatusId: 4 },
        { Id: 215, OrderNumber: 'O202508180001', TotalAmount: 999, CreatedAt: new Date(Date.now() - 86400000 * 11), Status: '已完成', StatusId: 4 }
    ];

    // 固定使用 7104 後端 API 來源
    const ORDER_ENDPOINT = 'https://localhost:7104/api/Orders/user';

    const badgeClassMap = {
        '待付款': 'badge rounded-pill bg-gradient bg-warning text-dark fw-semibold order-badge-pay',
        '待出貨': 'badge rounded-pill bg-info text-dark fw-semibold order-badge-ship',
        '已出貨': 'badge rounded-pill bg-primary fw-semibold order-badge-shipped',
        '已完成': 'badge rounded-pill bg-success fw-semibold order-badge-done',
        '已取消': 'badge rounded-pill bg-secondary fw-semibold order-badge-cancel',
        '退貨中': 'badge rounded-pill bg-danger fw-semibold order-badge-refund',
        '已退貨': 'badge rounded-pill bg-dark fw-semibold order-badge-refunded'
    };

    function normalizeOrder(o) {
        if (!o) return null;
        // 取得原始 ID（字串顯示）與數字 ID（供 mock 用，避免 NaN）
        const rawId = o.id ?? o.orderId ?? o.OrderId ?? o.Id ?? o.number ?? o.No ?? o.NO;
        let numId = o.Id ?? o.id ?? o.orderId ?? o.OrderId;
        numId = Number(numId);
        if (isNaN(numId)) {
            // 從字串抽出數字
            const m = String(rawId || '').match(/(\d{1,})/);
            if (m) numId = Number(m[1]);
        }
        if (isNaN(numId)) numId = Math.floor(Math.random() * 9000) + 100; // 保底不重複太小
        const status = o.status || o.Status || o.orderStatus || o.OrderStatus || '未知';
        const total = o.total || o.Total || o.totalAmount || o.TotalAmount || o.amount || o.Amount || 0;
        const created = o.createdAt || o.CreatedAt || o.createTime || o.CreateTime || o.createdDate || o.CreatedDate || o.date || o.Date;
        const dateFmt = (typeof formatDateTime === 'function') ? formatDateTime(created) : created;
        return { id: rawId || '--', status, total, date: dateFmt, raw: o, _idForMock: numId };
    }

    async function fetchOrders() {
        if (state.loading) return;
        state.loading = true;
        $('#ordersList').html('<div class="text-muted">載入中...</div>');
        if (USE_MOCK) {
            // 直接使用假資料
            setTimeout(() => { // 模擬延遲
                state.allOrders = MOCK_ORDERS.map(normalizeOrder);
                state.lastLoadedAt = Date.now();
                state.loading = false;
                render();
                logDebug('[mock] loaded ' + state.allOrders.length + ' orders');
            }, 300);
            return;
        }
        try {
            let res = await doFetchWithAuth(ORDER_ENDPOINT);
            if (res.status === 401) {
                // 嘗試 refresh
                if (auth.ensureRefreshed) {
                    try { await auth.ensureRefreshed(); } catch { }
                    res = await doFetchWithAuth(ORDER_ENDPOINT);
                }
            }
            const rawText = await res.text();
            logDebug('[fetchOrders] status=' + res.status + '\n' + rawText);
            if (!res.ok) {
                // 若 500，嘗試使用 auth.apiFetch 的繞路（/../Orders/user）再試一次
                if (res.status === 500 && auth && typeof auth.apiFetch === 'function') {
                    logDebug('[fetchOrders] primary 500, try fallback auth.apiFetch(/../Orders/user)');
                    try {
                        let alt = await auth.apiFetch('/../Orders/user', { method: 'GET' });
                        const altText = await alt.text();
                        logDebug('[fallback] status=' + alt.status + '\n' + altText);
                        if (alt.ok) {
                            let altJson; try { altJson = altText ? JSON.parse(altText) : []; } catch (e) { throw new Error('fallback JSON parse error: ' + e.message); }
                            if (!Array.isArray(altJson)) throw new Error('fallback response not array');
                            state.allOrders = altJson.map(normalizeOrder).filter(Boolean);
                            state.lastLoadedAt = Date.now();
                            state.loading = false;
                            render();
                            return;
                        }
                    } catch (fe) {
                        logDebug('[fallback][error] ' + (fe && fe.message));
                    }
                }
                throw new Error('HTTP ' + res.status + ' body=' + rawText.slice(0, 500));
            }
            let data;
            try { data = rawText ? JSON.parse(rawText) : []; } catch (e) { throw new Error('JSON parse error: ' + e.message); }
            if (!Array.isArray(data)) throw new Error('response not array');
            state.allOrders = data.map(normalizeOrder).filter(Boolean);
            state.lastLoadedAt = Date.now();
        } catch (e) {
            console.warn('fetchOrders failed', e);
            state.allOrders = [];
            const tokenPart = safeTokenPreview();
            const msg = (e && e.message) ? e.message : String(e);
            $('#ordersList').html('<div class="text-danger">訂單讀取失敗：' + escHtml(msg) + '</div>' + (tokenPart ? '<div class="small text-muted">Token:' + tokenPart + '</div>' : '') + '<div class="small text-muted">請按「測試載入」重試，或提供這段訊息給後端。</div>');
            updateCounters();
            logDebug('[fetchOrders][error] ' + (e && e.message ? e.message : e));
            state.loading = false;
            return;
        }
        state.loading = false;
        render();
    }

    function doFetchWithAuth(url) {
        const headers = {};
        const { token, source } = obtainToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        headers['Accept'] = 'application/json, text/plain, */*';
        logDebug('[doFetchWithAuth] ' + url + ' tokenSource=' + source + ' hasToken=' + !!token);
        return fetch(url, { method: 'GET', headers, credentials: 'include' });
    }

    function render() {
        const filterVal = $('#orderFilter').val();
        const list = state.allOrders.filter(o => filterVal === 'all' || o.status === filterVal);
        const start = (state.page - 1) * state.pageSize;
        const pageItems = list.slice(start, start + state.pageSize);
        if (!list.length) {
            $('#ordersList').html('<div class="text-center py-4"><div class="mb-2">🗂️</div><div class="text-muted">目前沒有符合條件的訂單</div></div>');
            $('#ordersPagination').html('');
        } else {
            const accId = 'ordersAccordion';
            const html = `<div class="accordion" id="${accId}">` + pageItems.map((o, i) => renderAccordionItem(o, i + start, accId)).join('') + '</div>';
            $('#ordersList').html(html);
            renderPagination(list.length);
        }
        renderStatusPills();
        updateLastUpdated();
        updateCounters();
    }

    function renderAccordionItem(o, idx, accId) {
        const headingId = `ord-h-${idx}`;
        const collapseId = `ord-c-${idx}`;
        const badgeCls = badgeClassMap[o.status] || 'badge bg-light text-dark';
        // 模擬細節內容（未來可改由單筆 API 取得）
        const details = [
            ['訂單編號', o.id],
            ['顯示單號', o.raw?.OrderNumber || o.id],
            ['狀態', o.status],
            ['下單時間', o.date],
            ['商品數', mockItemCount(o)],
            ['付款方式', mockPayment(o)],
            ['付款狀態', mockPayStatus(o)],
            ['商品金額', formatCurrency(o.total)],
            ['折扣', mockDiscount(o)],
            ['運費', mockShippingFee(o)],
            ['應付金額', formatCurrency(o.total + mockShippingFeeNum(o) - mockDiscountNum(o))],
            ['物流方式', mockLogistics(o)],
            ['出貨單號', mockTracking(o)],
            ['收件人', mockReceiver(o)],
            ['收件地址', mockAddress(o)],
            ['備註', mockNote(o)]
        ].map(r => `<tr><th class=\"text-nowrap fw-normal text-secondary small\" style=\"width:100px;\">${r[0]}</th><td class=\"small\">${r[1]}</td></tr>`).join('');
        return `<div class="accordion-item">
    <h2 class="accordion-header" id="${headingId}">
            <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                <div class="d-flex flex-column flex-lg-row w-100 align-items-lg-center gap-3 order-row-head">
                    <span class="${badgeCls} order-head-status flex-shrink-0">${o.status}</span>
                    <span class="fw-semibold order-head-number">${o.raw?.OrderNumber || o.id}</span>
                    <span class="order-head-amount">${formatCurrency(o.total)}</span>
                    <span class="ms-lg-auto text-muted order-head-time">${o.date}</span>
            </div>
        </button>
    </h2>
    <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headingId}" data-bs-parent="#${accId}">
            <div class="accordion-body py-3">
            <div class="table-responsive">
                <table class="table table-sm align-middle mb-2 order-detail-table">${details}</table>
            </div>
            <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-outline-secondary btn-sm" data-action="print" data-order-id="${o.id}"><i class="bi bi-printer"></i> 列印</button>
                <button class="btn btn-outline-secondary btn-sm" data-action="repeat" data-order-id="${o.id}"><i class="bi bi-arrow-repeat"></i> 再買一次</button>
            </div>
        </div>
    </div>
</div>`;
    }

    function baseId(o) { return (o && typeof o._idForMock === 'number') ? o._idForMock : 1; }
    function mockPayment(o) {
        const methods = ['信用卡一次付清', '信用卡分期', '貨到付款', 'LinePay', 'ATM 轉帳', '超商代碼', '行動支付'];
        const id = baseId(o); return methods[id % methods.length];
    }
    function mockItemCount(o) { const id = baseId(o); return (id % 4) + 1; }
    function mockNote(o) {
        if (o.status === '退貨中') return '等待物流回收';
        if (o.status === '已退貨') return '退款審核中';
        if (o.status === '待付款') return '請於 24 小時內完成付款';
        return '-';
    }
    function mockPayStatus(o) {
        if (o.status === '待付款') return '未付款';
        if (['已出貨', '待出貨'].includes(o.status)) return '已付款';
        if (['已完成', '退貨中', '已退貨'].includes(o.status)) return '已結案';
        if (o.status === '已取消') return '已取消';
        return '—';
    }
    function mockDiscountNum(o) { const id = baseId(o); return (id % 3 === 0) ? 100 : 0; }
    function mockDiscount(o) { const v = mockDiscountNum(o); return v ? ('-' + formatCurrency(v)) : '—'; }
    function mockShippingFeeNum(o) { return (o.total > 1000) ? 0 : 80; }
    function mockShippingFee(o) { return mockShippingFeeNum(o) ? formatCurrency(mockShippingFeeNum(o)) : '免運'; }
    function mockLogistics(o) { const arr = ['宅配 / 新竹物流', '超商取貨 / 7-11', '宅配 / 黑貓', '郵局掛號', '宅配 / 宅配通']; const id = baseId(o); return arr[id % arr.length]; }
    function mockTracking(o) { if (!['已出貨', '已完成', '退貨中', '已退貨'].includes(o.status)) return '—'; const id = baseId(o); return 'T' + String(id).padStart(8, '0'); }
    function mockReceiver(o) { const names = ['王小明', '林小華', '陳大同', '張美玲', '李佳蓉', '黃志強', '吳佩佩']; const id = baseId(o); return names[id % names.length]; }
    function mockAddress(o) { const bases = ['台北市信義區松仁路99號12樓', '新北市板橋區文化路一段10號3樓', '桃園市中壢區中正路123號5F', '台中市西屯區河南路二段8號', '高雄市前鎮區中華五路80號22F', '新竹市東區光復路一段300號', '台南市東區青年路100號']; const id = baseId(o); return bases[id % bases.length]; }
    function formatCurrency(v) { try { return 'NT$' + Number(v || 0).toLocaleString('zh-TW'); } catch { return 'NT$' + v; } }

    function renderPagination(total) {
        const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
        if (totalPages === 1) { $('#ordersPagination').html(''); return; }
        const items = [];
        function pageLi(p, text, disabled = false, active = false) {
            return `<li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}"><a class="page-link" href="#" data-page="${p}">${text}</a></li>`;
        }
        items.push(pageLi(state.page - 1, '«', state.page === 1));
        for (let p = 1; p <= totalPages; p++) {
            if (totalPages > 7) { // 簡化顯示
                if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 1) { items.push(pageLi(p, p, false, p === state.page)); }
                else if (p === 2 && state.page > 3) { items.push('<li class="page-item disabled"><span class="page-link">…</span></li>'); }
                else if (p === totalPages - 1 && state.page < totalPages - 2) { items.push('<li class="page-item disabled"><span class="page-link">…</span></li>'); }
            } else { items.push(pageLi(p, p, false, p === state.page)); }
        }
        items.push(pageLi(state.page + 1, '»', state.page === totalPages));
        $('#ordersPagination').html(items.join(''));
    }

    function renderStatusPills() {
        const container = $('#orderStatusPills');
        if (!container.length) return;
        const statuses = ['all', '待付款', '待出貨', '已出貨', '已完成', '已取消', '退貨中', '已退貨'];
        const counts = {};
        statuses.forEach(s => counts[s] = 0);
        state.allOrders.forEach(o => { const k = o.status; if (counts[k] != null) counts[k]++; counts['all']++; });
        const html = statuses.map(s => {
            const active = (state.currentFilter === s);
            const label = (s === 'all' ? '全部' : s);
            return `<button type="button" class="btn btn-xs btn-status-pill ${active ? 'active' : ''}" data-status="${s}">${label}<span class="ms-1 badge bg-light text-dark">${counts[s]}</span></button>`;
        }).join('');
        container.html(html);
    }

    function updateLastUpdated() {
        const el = $('#ordersLastUpdated');
        if (!el.length) return;
        if (!state.lastLoadedAt) { el.text(''); return; }
        const d = new Date(state.lastLoadedAt);
        el.text('更新：' + d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
    }

    function updateCounters() {
        const counts = { unpaid: 0, toShip: 0, shipped: 0 };
        state.allOrders.forEach(o => {
            if (o.status === '待付款') counts.unpaid++;
            else if (o.status === '待出貨') counts.toShip++;
            else if (o.status === '已出貨') counts.shipped++; // 視為待收貨
        });
        $('#statOrders').text(counts.shipped);
        $('#qaOrderUnpaid').text(counts.unpaid);
        $('#qaOrderToShip').text(counts.toShip);
        $('#qaOrderReceive').text(counts.shipped);
        $('.qa-order-unpaid, .qa-order-toship, .qa-order-receive').each(function () {
            const idMap = { 'qa-order-unpaid': counts.unpaid, 'qa-order-toship': counts.toShip, 'qa-order-receive': counts.shipped };
            const cls = Array.from(this.classList).find(c => idMap[c] !== undefined);
            if (cls && idMap[cls] === 0) $(this).addClass('dimmed'); else $(this).removeClass('dimmed');
        });
    }

    function bindEvents() {
        $('#orderFilter').on('change', () => { state.currentFilter = $('#orderFilter').val(); state.page = 1; render(); });
        $('#btnReloadOrders').on('click', () => { smoothReload(); });
        $(document).on('click', '#ordersPagination a[data-page]', function (e) { e.preventDefault(); const p = parseInt(this.getAttribute('data-page'), 10); if (!isNaN(p)) { state.page = p; render(); } });
        $(document).on('click', '.btn-status-pill', function () { const st = this.getAttribute('data-status'); state.currentFilter = st; $('#orderFilter').val(st); state.page = 1; render(); });
        // 快捷卡點擊（英文鍵映射到中文狀態值後刷新）
        $(document).on('click keypress', '.quick-action-card[data-order-filter]', function (e) {
            if (e.type === 'keypress' && e.key !== 'Enter' && e.key !== ' ') return;
            const key = this.getAttribute('data-order-filter');
            const map = { unpaid: '待付款', toShip: '待出貨', shipped: '已出貨' };
            const val = map[key] || 'all';
            $('#orderFilter').val(val);
            render();
            const tabBtn = document.querySelector('button[data-bs-target="#pane-orders"]');
            if (tabBtn) { if (window.bootstrap) window.bootstrap.Tab.getOrCreateInstance(tabBtn).show(); else tabBtn.click(); }
        });
        // 單筆訂單詳情（預留）
        $(document).on('click', '#ordersList a[data-order-id]', function (e) {
            e.preventDefault();
            const orderId = this.getAttribute('data-order-id');
            // 可在此呼叫 fetchOrderDetail(orderId)
            console.debug('order clicked', orderId);
        });
    }

    async function init() {
        bindEvents();
        await fetchOrders();
    }

    function logDebug(msg) { /* debug 移除：保留空函式避免呼叫錯誤 */ }

    function escHtml(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
    function safeTokenPreview() { return ''; }

    function smoothReload() {
        if (state.loading) return;
        const placeholder = skeletonBlocks(3);
        $('#ordersList').html(placeholder);
        fetchOrders();
    }

    function skeletonBlocks(n) {
        return '<div class="accordion">' + Array.from({ length: n }).map((_, i) => `<div class="accordion-item skeleton">
                        <h2 class="accordion-header"><div class="accordion-button disabled placeholder-glow py-2">
                            <span class="placeholder col-3 me-3"></span>
                            <span class="placeholder col-2 me-auto"></span>
                            <span class="placeholder col-1"></span>
                        </div></h2>
                    </div>`).join('') + '</div>';
    }
    function obtainToken() {
        // 順序：auth 模組記憶體 > localStorage.token > localStorage.accessToken
        try {
            if (auth.getAccessToken) {
                const at = auth.getAccessToken();
                if (at) return { token: at, source: 'authMemory' };
            }
        } catch { }
        try {
            const lsTk = localStorage.getItem('token');
            if (lsTk) return { token: lsTk, source: 'localStorage.token' };
            const lsAt = localStorage.getItem('accessToken');
            if (lsAt) return { token: lsAt, source: 'localStorage.accessToken' };
        } catch { }
        return { token: null, source: 'none' };
    }

    global.memberOrders = { init, fetchOrders, render };
})(window);
