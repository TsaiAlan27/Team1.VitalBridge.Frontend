// ArticleContent.js
export default {
    name: 'ArticleContent',
    template: `
        <!-- Hero Section -->
        <section class="hero" v-if="article && article.coverPicFileName">
        <img 
                    :src="'/api/UploadFile/GetFile?fileName=' + article.coverPicFileName" 
                    :alt="article.title"
                    @error="handleImageError"
                v-if="article"/>
        </section>

        <!-- Main Content Section -->
        <main class="main-content">
            <div class="articleContentContainer">
                <div v-if="isLoading" class="loading-indicator">
                    Loading article...
                </div>
                
                <div v-else-if="error" class="error-message">
                    {{ error }}
                </div>
                
                <article v-else-if="article" class="article">
                    <!-- Article Header -->
                    <div class="article-header">
                        <div class="category-breadcrumb" v-if="article.category">
                            <a :href="'/VitalBridge/views/Articles/ArticleCategory.html?id=' + article.categoryId" class="category-pill">{{ article.category }}</a>
                        </div>
                        
                        <h1 class="article-title">{{ article.title }}</h1>
                        
                        <div class="article-meta">
                            <div class="author-avatar">{{ getAuthorInitials(article.author) }}</div>
                            <div>
                                <div><strong>{{ article.author }}</strong></div>
                                <div>{{ formatDate(article.date) }} </div>
                            </div>
                        </div>
                        
                        
                    </div>

                    <!-- Article Content -->
                    <div class="article-content">
                        
                        
                        <div class="article-body" v-html="article.content">
                            <!-- Article content will be rendered here -->
                        </div>
                    </div>

                    <!-- Article Footer -->
                    <div class="article-footer">
                        <div class="author-signature">
                            <p>Thanks for reading,<br><strong>{{ article.author }}</strong></p>
                        </div>
                        
                    </div>
                </article>
                
                <div v-else class="no-article">
                    Article not found
                </div>
            </div>
        </main>
    `,
    data() {
        return {
            article: null,
            isLoading: false,
            error: null,
            articleId: null
        };
    },
    computed: {
    },
    methods: {
        // Get article ID from URL parameter
        getArticleIdFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('id');
        },

        // GET Request to fetch single article by ID
        async fetchArticleById(id) {
            try {
                const baseAddress = 'https://localhost:7104';
                const response = await fetch(`${baseAddress}/api/ContentArticleContentAPI/${id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Article not found');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error("Error fetching article:", error);
                throw error;
            }
        },

        // Main fetch method
        async loadArticle() {
            this.articleId = this.getArticleIdFromUrl();

            if (!this.articleId) {
                this.error = 'No article ID provided in URL';
                return;
            }

            this.isLoading = true;
            this.error = null;

            try {
                this.article = await this.fetchArticleById(this.articleId);
                // console.log('Loaded article:', this.article);
            } catch (error) {
                this.error = error.message || 'Failed to load article';
                console.error('Error loading article:', error);
            } finally {
                this.isLoading = false;
            }
        },

        // Get author initials for avatar
        getAuthorInitials(authorName) {
            if (!authorName) return '';
            return authorName
                .split(' ')
                .map(name => name.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
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
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        // Navigation helper (if you want to add back/related articles)
        goBack() {
            window.history.back();
        },


    },

    async mounted() {
        // console.log('ArticleContent component mounted');
        await this.loadArticle();
        try {
            const baseAddress = 'https://localhost:7104';
            const response = await fetch(`${baseAddress}/api/ContentArticleContentAPI/ViewPlusOne`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: this.articleId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching articles:", error);
        }
    }
};