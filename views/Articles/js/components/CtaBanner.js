
// CtaBanner Vue Component
export default {
    name: 'CtaBanner',
    props: {
        bannerId: {
            type: Number,
            default: 1
        }
    },
    data() {
        return {
            isLoading: true,
            bannerData: {
                imageUrl: '',
                title: '載入中...',
                subtitle: '載入中...',
                purchaseText: '載入中...',
                purchaseLink: ''
            }
        };
    },
    template: `
        <div class="cta-banner" :data-banner-id="bannerId" ref="bannerElement">
            
            <div class="cta-content">
                <h2 class="cta-title">{{ bannerData.title }}</h2>
                <p class="cta-subtitle">{{ bannerData.subtitle }}</p>
                <button class="purchase-btn" 
                        @click="handlePurchase" 
                        :disabled="isLoading">
                    {{ bannerData.purchaseText }}
                </button>
            </div>
        </div>
    `,
    // <div class="cta-image-container">
    //             <img :src="bannerData.imageUrl || fallbackImage" 
    //                     alt="Premium Blog Theme" 
    //                     class="cta-image" />
    //         </div>
    methods: {
        async fetchContentArticleBannerProduct(bannerId) {
            try {
                // API call - replace with your actual API endpoint
                const response = await fetch(`https://localhost:7104/api/ContentArticleProductBannerAPI/${bannerId}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error fetching banner data:', error);
                // Return fallback data if API fails
                return {};
            };
        },

        async fetchBannerData() {
            this.isLoading = true;

            const result = await this.fetchContentArticleBannerProduct(this.bannerId);

            this.isLoading = false;

            // Handle API response format
            if (result) {
                this.bannerData = {
                    imageUrl: result.imageUrl || '',
                    title: result.title || 'Best Selling Theme',
                    subtitle: result.subtitle || 'Experience the change!',
                    purchaseText: '立即購買！！！',
                    purchaseLink: result.purchaseLink || `https://localhost:7184/VitalBridge/ECshop/index.html`
                };
            }

            return this.bannerData;
        },

        handlePurchase() {
            if (this.isLoading) return;

            console.log(`Purchase button clicked on banner ${this.bannerId}!`);

            // Navigate to the fetched purchase link or fallback
            const purchaseUrl = this.bannerData.purchaseLink ||
                `https://localhost:7184/VitalBridge/ECshop/index.html`;

            window.location.href = purchaseUrl;
        }
    },
    async mounted() {
        // Fetch banner data when component mounts
        await this.fetchBannerData();

        // Emit the banner element to parent for tracking
        this.$emit('banner-mounted', this.$refs.bannerElement);
    }
};