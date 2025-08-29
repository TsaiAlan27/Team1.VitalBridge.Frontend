/**
 * 購物車工具模組
 * 統一管理所有購物車相關功能
 */
window.CartUtils = (function () {

    const config = {
        baseApiUrl: 'https://localhost:7104',
        toastDuration: 3000
    };

    /**
     * 確保 Toast 容器存在（如果不存在則動態建立）
     */
    function ensureToastContainer() {
        if (document.getElementById('cart-toast')) return;

        const toastHTML = `
      <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1055;">
        <div id="cart-toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="toast-header">
            <i class="bi bi-cart-check-fill text-success me-2"></i>
            <strong class="me-auto">購物車</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div class="toast-body">
            <span id="toast-message">成功加入購物車！</span>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', toastHTML);
    }

    /**
     * 顯示 Toast 通知
     */
    function showToast(message, type = 'success') {
        // 確保 Toast 容器存在
        ensureToastContainer();

        const toastMessage = document.getElementById('toast-message');
        if (toastMessage) {
            toastMessage.textContent = message;
        }

        const toast = document.getElementById('cart-toast');
        const toastHeader = toast.querySelector('.toast-header i');

        // 重置樣式
        toastHeader.className = 'me-2';
        toast.className = 'toast';

        // 根據類型設定圖示
        switch (type) {
            case 'success':
                toastHeader.classList.add('bi', 'bi-cart-check-fill', 'text-success');
                break;
            case 'warning':
                toastHeader.classList.add('bi', 'bi-exclamation-triangle-fill', 'text-warning');
                break;
            case 'error':
                toastHeader.classList.add('bi', 'bi-x-circle-fill', 'text-danger');
                break;
            default:
                toastHeader.classList.add('bi', 'bi-info-circle-fill', 'text-info');
        }

        // 顯示 Toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: config.toastDuration
        });
        bsToast.show();
    }

    /**
     * 更新購物車數量
     */
    async function updateCartCount() {
        try {
            const response = await fetch(`${config.baseApiUrl}/api/CartApi/Count`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${auth.getAccessToken()}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const count = await response.json();
                const cartCountElement = document.getElementById('cart-count');
                if (cartCountElement) {
                    cartCountElement.textContent = count || 0;
                }
                console.log('購物車數量更新成功:', count);
                return count;
            } else if (response.status === 401) {
                console.warn('⚠️ 未登入，購物車數量設為 0');
                const cartCountElement = document.getElementById('cart-count');
                if (cartCountElement) {
                    cartCountElement.textContent = '0';
                }
                return 0;
            }
        } catch (error) {
            console.error('更新購物車數量失敗:', error);
            return 0;
        }
    }

    /**
     * 核心加入購物車功能
     * @param {number} productId - 商品ID
     * @param {number} quantity - 數量
     * @param {Object} options - 選項設定
     * @returns {Promise<Object>} 回傳結果
     */
    async function addToCart(productId, quantity = 1, options = {}) {
        console.log('=== CartUtils: 開始加入購物車 ===');
        console.log('商品ID:', productId, '數量:', quantity);

        // 預設選項
        const defaultOptions = {
            showLoginAlert: true,
            showSuccessToast: true,
            showErrorToast: true,
            updateCartCount: true,
            maxQuantity: 20,
            checkStock: false,
            stockQuantity: null
        };

        const finalOptions = { ...defaultOptions, ...options };

        // 1. 檢查登入狀態
        try {
            const userInfo = await auth.me();
            console.log('✅ 登入檢查成功:', userInfo);
        } catch (error) {
            console.error('❌ 登入檢查失敗:', error);
            if (finalOptions.showLoginAlert) {
                showToast('請先登入會員才能加入購物車', 'warning');
            }
            throw new Error('未登入');
        }

        // 2. 驗證參數
        if (!productId || productId <= 0) {
            const errorMsg = '無效的商品ID';
            if (finalOptions.showErrorToast) {
                showToast(errorMsg, 'error');
            }
            throw new Error(errorMsg);
        }

        if (!quantity || quantity < 1 || quantity > finalOptions.maxQuantity) {
            const errorMsg = `數量必須在 1-${finalOptions.maxQuantity} 之間`;
            if (finalOptions.showErrorToast) {
                showToast(errorMsg, 'warning');
            }
            throw new Error(errorMsg);
        }

        // 3. 檢查庫存（如果有提供）
        if (finalOptions.checkStock && finalOptions.stockQuantity !== null) {
            if (quantity > finalOptions.stockQuantity) {
                const errorMsg = `庫存不足，目前庫存：${finalOptions.stockQuantity}`;
                if (finalOptions.showErrorToast) {
                    showToast(errorMsg, 'warning');
                }
                throw new Error(errorMsg);
            }
        }

        // 4. 準備請求資料
        const requestData = {
            productId: parseInt(productId),
            quantity: parseInt(quantity)
        };

        console.log('API 請求資料:', requestData);

        // 5. 呼叫 API
        try {
            const response = await fetch(`${config.baseApiUrl}/api/CartApi/AddItem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getAccessToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(requestData)
            });

            console.log('回應狀態:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API 錯誤回應:', errorText);

                if (response.status === 401) {
                    // 嘗試刷新 token
                    try {
                        console.log('嘗試刷新 token...');
                        const refreshed = await auth.ensureRefreshed();
                        if (refreshed) {
                            console.log('✅ Token 刷新成功，重試...');
                            // 重試一次
                            const retryResponse = await fetch(`${config.baseApiUrl}/api/CartApi/AddItem`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${auth.getAccessToken()}`
                                },
                                credentials: 'include',
                                body: JSON.stringify(requestData)
                            });

                            if (retryResponse.ok) {
                                const retryResult = await retryResponse.text();
                                if (finalOptions.showSuccessToast) {
                                    showToast(retryResult || '成功加入購物車！', 'success');
                                }
                                if (finalOptions.updateCartCount) {
                                    await updateCartCount();
                                }
                                return { success: true, message: retryResult };
                            } else {
                                throw new Error(await retryResponse.text() || '重試失敗');
                            }
                        } else {
                            throw new Error('Token 刷新失敗');
                        }
                    } catch (refreshError) {
                        console.error('❌ Token 刷新失敗:', refreshError);
                        if (finalOptions.showErrorToast) {
                            showToast('登入已過期，請重新登入', 'error');
                        }
                        throw new Error('登入已過期');
                    }
                }

                const errorMsg = errorText || '加入購物車失敗';
                if (finalOptions.showErrorToast) {
                    showToast(errorMsg, 'error');
                }
                throw new Error(errorMsg);
            }

            // 6. 成功處理
            const result = await response.text();
            console.log('✅ 加入購物車成功:', result);

            if (finalOptions.showSuccessToast) {
                showToast(result || '成功加入購物車！', 'success');
            }

            if (finalOptions.updateCartCount) {
                await updateCartCount();
            }

            return { success: true, message: result };

        } catch (error) {
            console.error('加入購物車失敗:', error);
            if (finalOptions.showErrorToast && !error.message.includes('未登入') && !error.message.includes('登入已過期')) {
                showToast(error.message || '加入購物車失敗，請稍後再試', 'error');
            }
            throw error;
        }
    }

    /**
     * 快速加入購物車（適用於商品列表頁面）
     * @param {number} productId - 商品ID
     * @param {number} quantity - 數量（預設1）
     */
    async function quickAddToCart(productId, quantity = 1) {
        return addToCart(productId, quantity, {
            showLoginAlert: true,
            showSuccessToast: true,
            showErrorToast: true,
            updateCartCount: true,
            maxQuantity: 20
        });
    }

    /**
     * 詳細加入購物車（適用於商品詳情頁面）
     * @param {number} productId - 商品ID
     * @param {number} quantity - 數量
     * @param {number} stockQuantity - 庫存數量
     * @param {number} maxQuantity - 最大購買數量
     */
    async function detailAddToCart(productId, quantity, stockQuantity, maxQuantity = 20) {
        return addToCart(productId, quantity, {
            showLoginAlert: true,
            showSuccessToast: true,
            showErrorToast: true,
            updateCartCount: true,
            maxQuantity: Math.min(maxQuantity, stockQuantity),
            checkStock: true,
            stockQuantity: stockQuantity
        });
    }

    // 公開 API
    return {
        addToCart,
        quickAddToCart,
        detailAddToCart,
        showToast,
        updateCartCount,
        ensureToastContainer
    };
})();