// document.addEventListener('DOMContentLoaded', async () => {
//     const slots = document.querySelectorAll('[data-include]');

//     // 載入 header/footer
//     await Promise.all([...slots].map(async (el) => {
//         const url = el.getAttribute('data-include');
//         const res = await fetch(url, { cache: 'no-cache' });
//         el.innerHTML = await res.text();
//     }));

//     // header/footer 載完後再載 main.js
//     const script = document.createElement('script');
//     script.src = 'assets/js/main.js';
//     document.body.appendChild(script);
// });



document.addEventListener('DOMContentLoaded', async () => {
    const slots = document.querySelectorAll('[data-include]');

    for (const el of slots) {
        const url = el.getAttribute('data-include');
        if (!url) continue;

        const res = await fetch(url, { cache: 'no-cache' });
        const html = await res.text();

        const tmp = document.createElement('div');
        tmp.innerHTML = html;

        // 取出 script 並移除
        const scripts = tmp.querySelectorAll('script');
        scripts.forEach(s => s.remove());

        // 插入非 script 節點
        el.innerHTML = '';
        el.append(...tmp.childNodes);

        // 逐一執行 script
        for (const s of scripts) {
            const newScript = document.createElement('script');
            [...s.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));

            if (s.src) {
                await new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    newScript.src = s.src;
                    document.body.appendChild(newScript);
                });
            } else {
                newScript.textContent = s.textContent;
                document.body.appendChild(newScript);
            }
        }
    }
});
