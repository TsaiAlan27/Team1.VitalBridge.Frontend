// 1. Define the recursive MenuItem component
// MenuItem.js - Updated for async loading
export default {
    name: 'MenuItem',
    props: {
        item: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            isActive: false,
            isLoading: false,
            subcategoriesLoaded: false,
            loadedSubcategories: [] // Store the loaded subcategories
        };
    },
    template: `
        <li :class="{'has-submenu': item.hasSubcategories, 'active': isActive, 'loading': isLoading}">
            <div class="menu-item-wrapper">
                <a :href="\`/views/Articles/ArticleCategory.html?id=\${item.link}\`" class="menu-link">
                    {{ item.name }}
                </a>
                <button 
                    v-if="item.hasSubcategories" 
                    @click="toggleSubmenu" 
                    class="submenu-toggle"
                    :aria-expanded="isActive"
                    :aria-label="'Toggle ' + item.name + ' submenu'">
                    <span v-if="!isLoading" class="toggle-arrow" :class="{ 'rotated': isActive }">›</span>
                    <span v-if="isLoading" class="loading-indicator">...</span>
                </button>
            </div>
            <ul v-if="item.hasSubcategories && isActive">
                <li v-if="isLoading" class="loading-item">Loading...</li>
                <menu-item 
                    v-for="subItem in loadedSubcategories" 
                    :key="subItem.name" 
                    :item="subItem"
                    v-show="!isLoading">
                </menu-item>
            </ul>
        </li>
    `,
    methods: {
        async toggleSubmenu() {
            if (!this.item.hasSubcategories) return;

            // If closing, just toggle
            if (this.isActive) {
                this.isActive = false;
                return;
            }

            // If opening and subcategories not loaded yet, load them
            if (!this.subcategoriesLoaded) {
                this.isLoading = true;
                try {
                    this.loadedSubcategories = await this.loadSubcategories(this.item.id);
                    this.subcategoriesLoaded = true;
                } catch (error) {
                    console.error('Error loading subcategories:', error);
                    this.loadedSubcategories = [];
                } finally {
                    this.isLoading = false;
                }
            }

            this.isActive = true;
        },
        async loadSubcategories(parentCategoryId) {
            // Actual API call:
            try {
                const baseAddress = 'https://localhost:7104';
                const response = await fetch(`${baseAddress}/api/ContentArticleCategoryAPI/${parentCategoryId}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error("Error fetching subcategories:", error);
                return [];
            }
        },
    }
}