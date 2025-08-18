// fragment-loader.js
// Minimal fragment loader for template use
(function () {
    function loadFragment(selector, url) {
        return new Promise(function (resolve, reject) {
            if (typeof $ === 'undefined') return reject(new Error('jQuery 未載入'));
            $.get(url).done(function (data) { $(selector).html(data); resolve(); }).fail(function (jqXHR, textStatus, err) { console.error('載入片段失敗:', url, textStatus || err); reject(err); });
        });
    }

    function loadIfNeeded(src) {
        if (document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('載入失敗: ' + src)); }; document.head.appendChild(s);
        });
    }

    async function init() {
        try {
            // 用絕對路徑（根目錄起算）
            var headerUrl = '/partials/header.html';
            var footerUrl = '/partials/footer.html';

            await Promise.all([
                loadFragment('.headerpage', headerUrl),
                loadFragment('.footerpage', footerUrl)
            ]);

            // hide preloader if present
            if (typeof $ !== 'undefined' && $('#preloader').length) $('#preloader').fadeOut(200);

            // ensure main.js is loaded once (allow static include instead)
            if (!window._mainLoaded) {
                await loadIfNeeded('/assets/js/main.js').catch(function (e) { console.error(e); });
                window._mainLoaded = true;
            }
            // signal readiness to page scripts
            await loadIfNeeded('/assets/js/LoadPlate.js');
            if (typeof LoadPlateByNow === 'function') LoadPlateByNow();
            try {
                window.appReadyAt = performance && performance.now ? performance.now() : Date.now();
                window.dispatchEvent(new CustomEvent('app:ready', { detail: { readyAt: window.appReadyAt } }));
            } catch (e) { /* ignore */ }
        } catch (e) {
            console.error('fragment-loader 初始化錯誤', e);
        }
    }

    if (typeof jQuery !== 'undefined') jQuery(init); else { var t = setInterval(function () { if (typeof jQuery !== 'undefined') { clearInterval(t); jQuery(init); } }, 50); }
})();
(function () {
    // 輔助：載入 script
    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + url + '"]')) return resolve(url);
            var s = document.createElement("script");
            s.src = url;
            s.onload = function () { resolve(url); };
            s.onerror = function () { reject(new Error("載入失敗: " + url)); };
            document.head.appendChild(s);
        });
    }

    // 輔助：載入 fragment（header/footer）
    function loadFragment(selector, url) {
        return new Promise(function (resolve, reject) {
            if (typeof $ === "undefined") return reject(new Error("jQuery 未載入"));
            $.get(url)
                .done(function (data) {
                    $(selector).html(data);
                    console.log("[fragment] " + url + " loaded.");
                    resolve(url);
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.error("[fragment] " + url + " load failed:", textStatus, errorThrown);
                    reject(new Error(url + " load failed: " + textStatus));
                });
        });
    }

    // 確保 vendor lib 存在
    function ensureLib(url, globalVar) {
        if (window[globalVar] !== undefined) {
            console.log("[lib] " + globalVar + " already available.");
            return Promise.resolve(globalVar);
        }
        return loadScript(url).then(function () {
            return new Promise(function (res) { setTimeout(function () { res(globalVar); }, 0); });
        });
    }

    function hidePreloader() {
        if (typeof $ !== "undefined" && $("#preloader").length) $("#preloader").fadeOut(200);
    }

    function initPlugins() {
        try { if (typeof AOS !== "undefined" && AOS.init) AOS.init(); } catch (e) { console.warn("AOS init failed", e); }
        try { if (typeof GLightbox !== "undefined" && typeof GLightbox === "function") GLightbox(); } catch (e) { console.warn("GLightbox init failed", e); }
        // 需要其他 plugin init 可在此加入
    }

    async function initPage() {
        try {
            // 同步載入 header/footer
            await Promise.all([
                loadFragment(".headerpage", "header.html"),
                loadFragment(".footerpage", "footer.html")
            ]);
            console.log("header/footer loaded.");

            hidePreloader();

            // 若你未在每頁靜態載入 AOS，可在此確保
            try { await ensureLib("assets/vendor/aos/aos.js", "AOS"); } catch (e) { console.warn("AOS load failed, continuing:", e); }

            // 載入 main.js（若還沒載入）
            if (!window._mainLoaded) {
                try {
                    await loadScript("assets/js/main.js");
                    window._mainLoaded = true;
                    console.log("assets/js/main.js loaded.");
                } catch (e) {
                    console.error("main.js load failed:", e);
                }
            }

            initPlugins();
        } catch (err) {
            console.error("fragment-loader 初始化錯誤:", err);
        }
    }

    // 全域錯誤
    window.addEventListener("error", function (e) { console.error("Runtime error:", e.message, "at", e.filename + ":" + e.lineno); });
    window.addEventListener("unhandledrejection", function (e) { console.error("Unhandled promise rejection:", e.reason); });

    // 啟動（確保 jQuery 已載入）
    if (typeof jQuery !== "undefined") {
        jQuery(function () { initPage(); });
    } else {
        // 若 jQuery 尚未載入，等 jQuery 載入後再啟動
        var checkJq = setInterval(function () {
            if (typeof jQuery !== "undefined") {
                clearInterval(checkJq);
                jQuery(function () { initPage(); });
            }
        }, 50);
    }
})();