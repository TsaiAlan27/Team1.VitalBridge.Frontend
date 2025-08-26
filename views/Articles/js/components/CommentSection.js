import NestedComments from './NestedComment.js';

// CommentSection.js
export default {
    name: 'CommentSection',
    components: {
        NestedComments,
    },
    props: {
        apiBaseUrl: {
            type: String,
            default: 'https://localhost:7104'
        }
    },
    data() {
        return {
            contentId: null, // Fixed: moved from props to data, will be set in mounted
            comments: [],
            currentPage: 1,
            pageSize: 5,
            totalComments: 0,
            totalPages: 0,
            loading: false,

            // Comment form
            commentText: '',
            replyingTo: null,
            submitting: false,

            // User info (should come from authentication system)
            currentUser: {
                id: 'current_user_id',
                name: 'You',
                handle: '@current_user'
            }
        };
    },
    computed: {
        commentPlaceholder() {
            return this.replyingTo
                ? `Reply to ${this.replyingTo.author}...`
                : 'Write a comment...';
        },

        canSubmit() {
            return this.currentUser && this.commentText.trim() && !this.submitting;
        },

        displayedPages() {
            const pages = [];
            const start = Math.max(1, this.currentPage - 2);
            const end = Math.min(this.totalPages, this.currentPage + 2);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            return pages;
        }
    },
    async mounted() {
        // Get contentId from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.contentId = urlParams.get('id');

        if (!this.contentId) {
            console.error('No content ID found in URL parameters');
            return;
        }

        await this.loadCurrentUser();
        await this.loadComments();

        this.setupTextareaAutoResize();
    },
    methods: {
        //current user simulation
        async loadCurrentUser() {
            try {
                var udata = await auth.me();
                this.currentUser.id = udata.id;
                this.currentUser.name = udata.name;
                this.currentUser.handle = "@" + udata.name + udata.id;
            }
            catch (err) {
                console.error("Error fetching user:", err);
                this.currentUser = null;
            }
        },
        // API Methods
        async loadComments(page = 1) {
            this.loading = true;
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/ContentArticleCommentAPI/Get`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        articleId: this.contentId,
                        page: page,
                        pageSize: this.pageSize,
                        parentCommentId: null
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to load comments');
                }

                const data = await response.json();

                // Debug logging
                // console.log('API Response:', data);

                this.comments = data.comments || [];
                this.totalComments = data.totalComments || 0;
                this.totalPages = data.totalPages || Math.ceil(this.totalComments / this.pageSize);
                this.currentPage = page;

            } catch (error) {
                console.error('Error loading comments:', error);
                // Set empty state on error so UI still renders
                this.comments = [];
                this.totalComments = 0;
                this.totalPages = 0;
            } finally {
                this.loading = false;
            }
        },

        async loadReplies(commentId) {
            try {
                // Use dedicated replies endpoint that takes only commentId
                const response = await fetch(`${this.apiBaseUrl}/api/ContentArticleCommentAPI/GetReplies`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        commentId: commentId
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to load replies');
                }

                const replies = await response.json();

                // Debug logging
                console.log(`Loaded ${replies.length} replies for comment ${commentId}:`, replies);

                // Find the comment and update its replies
                this.updateCommentReplies(this.comments, commentId, replies);

            } catch (error) {
                console.error('Error loading replies:', error);
            }
        },

        async submitComment() {
            if (!this.canSubmit) return;

            this.submitting = true;

            const commentData = {
                articleId: this.contentId, // Fixed: changed from contentId to articleId to match API
                userId: this.currentUser.id,
                parentCommentId: this.replyingTo?.id || null,
                text: this.commentText.trim(),
            };

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/ContentArticleCommentAPI/Create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(commentData)
                });

                if (!response.ok) {
                    throw new Error('Failed to submit comment');
                }

                const newComment = await response.json();

                if (this.replyingTo) {
                    // Add reply to the parent comment
                    this.addReplyToComment(this.comments, this.replyingTo.id, newComment);
                    this.stopReply();
                } else {
                    // Add new top-level comment
                    this.comments.unshift(newComment);
                    this.totalComments++;
                }

                this.commentText = '';
                this.resetTextareaHeight();

            } catch (error) {
                console.error('Error submitting comment:', error);
            } finally {
                this.submitting = false;
            }
        },

        // Helper Methods
        updateCommentReplies(comments, commentId, replies) {
            for (const comment of comments) {
                if (comment.id === commentId) {
                    comment.replies = replies;
                    return true;
                }
                if (comment.replies && this.updateCommentReplies(comment.replies, commentId, replies)) {
                    return true;
                }
            }
            return false;
        },

        addReplyToComment(comments, parentId, newReply) {
            for (const comment of comments) {
                if (comment.id === parentId) {
                    if (!comment.replies) comment.replies = [];
                    comment.replies.push(newReply);
                    comment.repliesCount = (comment.repliesCount || 0) + 1;
                    return true;
                }
                if (comment.replies && this.addReplyToComment(comment.replies, parentId, newReply)) {
                    return true;
                }
            }
            return false;
        },

        // UI Event Handlers
        startReply(comment) {
            this.replyingTo = comment;
            this.$nextTick(() => {
                this.$refs.commentInput.focus();
            });
        },

        stopReply() {
            this.replyingTo = null;
        },

        async goToPage(page) {
            if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
                await this.loadComments(page);
            }
        },

        async previousPage() {
            if (this.currentPage > 1) {
                await this.goToPage(this.currentPage - 1);
            }
        },

        async nextPage() {
            if (this.currentPage < this.totalPages) {
                await this.goToPage(this.currentPage + 1);
            }
        },

        handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.submitComment();
            }
        },

        setupTextareaAutoResize() {
            this.$nextTick(() => {
                const textarea = this.$refs.commentInput;
                if (textarea) {
                    textarea.addEventListener('input', this.autoResize);
                }
            });
        },

        autoResize(event) {
            const textarea = event.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        },

        resetTextareaHeight() {
            this.$nextTick(() => {
                const textarea = this.$refs.commentInput;
                if (textarea) {
                    textarea.style.height = 'auto';
                }
            });
        },

        formatCommentsCount() {
            return `${this.totalComments} ${this.totalComments === 1 ? 'comment' : 'comments'}`;
        }
    },
    template: `
        <section class="comments-section">
            <h3 class="comments-header">{{ formatCommentsCount() }}</h3>
            
            <!-- Comment Form -->
            <div class="comment-form">
                <div style="flex: 1;">
                    <!-- Reply Indicator -->
                    <div v-if="replyingTo" class="reply-indicator visible">
                        <span class="reply-text">
                            Replying to <strong>{{ replyingTo.author }}</strong>
                        </span>
                        <button class="reply-close" @click="stopReply">×</button>
                    </div>
                    
                    <!-- Comment Input -->
                    <textarea 
                        ref="commentInput"
                        v-model="commentText"
                        class="comment-input" 
                        :placeholder="commentPlaceholder"
                        rows="1"
                        @keypress="handleKeyPress"
                        :disabled="submitting"
                    ></textarea>
                </div>
                
                <!-- Submit Button -->
                <button 
                    class="post-btn" 
                    @click="submitComment"
                    :disabled="!canSubmit"
                >
                    {{ submitting ? 'Posting...' : 'Post' }}
                </button>
            </div>
            
            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
                <div class="loading-spinner">Loading comments...</div>
            </div>
            
            <!-- Comments Container -->
            <div v-else class="comments-container">
                <NestedComments
                    :comments="comments"
                    :depth="0"
                    @reply-to="startReply"
                    @load-replies="loadReplies"
                />
                
                <!-- Empty State -->
                <div v-if="comments.length === 0" class="empty-state">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            </div>
            
            <!-- Pagination -->
            <div v-if="totalPages > 1" class="pagination-section">
                <div class="pagination">
                    <button 
                        class="page-btn" 
                        :disabled="currentPage === 1 || loading"
                        @click="previousPage"
                    >
                        ‹
                    </button>
                    
                    <div class="page-numbers">
                        <button
                            v-for="page in displayedPages"
                            :key="page"
                            class="page-btn"
                            :class="{ active: page === currentPage }"
                            :disabled="loading"
                            @click="goToPage(page)"
                        >
                            {{ page }}
                        </button>
                    </div>
                    
                    <button 
                        class="page-btn" 
                        :disabled="currentPage === totalPages || loading"
                        @click="nextPage"
                    >
                        ›
                    </button>
                </div>
            </div>
        </section>
    `
};