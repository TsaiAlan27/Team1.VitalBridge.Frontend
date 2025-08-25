// NestedComments.js
export default {
    name: 'NestedComments',
    props: {
        comments: {
            type: Array,
            default: () => []
        },
        depth: {
            type: Number,
            default: 0
        },
        maxDepth: {
            type: Number,
            default: 5
        }
    },
    emits: ['reply-to', 'load-replies'],
    data() {
        return {
            expandedComments: new Set(),
            loadingReplies: new Set()
        };
    },
    computed: {
        canNestFurther() {
            return this.depth < this.maxDepth;
        }
    },
    methods: {
        async toggleReplies(comment) {
            if (this.expandedComments.has(comment.id)) {
                // Collapse replies
                this.expandedComments.delete(comment.id);
            } else {
                // Expand replies
                this.expandedComments.add(comment.id);

                // Load replies if not already loaded and has replies count > 0
                if ((!comment.replies || comment.replies.length === 0) && comment.repliesCount > 0) {
                    await this.loadReplies(comment);
                }
            }
        },

        async loadReplies(comment) {
            if (this.loadingReplies.has(comment.id)) return;

            this.loadingReplies.add(comment.id);

            try {
                // Emit to parent component to handle the API call
                this.$emit('load-replies', comment.id);
            } catch (error) {
                console.error('Error loading replies:', error);
            } finally {
                // Remove loading state after a delay to ensure parent has time to update
                setTimeout(() => {
                    this.loadingReplies.delete(comment.id);
                }, 100);
            }
        },

        startReply(comment, event) {
            // Don't start reply if clicking on the replies indicator
            if (event.target.closest('.replies-indicator')) return;
            this.$emit('reply-to', comment);
        },

        formatTime(time) {
            if (time === 'just now') return time;
            // You can enhance this with proper date formatting
            return time;
        },

        isExpanded(commentId) {
            return this.expandedComments.has(commentId);
        },

        isLoading(commentId) {
            return this.loadingReplies.has(commentId);
        },

        // Helper method to check if comment has expandable replies
        hasExpandableReplies(comment) {
            // Show indicator if:
            // 1. Has repliesCount > 0, OR
            // 2. Has loaded replies array with length > 0
            return (comment.repliesCount > 0) || (comment.replies && comment.replies.length > 0);
        }
    },
    template: `
        <div class="nested-comments-container">
            <div 
                v-for="comment in comments" 
                :key="comment.id" 
                class="nested-comment"
                :style="{ marginLeft: depth > 0 ? '24px' : '0' }"
            >
                <div 
                    class="comment-main" 
                    @click="startReply(comment, $event)"
                >
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">{{ comment.author }}</span>
                            <span class="comment-handle">{{ comment.handle }}</span>
                            <span class="comment-meta">• {{ formatTime(comment.time) }}</span>
                        </div>
                        <div class="comment-text">{{ comment.text }}</div>
                    </div>
                    
                    <div 
                        v-if="hasExpandableReplies(comment)"
                        class="replies-indicator"
                        @click.stop="toggleReplies(comment)"
                    >
                        <span v-if="isLoading(comment.id)" class="loading-spinner">⟳</span>
                        <template v-else>
                            <span class="replies-count">
                                {{ comment.repliesCount || (comment.replies ? comment.replies.length : 0) }} 
                                {{ (comment.repliesCount || (comment.replies ? comment.replies.length : 0)) === 1 ? 'reply' : 'replies' }}
                            </span>
                            <span 
                                class="plus-sign" 
                                :class="{ expanded: isExpanded(comment.id) }"
                            >+</span>
                        </template>
                    </div>
                </div>
                
                <div 
                    v-if="comment.replies && comment.replies.length > 0"
                    class="nested-replies"
                    :class="{ visible: isExpanded(comment.id) }"
                >
                    <div 
                        v-if="canNestFurther"
                        class="reply-branch"
                    >
                        <NestedComments
                            :comments="comment.replies"
                            :depth="depth + 1"
                            :max-depth="maxDepth"
                            @reply-to="$emit('reply-to', $event)"
                            @load-replies="$emit('load-replies', $event)"
                        />
                    </div>
                    <div v-else class="max-depth-message">
                        <em>Maximum nesting level reached. <a href="#" @click.prevent="$emit('reply-to', comment)">Reply</a> to continue the conversation.</em>
                    </div>
                </div>
            </div>
        </div>
    `
};