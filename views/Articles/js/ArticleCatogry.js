
import HamburgerMenu from "./components/HamburgerMenu.js"
import NavigationMenu from "./components/NavigationMenu.js"
import MenuItem from './components/MenuItem.js' // Also import MenuItem as NavigationMenu depends on it
import ArticleCard from "./components/ArticleCard.js";

// Clean Vue script template
const vueApp = {
    components: {
        'hamburger-menu': HamburgerMenu,
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

    }
};

// Create and mount the Vue app
const app = Vue.createApp(vueApp);
app.mount('#app');