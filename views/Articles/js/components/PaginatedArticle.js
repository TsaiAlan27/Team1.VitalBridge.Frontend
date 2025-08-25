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
        <section class="articles-column">
            <!-- Container for paginated articles, now styled like featured articles -->
            <div class="paginated-articles-container" id="paginatedArticlesContainer">
                <div v-if="isLoading && currentPage === 1" class="loading-indicator">
                    Loading articles...
                </div>
                
                <!-- Paginated articles will be dynamically loaded here, each in the featured-article style -->
                <article 
                    v-for="article in displayedArticles" 
                    :key="article.id || article.title"
                    class="featured-article"
                    @click="navigateToArticle(article)"
                    style="cursor: pointer;"
                >
                    <div class="featured-image-container">
                        <img
                        v-if="article.coverPicFileName"
                        :src="'/api/UploadFile/GetFile?fileName=' + article.coverPicFileName"
                        :alt="article.title"
                        class="featured-image"
                        @error="handleImageError"
                        />
                        <div
                        v-else
                        class="featured-image-placeholder"
                        >
                            no image 
                        </div> 
                    </div>
                    <div class="featured-content">
                        <div class="category-breadcrumb">
                            <a :href="'/VitalBridge/views/Articles/ArticleCategory.html?id=' + article.categoryId" class="category-pill">{{ article.category }}</a>
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
        </section>
    `,
    data() {
        return {
            categoryId: null,
            displayedArticles: [],
            currentPage: 1,
            totalPages: 1,
            totalArticles: 0,
            isLoading: false,
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
                window.location.href = `/VitalBridge/views/Articles/ArticleContent.html?id=${articleId}`;
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

        // Format date for display
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }
    },

    async mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        this.categoryId = urlParams.get('id');
        console.log("Category ID from URL:", this.categoryId);
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