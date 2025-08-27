export default {
    name: 'TrendingWidget',
    template: `
        <div class="widget-box">
            <h3 class="widget-title">最近熱門 (Trending Now)</h3>
            
            <!-- Loading state -->
            <div v-if="loading" class="widget-list">
                <li v-for="i in 4" :key="i">
                    <span class="badge">{{ i }}</span>
                    <span style="color: #999;">載入中...</span>
                </li>
            </div>
            
            <!-- Error state -->
            <div v-else-if="error" style="color: #e74c3c; padding: 10px; font-size: 14px;">
                載入失敗: {{ error }}
            </div>
            
            <!-- Articles list -->
            <ul v-else-if="articles.length > 0" class="widget-list">
                <li v-for="(article, index) in articles" :key="article.id || index">
                    <span class="badge">{{ index + 1 }}</span>
                    <a :href="article.url">{{ article.title || 'Untitled Article' }}</a>
                </li>
            </ul>
            
            <!-- Empty state -->
            <div v-else style="color: #999; padding: 20px; text-align: center; font-size: 14px;">
                暫無熱門文章
            </div>
        </div>
    `,
    data() {
        return {
            articles: [],
            loading: true,
            error: null,
            baseAddress: 'https://localhost:7104'
        };
    },
    methods: {
        async fetchTrendingArticles() {
            try {
                this.loading = true;
                this.error = null;

                const response = await fetch(`${this.baseAddress}/api/ContentArticleContentAPI/Trending`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                // Take only the first 4 articles
                this.articles = data.slice(0, 4);
                console.log('Fetched trending articles:', this.articles);
            } catch (err) {
                this.error = err.message;
                console.error('Error fetching trending articles:', err);
            } finally {
                this.loading = false;
            }
        }
    },
    mounted() {
        this.fetchTrendingArticles();
    }
};