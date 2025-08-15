
// document.addEventListener('DOMContentLoaded', async () => {
//     const slots = Array.from(document.querySelectorAll('[data-include]'));
//     const loadedSrc = new Set(); // 去重複外部腳本
//     const loadScriptSequentially = (scripts) => {
//         return scripts.reduce((p, s) => p.then(() => new Promise((resolve, reject) => {
//             const tag = document.createElement('script');

//             // 複製原 script 的屬性（包含 type="module" 等）
//             for (const { name, value } of Array.from(s.attributes)) {
//                 tag.setAttribute(name, value);
//             }

//             if (s.src) {
//                 // 外部腳本：避免重覆載入
//                 if (loadedSrc.has(s.src)) {
//                     return resolve();
//                 }
//                 loadedSrc.add(s.src);
//                 tag.onload = () => resolve();
//                 tag.onerror = () => reject(new Error(`Failed to load ${s.src}`));
//                 tag.src = s.src;
//                 // 建議插到 <head>，避免干擾版面
//                 (document.head || document.body).appendChild(tag);
//             } else {
//                 // 內嵌腳本：保留原內容（包含 type="module" 時一樣會執行）
//                 tag.textContent = s.textContent || '';
//                 (document.head || document.body).appendChild(tag);
//                 // 讓事件循序，避免同步塞車
//                 queueMicrotask(resolve);
//             }
//         })), Promise.resolve());
//     };

//     // 依序載入所有 partial（維持 header -> content -> footer 的順序）
//     for (const el of slots) {
//         const url = el.getAttribute('data-include');
//         if (!url) continue;

//         const res = await fetch(url, { cache: 'no-cache' });
//         const html = await res.text();

//         // 用容器解析 HTML
//         const tmp = document.createElement('div');
//         tmp.innerHTML = html;

//         // 把 <script> 拿出來（保留順序）
//         const scripts = Array.from(tmp.querySelectorAll('script'));
//         scripts.forEach(s => s.parentNode.removeChild(s));

//         // 插入非 script 的 DOM
//         el.innerHTML = '';
//         // 用 childNodes 會包含文字節點，這裡用 children 比乾淨；若要完整保留可改回 childNodes
//         el.append(...Array.from(tmp.childNodes));

//         // 逐一、依序執行該 partial 的腳本
//         await loadScriptSequentially(scripts);
//     }

//     // 所有 partial 都插入 + 腳本都跑完了
//     document.dispatchEvent(new Event('includes:ready'));
// });


document.addEventListener('DOMContentLoaded', async () => {
    // --- 晚載入 load shim（只在文件已完整載入時啟用）---
    const _origAdd = window.addEventListener;
    const _lateLoadHandlers = [];
    const _useLateLoadShim = (document.readyState === 'complete');

    if (_useLateLoadShim) {
        window.addEventListener = function (type, listener, options) {
            if (type === 'load') {
                // 延後到所有 partial 的 script 都插完後再呼叫
                _lateLoadHandlers.push(() => {
                    try { listener.call(window, new Event('load')); }
                    catch (e) { console.error(e); }
                });
                return;
            }
            return _origAdd.call(this, type, listener, options);
        };
    }

    const slots = Array.from(document.querySelectorAll('[data-include]'));
    const loadedSrc = new Set(); // 去重複外部腳本
    const loadScriptSequentially = (scripts) => {
        return scripts.reduce((p, s) => p.then(() => new Promise((resolve, reject) => {
            const tag = document.createElement('script');

            // 複製原 script 的屬性（包含 type="module" 等）
            for (const { name, value } of Array.from(s.attributes)) {
                tag.setAttribute(name, value);
            }

            if (s.src) {
                // 外部腳本：避免重覆載入
                if (loadedSrc.has(s.src)) return resolve();
                loadedSrc.add(s.src);
                tag.onload = () => resolve();
                tag.onerror = () => reject(new Error(`Failed to load ${s.src}`));
                tag.src = s.src;
                // 建議插到 <head>，避免干擾版面
                (document.head || document.body).appendChild(tag);
            } else {
                // 內嵌腳本：保留原內容（包含 type="module" 時一樣會執行）
                tag.textContent = s.textContent || '';
                (document.head || document.body).appendChild(tag);
                // 讓事件循序，避免同步塞車
                queueMicrotask(resolve);
            }
        })), Promise.resolve());
    };

    // 依序載入所有 partial（維持 header -> content -> footer 的順序）
    for (const el of slots) {
        const url = el.getAttribute('data-include');
        if (!url) continue;

        // 關鍵：避免拿到舊 partial
        const res = await fetch(url, { cache: 'no-store' });
        const html = await res.text();

        // 用容器解析 HTML
        const tmp = document.createElement('div');
        tmp.innerHTML = html;

        // 把 <script> 拿出來（保留順序）
        const scripts = Array.from(tmp.querySelectorAll('script'));
        scripts.forEach(s => s.parentNode.removeChild(s));

        // 插入非 script 的 DOM
        el.innerHTML = '';
        el.append(...Array.from(tmp.childNodes)); // 需完整保留時用 childNodes

        // 逐一、依序執行該 partial 的腳本
        await loadScriptSequentially(scripts);
    }

    // 還原 addEventListener，並補發所有「晚綁」的 load 事件
    if (_useLateLoadShim) {
        window.addEventListener = _origAdd;
        _lateLoadHandlers.forEach(fn => setTimeout(fn, 0));
    }

    // 所有 partial 都插入 + 腳本都跑完了
    document.dispatchEvent(new Event('includes:ready'));





    // === 全站初始化 ===

    // 1) 移除 Preloader
    document.getElementById('preloader')?.remove();

    // 2) 立刻初始化 AOS（不要等 window.load）
    if (window.AOS) {
        try {
            AOS.init({ duration: 600, easing: 'ease-in-out', once: true, mirror: false });
            // 圖片/外掛稍後才 ready 的情況，補一次 refresh
            setTimeout(() => { try { AOS.refreshHard(); } catch (e) { } }, 50);
        } catch (e) {
            console.warn('AOS init failed:', e);
        }
    } else {
        // 兜底：若沒載到 AOS，避免 data-aos 元素被透明化
        document.querySelectorAll('[data-aos]').forEach(el => el.removeAttribute('data-aos'));
    }

    // 3) 掛 Vue（此時 #app 一定已在 DOM）
    if (window.Vue?.createApp && document.getElementById('app')) {
        const { createApp } = Vue;
        createApp({ data: () => ({ message: 'Hello Vue 3!', count: 0 }) }).mount('#app');
    }




});




