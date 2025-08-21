function LoadPlateByNow() {
    loadAdsByDate(new Date().toISOString().slice(0, 10));
}
function loadAdsByDate(dateStr) {
    const pathname = window.location.pathname;
    $.ajax({
        url: "https://localhost:7184/Api/Adv",
        type: "GET",
        data: {
            route: pathname,
            targetDate: dateStr
        },
        success: function (response) {
            plates = response;

            for (var p of plates) {
                let html = '';
                let btn = `<button type="button" data-bs-target="#${p.name}" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>`;

                if (p.images.length === 0) {
                    const fileName = p.defaultImageFile.fileName;
                    const fileUrl = `/api/UploadFile/GetFile/${encodeURIComponent(fileName)}`;
                    const ClickUrl = p.defaultImageClickUrl ? p.defaultImageClickUrl : '';
                    html += `
                    <div class="carousel-item active">
                        ${ClickUrl ? `<a href="${ClickUrl}">` : ''}
                            <img src="${fileUrl}" title="${p.defaultImageIntroduct ? p.defaultImageIntroduct : ''}" class="d-block w-100" alt="...">
                        ${ClickUrl ? `</a>` : ''}
                    </div>`;
                } else {
                    let count = 0;
                    for (var image of p.images) {
                        const activeClass = count === 0 ? "active" : "";
                        const fileName = image.imageFile.fileName;
                        const fileUrl = `https://localhost:7184/api/UploadFile/GetFile/${encodeURIComponent(fileName)}`;
                        const ClickUrl = image.clickUrl ? image.clickUrl : '';
                        html += `
                        <div class="carousel-item ${activeClass}">
                            ${ClickUrl ? `<a href="${ClickUrl}">` : ''}
                                <img src="${fileUrl}" title="${image.introduct ? image.introduct : ''}" class="d-block w-100" alt="...">
                            ${ClickUrl ? `</a>` : ''}
                        </div>`;
                        if (count > 0) {
                            btn += `<button type="button" data-bs-target="#${p.name}" data-bs-slide-to="${count}" aria-label="Slide ${count + 1}"></button>`;
                        }
                        count++;
                    }
                }

                const carouselId = `${p.name}`;
                const $carousel = $(`#${carouselId}`);
                if ($carousel.length > 0) {
                    $carousel.find('.carousel-indicators').html(btn);
                    $carousel.find('.carousel-inner').html(html);
                } else {
                    const carousel = `
                    <div id="${carouselId}" class="carousel slide w-100" data-bs-ride="carousel">
                        <div class="carousel-indicators">
                            ${btn}
                        </div>
                        <div class="carousel-inner" style="height: 400px;">
                            ${html}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>`;
                    console.log(p.location);
                    $(p.location).after(carousel);
                }
            }  
        },
        error: function () {
            console.error("取得廣告失敗");
        }
    });
}