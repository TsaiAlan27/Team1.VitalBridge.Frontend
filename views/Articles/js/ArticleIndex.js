
import HamburgerMenu from "./components/HamburgerMenu.js"
import NavigationMenu from "./components/NavigationMenu.js"
import MenuItem from './components/MenuItem.js' // Also import MenuItem as NavigationMenu depends on it
import ArticleCard from "./components/ArticleCard.js";
import TrendingWidget from "./components/TrendingWidget.js";
import PopularCategoriesWidget from "./components/PopularCategoriesWidget.js";
import CtaBanner from "./components/CtaBanner.js";

// Clean Vue script template
const vueApp = {
    components: {
        'hamburger-menu': HamburgerMenu,
        'navigation-menu': NavigationMenu,
        'menu-item': MenuItem,
        'article-card': ArticleCard,
        'trending-widget': TrendingWidget,
        'popular-categories-widget': PopularCategoriesWidget,
        'cta-banner': CtaBanner

    },
    data() {
        return {
            // Define reactive state here
            banners: [{ id: 1 }], // Start with one banner
            nextBannerId: 2,
            isScrolling: false,
            scrollTimeout: null
        };
    },
    methods: {
        // Define your functions here

        checkScrollPosition() {
            if (this.isScrolling) return;

            this.isScrolling = true;

            // Clear existing timeout
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }

            // Set timeout to reduce scroll event frequency
            this.scrollTimeout = setTimeout(() => {
                const lastBanner = this.getLastBannerElement();

                if (lastBanner) {
                    const bannerRect = lastBanner.getBoundingClientRect();
                    const bannerBottom = bannerRect.bottom;
                    const viewportHeight = window.innerHeight;

                    // Check if banner bottom is within 200px from the top of viewport
                    if (bannerBottom <= 200) {
                        this.createNewBanner();
                    }
                }

                this.isScrolling = false;
            }, 50); // Throttle scroll events to every 50ms
        },

        getLastBannerElement() {
            const bannerElements = document.querySelectorAll('.cta-banner');
            return bannerElements[bannerElements.length - 1];
        },

        createNewBanner() {
            // Only create a new banner if we don't already have one being created
            const lastBannerId = this.banners[this.banners.length - 1].id;
            if (lastBannerId === this.nextBannerId - 1) {
                this.isLoading = true;

                this.banners.push({ id: this.nextBannerId });
                this.nextBannerId++;
                this.isLoading = false;
                console.log(`Created new banner with ID: ${this.nextBannerId - 1}`);
            }
        },

        setupScrollListener() {
            window.addEventListener('scroll', this.checkScrollPosition, { passive: true });
        }
    },
    mounted() {
        this.setupScrollListener();
    },
    beforeUnmount() {
        // Clean up event listener
        window.removeEventListener('scroll', this.checkScrollPosition);
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
    }
};

// Create and mount the Vue app
const app = Vue.createApp(vueApp);
app.mount('#app');