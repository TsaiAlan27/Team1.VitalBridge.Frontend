// ArticlesCard.js
export default {
    name: 'ArticlesCard',
    props: {
        categoryId: {
            type: [String, Number],
            default: null
        }
    },
    template: `
        <div class="articles-container">
            <div id="articleGrid" class="article-grid">
                <div 
                    v-for="article in displayedArticles" 
                    :key="article.id || article.title"
                    class="article-card"
                >
                    <div class="article-image-container">
                        <img 
                            v-if="article.coverPic" 
                            :src="'data:image/jpeg;base64,' + article.coverPic" 
                            :alt="article.title"
                            class="article-image"
                            @error="handleImageError"
                        />
                        <div 
                            v-else
                            class="article-image-placeholder"
                        >
                            No Image
                        </div>
                    </div>
                    <div class="article-card-content">
                        <div class="category-breadcrumb">
                            <a href="#" class="category-pill">{{ article.category }}</a>
                            <a href="#" class="subcategory-pill" v-if="article.subcategory">{{ article.subcategory }}</a>
                        </div>
                        <h3 class="article-card-title">{{ article.title }}</h3>
                        <p class="article-card-excerpt">{{ article.excerpt }}</p>
                        <p class="article-card-meta">By {{ article.author }} • {{ formatDate(article.date) }}</p>
                    </div>
                </div>
            </div>
            
            <div v-if="isLoading" class="loading-indicator">
                Loading more articles...
            </div>
            
            <button 
                id="loadMoreBtn"
                @click="loadMoreArticles"
                :disabled="isLoadMoreDisabled || isLoading"
                class="load-more-btn"
                v-show="!allArticlesLoaded"
            >
                {{ loadMoreButtonText }}
            </button>
            
            <div v-if="allArticlesLoaded" class="no-more-articles">
                No more articles to load
            </div>
        </div>
    `,
    data() {
        return {
            allArticles: [],
            displayedArticles: [],
            articlesPerLoad: 6,
            currentPage: 1,
            isLoading: false,
            allArticlesLoaded: false,
            totalArticles: 0
        };
    },
    computed: {
        isLoadMoreDisabled() {
            return this.isLoading || this.allArticlesLoaded;
        },
        loadMoreButtonText() {
            if (this.isLoading) return 'Loading...';
            if (this.allArticlesLoaded) return 'No More Articles';
            return 'Load More Articles';
        }
    },
    methods: {
        // POST Request with Pagination Body and CategoryId
        async fetchContentArticleWithPost(page, pageSize, categoryId = '') {
            try {
                const baseAddress = 'https://localhost:7104';
                const response = await fetch(`${baseAddress}/api/ContentArticleContentAPI`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        page: page,
                        pageSize: pageSize,
                        categoryId: categoryId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error("Error fetching articles:", error);
                return { articles: [], totalCount: 0 };
            }
        },

        // Main fetch method
        async fetchArticles(page = 1, pageSize = 6) {
            this.isLoading = true;

            const result = await this.fetchContentArticleWithPost(page, pageSize, this.categoryId);

            this.isLoading = false;

            // Handle API response format
            if (result) {
                // Expected format: { articles: [...], totalCount: number }
                if (result.articles && Array.isArray(result.articles)) {
                    return {
                        articles: result.articles,
                        totalCount: result.totalCount || 0
                    };
                }
            }

            return { articles: [], totalCount: 0 };
        },

        async loadInitialArticles() {
            const result = await this.fetchArticles(1, this.articlesPerLoad);
            this.allArticles = result.articles;
            this.displayedArticles = [...this.allArticles];
            this.totalArticles = result.totalCount;
            this.currentPage = 1;

            // Check if we've loaded all articles
            if (this.allArticles.length >= this.totalArticles) {
                this.allArticlesLoaded = true;
            }
        },

        async loadMoreArticles() {
            if (this.isLoading || this.allArticlesLoaded) return;

            this.currentPage++;
            const result = await this.fetchArticles(this.currentPage, this.articlesPerLoad);

            // Add new articles to existing ones
            this.allArticles = [...this.allArticles, ...result.articles];
            this.displayedArticles = [...this.allArticles];

            // Check if we've loaded all articles
            if (result.articles.length < this.articlesPerLoad || this.allArticles.length >= this.totalArticles) {
                this.allArticlesLoaded = true;
            }
        },

        handleImageError(event) {
            // Handle image loading errors
            console.warn('Image failed to load:', event.target.src);
            event.target.style.display = 'none';
        },

        formatDate(dateString) {
            // Format the date for display
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }
    },

    async mounted() {
        console.log('Articles component mounted');
        await this.loadInitialArticles();
        console.log('Loaded', this.displayedArticles.length, 'articles');
    }
};