export default {
    name: 'PopularCategoriesWidget',
    props: {
        categoryId: {
            type: Number,
            default: null
        }
    },
    template: `
        <div class="widget-box" id="popularCategoriesWidget">
            <h3 class="widget-title">熱門子分類</h3>
            
            <!-- Loading state -->
            <ul v-if="loading" class="widget-list">
                <li v-for="i in 1" :key="i">
                    <a href="#" style="color: #999;">載入中...</a>
                    <span class="badge count-badge">--</span>
                </li>
            </ul>
            
            <!-- Error state -->
            <div v-else-if="error" style="color: #e74c3c; padding: 10px; font-size: 14px;">
                載入失敗: {{ error }}
            </div>
            
            <!-- Categories list -->
            <ul v-else-if="categories.length > 0" class="widget-list">
                <li v-for="(category, index) in categories" :key="category.Id || index">
                    <a :href="getCategoryUrl(category.id)">{{ category.name || 'Untitled Category' }}</a>
                    <span v-if="index === 0 && category.numberOfArticles > getHighestCount() * 0.8" 
                          class="badge first-trending-badge">最新趨勢</span>
                    <span v-else class="badge count-badge">{{ category.numberOfArticles }}</span>
                </li>
            </ul>
            
            <!-- Empty state -->
            <div v-else style="color: #999; padding: 20px; text-align: center; font-size: 14px;">
                暫無熱門子分類
            </div>
        </div>
    `,
    data() {
        return {
            categoryId: null,
            categories: [],
            loading: true,
            error: null,
            baseAddress: 'https://localhost:7104'
        };
    },
    methods: {
        async fetchPopularCategories() {
            try {
                this.loading = true;
                this.error = null;

                const url = this.categoryId
                    ? `${this.baseAddress}/api/ContentArticleCategoryAPI/popular/${this.categoryId}`
                    : `${this.baseAddress}/api/ContentArticleCategoryAPI/popular`;

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                // Take only the first 5 categories
                this.categories = data.slice(0, 5);
                console.log('Fetched popular categories:', this.categories);
            } catch (err) {
                this.error = err.message;
                console.error('Error fetching popular categories:', err);
            } finally {
                this.loading = false;
            }
        },
        getCategoryUrl(categoryId) {
            // You can customize this URL pattern based on your routing structure
            return `/VitalBridge/views/Articles/ArticleCategory.html?id=${categoryId}`;
        },
        getHighestCount() {
            return 0;
            if (this.categories.length === 0) return 0;
            console.log(Math.max(...this.categories.map(c => c.NumberOfArticles)));
            return Math.max(...this.categories.map(c => c.NumberOfArticles));
        }
    },
    mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        this.categoryId = urlParams.get('id');
        this.fetchPopularCategories();
    },
    watch: {
        categoryId() {
            // Refetch when categoryId prop changes
            this.fetchPopularCategories();
        }
    }
};