// comments.js - Reviews and comments functionality
import { saveReview, getReviews } from './modules/data.js';
import { translateText } from './modules/api.js';
import { renderReviews } from './modules/ui.js';
import { fadeIn } from './modules/animations.js';

// Initialize comments page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Comments page initialized');
    loadReviews();
    setupReviewForm();
    setupStarRating();
});

// Load and display reviews
function loadReviews() {
    const reviews = getReviews();
    renderReviews(reviews);
}

// Setup review form submission
function setupReviewForm() {
    const form = document.getElementById('review-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const review = {
            name: formData.get('name'),
            rating: parseInt(formData.get('rating')),
            comment: formData.get('comment')
        };
        
        // Basic validation
        if (!review.name || !review.rating || !review.comment) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
        
        // Save review
        if (saveReview(review)) {
            showMessage('Review submitted successfully!', 'success');
            form.reset();
            resetStarRating();
            loadReviews();
            
            // Auto-translate review (placeholder)
            const translatedComment = await translateText(review.comment, 'es');
            console.log('Review translated:', translatedComment);
        } else {
            showMessage('Error submitting review. Please try again.', 'error');
        }
    });
}

// Setup interactive star rating
function setupStarRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating-input');
    
    if (!stars.length || !ratingInput) return;
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const rating = index + 1;
            ratingInput.value = rating;
            updateStarDisplay(rating);
        });
        
        star.addEventListener('mouseover', () => {
            updateStarDisplay(index + 1, true);
        });
    });
    
    // Reset on mouse leave
    const starContainer = document.querySelector('.star-rating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', () => {
            const currentRating = parseInt(ratingInput.value) || 0;
            updateStarDisplay(currentRating);
        });
    }
}

// Update star display
function updateStarDisplay(rating, isHover = false) {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add(isHover ? 'hover' : 'active');
            star.classList.remove(isHover ? 'active' : 'hover');
        } else {
            star.classList.remove('active', 'hover');
        }
    });
}

// Reset star rating
function resetStarRating() {
    const ratingInput = document.getElementById('rating-input');
    if (ratingInput) ratingInput.value = '';
    updateStarDisplay(0);
}

// Show success/error messages
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const form = document.getElementById('review-form');
    form.insertAdjacentElement('beforebegin', messageDiv);
    
    fadeIn(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}