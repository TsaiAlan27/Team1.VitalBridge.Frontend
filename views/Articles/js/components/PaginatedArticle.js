// PaginatedArticles.js
export default {
    name: 'PaginatedArticles',
    props: {
        categoryId: {
            type: [String, Number],
            default: null
        },
        articlesPerPage: {
            type: Number,
            default: 5
        }
    },
    template: `
        <div class="articles-column">
            <!-- Container for paginated articles -->
            <div class="paginated-articles-container" id="paginatedArticlesContainer">
                <div v-if="isLoading && currentPage === 1" class="loading-indicator">
                    Loading articles...
                </div>
                
                <article 
                    v-for="article in displayedArticles" 
                    :key="article.id || article.title"
                    class="featured-article"
                    @click="navigateToArticle(article)"
                    style="cursor: pointer;"
                >
                    <div class="featured-image-container">
                        <img 
                            v-if="article.coverPic" 
                            :src="'data:image/jpeg;base64,' + article.coverPic" 
                            :alt="article.title"
                            class="featured-image"
                            @error="handleImageError"
                        />
                        <div 
                            v-else
                            class="featured-image-placeholder"
                        >
                            No Image
                        </div>
                    </div>
                    <div class="featured-content">
                        <div class="category-breadcrumb">
                            <a href="#" class="category-pill">{{ article.category }}</a>
                            <a href="#" class="subcategory-pill" v-if="article.subcategory">{{ article.subcategory }}</a>
                        </div>
                        <h1 class="featured-headline">{{ article.title }}</h1>
                        <p class="featured-excerpt">{{ article.excerpt }}</p>
                        <p class="article-meta">By {{ article.author }} • {{ formatDate(article.date) }}</p>
                    </div>
                </article>
            </div>

            <!-- Pagination Controls -->
            <div class="pagination-controls" id="paginationControls" v-if="totalPages > 1">
                <button 
                    class="pagination-button" 
                    @click="goToPage(currentPage - 1)"
                    :disabled="currentPage === 1 || isLoading"
                >
                    Previous
                </button>
                
                <button 
                    v-for="page in visiblePages" 
                    :key="page"
                    class="pagination-button"
                    :class="{ 'active': page === currentPage }"
                    @click="goToPage(page)"
                    :disabled="isLoading"
                >
                    {{ page }}
                </button>
                
                <button 
                    class="pagination-button" 
                    @click="goToPage(currentPage + 1)"
                    :disabled="currentPage === totalPages || isLoading"
                >
                    Next
                </button>
            </div>
            
            <div v-if="isLoading && currentPage > 1" class="loading-indicator">
                Loading page {{ currentPage }}...
            </div>
        </div>
    `,
    data() {
        return {
            displayedArticles: [],
            currentPage: 1,
            totalPages: 1,
            totalArticles: 0,
            isLoading: false,
            // defaultGradients: [
            //     'linear-gradient(45deg, #FF6F61, #DE4B4B)',
            //     'linear-gradient(45deg, #1A2980, #26D0CE)',
            //     'linear-gradient(45deg, #AA076B, #61045F)',
            //     'linear-gradient(45deg, #2BC0E4, #EAECC6)',
            //     'linear-gradient(45deg, #7F00FF, #E100FF)',
            //     'linear-gradient(45deg, #DCE35B, #45B649)',
            //     'linear-gradient(45deg, #00B4DB, #0083B0)',
            //     'linear-gradient(45deg, #3CA55C, #B5AC49)',
            //     'linear-gradient(45deg, #2F80ED, #56CCF2)',
            //     'linear-gradient(45deg, #FFD700, #FFA500)'
            // ]
        };
    },
    computed: {
        visiblePages() {
            const pages = [];
            const maxVisible = 5;
            let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
            let end = Math.min(this.totalPages, start + maxVisible - 1);

            // Adjust start if we're near the end
            if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            return pages;
        }
    },
    methods: {
        // Navigate to article content page
        navigateToArticle(article) {
            const articleId = article.id || article.link;
            if (articleId) {
                window.location.href = `/views/Articles/ArticleContent.html?id=${articleId}`;
            } else {
                console.warn('Article ID/link not found:', article);
            }
        },

        // Same API fetch method as ArticleCard.js
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

        // Fetch articles for a specific page
        async fetchArticles(page = 1) {
            this.isLoading = true;

            const result = await this.fetchContentArticleWithPost(page, this.articlesPerPage, this.categoryId);

            this.isLoading = false;

            // Handle API response format
            if (result && result.articles && Array.isArray(result.articles)) {
                return {
                    articles: result.articles,
                    totalCount: result.totalCount || 0
                };
            }

            return { articles: [], totalCount: 0 };
        },

        // Go to specific page
        async goToPage(page) {
            if (page < 1 || page > this.totalPages || page === this.currentPage || this.isLoading) {
                return;
            }

            this.currentPage = page;
            const result = await this.fetchArticles(page);
            this.displayedArticles = result.articles;

            // Scroll to top on page change
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        // Load initial articles
        async loadInitialArticles() {
            const result = await this.fetchArticles(1);
            this.displayedArticles = result.articles;
            this.totalArticles = result.totalCount;
            this.totalPages = Math.ceil(this.totalArticles / this.articlesPerPage);
            this.currentPage = 1;
        },

        // Handle image loading errors
        handleImageError(event) {
            console.warn('Image failed to load:', event.target.src);
            event.target.style.display = 'none';
            // Show placeholder instead
            const placeholder = event.target.nextElementSibling;
            if (placeholder && placeholder.classList.contains('featured-image-placeholder')) {
                placeholder.style.display = 'flex';
            }
        },

        // // Get a default gradient for articles without images
        // getDefaultGradient(article) {
        //     // Use article ID or title to consistently assign the same gradient
        //     const identifier = article.id || article.title || '';
        //     const index = identifier.length % this.defaultGradients.length;
        //     return this.defaultGradients[index];
        // },

        // Format date for display
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }
    },

    async mounted() {
        console.log('PaginatedArticles component mounted');
        await this.loadInitialArticles();
        console.log(`Loaded ${this.displayedArticles.length} articles, ${this.totalPages} pages total`);
    },

    // Watch for categoryId changes
    watch: {
        categoryId: {
            handler: async function (newCategoryId, oldCategoryId) {
                if (newCategoryId !== oldCategoryId) {
                    console.log('Category changed, reloading articles');
                    await this.loadInitialArticles();
                }
            }
        }
    }
};