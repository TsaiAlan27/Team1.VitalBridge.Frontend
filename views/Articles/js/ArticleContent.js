
import ArticleContent from './components/ArticleContentBody.js';
import NestedComments from './components/NestedComment.js';
import CommentSection from './components/CommentSection.js';

// Clean Vue script template
const vueApp = {
    components: {
        'article-content': ArticleContent,
        'nested-comments': NestedComments,
        'comment-section': CommentSection
    },
    data() {
        return {
            // Define reactive state here
        };
    },
    methods: {
        // Define your functions here
    },
    mounted() {
        
    }
};

// Create and mount the Vue app
const app = Vue.createApp(vueApp);
app.mount('#app');


// Sample comment data with nested replies
// const allComments = [
//     {
//         id: 1,
//         author: "Henry",
//         handle: "@Henry1265",
//         time: "3 months ago",
//         text: "Found a small typo at line 3",
//         replies: [
//             {
//                 id: 101,
//                 author: "Sarah",
//                 handle: "@Sarah_dev",
//                 time: "3 months ago",
//                 text: "Thanks for catching that! Where exactly?",
//                 replies: [
//                     { id: 201, author: "Henry", handle: "@Henry1265", time: "3 months ago", text: "In the second paragraph, 'recieve' should be 'receive'", replies: [] }
//                 ]
//             },
//             { id: 102, author: "Alex", handle: "@AlexCoder", time: "3 months ago", text: "Good eye! These details matter.", replies: [] }
//         ]
//     },
//     {
//         id: 2,
//         author: "Sarah",
//         handle: "@Sarah_dev",
//         time: "5 months ago",
//         text: "Amazing article! Really helped me understand the concepts better.",
//         replies: []
//     },
//     {
//         id: 3,
//         author: "Ken",
//         handle: "@Ken89999",
//         time: "2 years ago",
//         text: "I read it. It was okay",
//         replies: [
//             {
//                 id: 103,
//                 author: "Alex",
//                 handle: "@AlexCoder",
//                 time: "2 years ago",
//                 text: "What specifically could be improved?",
//                 replies: [
//                     { id: 202, author: "Ken", handle: "@Ken89999", time: "2 years ago", text: "Maybe more practical examples would help", replies: [] }
//                 ]
//             }
//         ]
//     },
//     {
//         id: 4,
//         author: "Alex",
//         handle: "@AlexCoder",
//         time: "1 week ago",
//         text: "This is exactly what I was looking for. Thanks for sharing!",
//         replies: [
//             {
//                 id: 104,
//                 author: "Maria",
//                 handle: "@Maria_JS",
//                 time: "1 week ago",
//                 text: "Same here! Bookmarked for reference.",
//                 replies: [
//                     { id: 203, author: "David", handle: "@DavidTech", time: "6 days ago", text: "The examples are particularly helpful.", replies: [] }
//                 ]
//             },
//             { id: 105, author: "Lisa", handle: "@Lisa_UX", time: "5 days ago", text: "Agreed, very practical approach.", replies: [] }
//         ]
//     },
//     {
//         id: 5,
//         author: "Maria",
//         handle: "@Maria_JS",
//         time: "2 days ago",
//         text: "Great explanation of the core concepts. Would love to see more examples.",
//         replies: []
//     }
// ];
// let currentPage = 1;
// const commentsPerPage = 5;
// let displayedComments = [];
// let replyingTo = null;
// let expandedReplies = new Set();

// const commentsContainer = document.querySelector('.comments-container');
// const pagination = document.querySelector('.pagination');
// const pageNumbers = document.querySelector('.page-numbers');
// const prevBtn = document.getElementById('prevBtn');
// const nextBtn = document.getElementById('nextBtn');
// const commentInput = document.querySelector('.comment-input');
// const postBtn = document.querySelector('.post-btn');
// const replyIndicator = document.querySelector('.reply-indicator');
// const replyText = document.querySelector('.reply-text');
// const replyClose = document.querySelector('.reply-close');

// function renderNestedComment(reply, depth = 0) {
//     const repliesCount = reply.replies ? reply.replies.length : 0;
//     const isExpanded = expandedReplies.has(reply.id);

//     const repliesIndicator = repliesCount > 0 ?
//         `<div class="replies-indicator" onclick="toggleReplies(${reply.id}, event)">
//                     <span class="replies-count">${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}</span>
//                     <span class="plus-sign ${isExpanded ? 'expanded' : ''}">+</span>
//                 </div>` : '';

//     const nestedReplies = repliesCount > 0 && reply.replies ?
//         `<div class="nested-replies ${isExpanded ? 'visible' : ''}">
//                     ${reply.replies.map(r => renderNestedComment(r, depth + 1)).join('')}
//                 </div>` : '';

//     return `
//                 <div class="nested-comment">
//                     <div style="display: flex; justify-content: space-between; align-items: flex-start;" onclick="startReply(${reply.id}, '${reply.author}', event)">
//                         <div style="flex: 1;">
//                             <div class="comment-header">
//                                 <span class="comment-author">${reply.author}</span>
//                                 <span class="comment-handle">${reply.handle}</span>
//                                 <span class="comment-meta">• ${reply.time}</span>
//                             </div>
//                             <div class="comment-text">${reply.text}</div>
//                         </div>
//                         ${repliesIndicator}
//                     </div>
//                     ${nestedReplies}
//                 </div>
//             `;
// }

// function renderComment(comment) {
//     const repliesCount = comment.replies.length;
//     const isExpanded = expandedReplies.has(comment.id);

//     const repliesIndicator = repliesCount > 0 ?
//         `<div class="replies-indicator" onclick="toggleReplies(${comment.id}, event)">
//                     <span class="replies-count">${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}</span>
//                     <span class="plus-sign ${isExpanded ? 'expanded' : ''}">+</span>
//                 </div>` : '';

//     const nestedReplies = repliesCount > 0 ?
//         `<div class="nested-replies ${isExpanded ? 'visible' : ''}">
//                     ${comment.replies.map(renderNestedComment).join('')}
//                 </div>` : '';

//     return `
//                 <div class="comment">
//                     <div class="comment-main" onclick="startReply(${comment.id}, '${comment.author}', event)">
//                         <div class="comment-content">
//                             <div class="comment-header">
//                                 <span class="comment-author">${comment.author}</span>
//                                 <span class="comment-handle">${comment.handle}</span>
//                                 <span class="comment-meta">• ${comment.time}</span>
//                             </div>
//                             <div class="comment-text">${comment.text}</div>
//                         </div>
//                         ${repliesIndicator}
//                     </div>
//                     ${nestedReplies}
//                 </div>
//             `;
// }

// function renderComments() {
//     const start = (currentPage - 1) * commentsPerPage;
//     const end = start + commentsPerPage;
//     const commentsToShow = displayedComments.slice(start, end);

//     commentsContainer.innerHTML = commentsToShow.map(renderComment).join('');
//     updateCommentsHeader();
// }

// function updateCommentsHeader() {
//     const countComments = (comments) => {
//         return comments.reduce((total, comment) => {
//             const repliesCount = comment.replies ? countComments(comment.replies) : 0;
//             return total + 1 + repliesCount;
//         }, 0);
//     };

//     const totalComments = countComments(displayedComments);
//     const header = document.querySelector('.comments-header');
//     header.textContent = `${totalComments} ${totalComments === 1 ? 'comment' : 'comments'}`;
// }

// function updatePagination() {
//     const totalPages = Math.ceil(displayedComments.length / commentsPerPage);

//     // Update navigation buttons
//     prevBtn.disabled = currentPage === 1;
//     nextBtn.disabled = currentPage === totalPages;

//     // Update page numbers
//     pageNumbers.innerHTML = '';
//     for (let i = 1; i <= totalPages; i++) {
//         const pageBtn = document.createElement('button');
//         pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
//         pageBtn.textContent = i;
//         pageBtn.onclick = () => goToPage(i);
//         pageNumbers.appendChild(pageBtn);
//     }
// }

// function goToPage(page) {
//     currentPage = page;
//     renderComments();
//     updatePagination();
// }

// function startReply(commentId, author, event) {
//     event.stopPropagation();

//     replyingTo = commentId;
//     replyText.innerHTML = `Replying to <strong>${author}</strong>`;
//     replyIndicator.classList.add('visible');
//     commentInput.focus();
//     commentInput.placeholder = `Reply to ${author}...`;
// }

// function stopReply() {
//     replyingTo = null;
//     replyIndicator.classList.remove('visible');
//     commentInput.placeholder = 'Write a comment...';
// }

// function toggleReplies(commentId, event) {
//     event.stopPropagation();

//     if (expandedReplies.has(commentId)) {
//         expandedReplies.delete(commentId);
//     } else {
//         expandedReplies.add(commentId);
//     }

//     renderComments();
//     updatePagination();
// }

// function findCommentById(comments, id) {
//     for (const comment of comments) {
//         if (comment.id === id) {
//             return comment;
//         }
//         if (comment.replies) {
//             const found = findCommentById(comment.replies, id);
//             if (found) return found;
//         }
//     }
//     return null;
// }

// function addComment() {
//     const text = commentInput.value.trim();
//     if (!text) return;

//     if (replyingTo) {
//         // Find the comment/reply being replied to
//         const targetComment = findCommentById(displayedComments, replyingTo);

//         if (targetComment) {
//             const newReply = {
//                 id: Date.now(),
//                 author: "You",
//                 handle: "@current_user",
//                 time: "just now",
//                 text: text,
//                 replies: []
//             };

//             if (!targetComment.replies) {
//                 targetComment.replies = [];
//             }
//             targetComment.replies.push(newReply);
//             expandedReplies.add(targetComment.id); // Auto-expand to show the new reply
//         }
//         stopReply();
//     } else {
//         // Add as a new comment
//         const newComment = {
//             id: Date.now(),
//             author: "You",
//             handle: "@current_user",
//             time: "just now",
//             text: text,
//             replies: []
//         };

//         displayedComments.unshift(newComment);
//         allComments.unshift(newComment);
//         currentPage = 1;
//     }

//     commentInput.value = '';
//     renderComments();
//     updatePagination();
// }

// // Global functions for onclick handlers
// window.startReply = startReply;
// window.toggleReplies = toggleReplies;

// // Auto-resize textarea
// commentInput.addEventListener('input', function () {
//     this.style.height = 'auto';
//     this.style.height = Math.min(this.scrollHeight, 120) + 'px';
// });

// // Event listeners
// postBtn.addEventListener('click', addComment);
// replyClose.addEventListener('click', stopReply);

// commentInput.addEventListener('keypress', (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//         e.preventDefault();
//         addComment();
//     }
// });

// prevBtn.addEventListener('click', () => {
//     if (currentPage > 1) goToPage(currentPage - 1);
// });

// nextBtn.addEventListener('click', () => {
//     const totalPages = Math.ceil(displayedComments.length / commentsPerPage);
//     if (currentPage < totalPages) goToPage(currentPage + 1);
// });

// // Initialize with all comments
// displayedComments = allComments;
// renderComments();
// updatePagination();

// // Add hover effects to sidebar and author bio
// document.querySelectorAll('.sidebar, .author-bio').forEach(section => {
//     section.addEventListener('mouseenter', function () {
//         this.style.transform = 'translateY(-3px)';
//         this.style.boxShadow = '0 12px 35px rgba(0,0,0,0.08)';
//         this.style.transition = 'all 0.3s ease';
//     });

//     section.addEventListener('mouseleave', function () {
//         this.style.transform = 'translateY(0)';
//         this.style.boxShadow = 'none';
//     });
// });
