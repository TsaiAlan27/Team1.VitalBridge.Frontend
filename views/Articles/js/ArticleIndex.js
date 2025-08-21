
import NavigationMenu from "./components/NavigationMenu.js"
import MenuItem from './components/MenuItem.js' // Also import MenuItem as NavigationMenu depends on it
import ArticleCard from "./components/ArticleCard.js";

// Clean Vue script template
const vueApp = {
    components: {
        'navigation-menu': NavigationMenu,
        'menu-item': MenuItem,
        'article-card': ArticleCard

    },
    data() {
        return {
            // Define reactive state here
        };
    },
    methods: {
        // Define your functions here
    },
    mounted() {
        // Hamburger Menu Toggle
        const hamburgerIcon = document.getElementById('hamburgerIcon');
        const navMenu = document.getElementById('nav-Menu');

        if (hamburgerIcon && navMenu) {
            hamburgerIcon.addEventListener('click', function () {
                navMenu.classList.toggle('open');
            });
        } else {
            console.warn("Could not find 'hamburgerIcon' or 'navMenu' elements.");
        }

        // Close nav menu when clicking outside
        const outsideClickListener = function (event) {
            const currentNavMenu = document.getElementById('nav-Menu');
            const currentHamburgerIcon = document.getElementById('hamburgerIcon');

            if (currentNavMenu && currentHamburgerIcon) {
                if (!currentNavMenu.contains(event.target) && !currentHamburgerIcon.contains(event.target)) {
                    currentNavMenu.classList.remove('open');
                }
            }
        };

        document.addEventListener('click', outsideClickListener);
        this._outsideClickListener = outsideClickListener;
    },
    beforeUnmount() {
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
        }
    }
};

// Create and mount the Vue app
const app = Vue.createApp(vueApp);
app.mount('#app');