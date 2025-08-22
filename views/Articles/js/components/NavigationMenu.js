import MenuItem from './MenuItem.js'



// 2. Define the main NavigationMenu component that uses MenuItem
// NavigationMenu.js - Updated for async loading

export default {
    name: 'NavigationMenu',
    components: { MenuItem },
    template: `
        <nav class="nav-menu" id="nav-Menu">
            <ul>
                <menu-item v-for="item in menuItems" :key="item.name" :item="item"></menu-item>
            </ul>
        </nav>
    `,
    data() {
        return {
            menuItems: []
        };
    },
    methods: {
        async fetchNavigationMenu() {
            try {
                const baseAddress = 'https://localhost:7104';
                const response = await fetch(`${baseAddress}/api/ContentArticleCategoryAPI`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error("Error fetching navigation menu:", error);
                return [];
            }
        },

        async loadNavigationMenu() {
            // Load only top-level menu items initially
            // Note: hasSubcategories indicates whether a category has subcategories
            // but we don't load the actual subcategories until needed
            // Load navigation menu data from API
            this.menuItems = await this.fetchNavigationMenu();
            console.log("Navigation menu loaded:", this.menuItems);
        }
    },
    mounted() {
        this.loadNavigationMenu();
    }
}