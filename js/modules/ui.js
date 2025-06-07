// ui.js - UI rendering and dynamic content management

// Render services list
export function renderServices() {
    const servicesContainer = document.getElementById('services-list');
    if (!servicesContainer) return;
    
    const services = [
        { name: 'Hemming', price: '$15-25', description: 'Professional hemming for pants, skirts, and dresses' },
        { name: 'Zipper Repair', price: '$20-30', description: 'Expert zipper replacement and repair' },
        { name: 'Resizing', price: '$25-45', description: 'Clothing resizing and adjustments' },
        { name: 'Custom Clothing', price: '$50+', description: 'Custom-made clothing and alterations' }
    ];
    
    servicesContainer.innerHTML = services.map(service => `
        <div class="service-card">
            <h3>${service.name}</h3>
            <p class="price">${service.price}</p>
            <p>${service.description}</p>
        </div>
    `).join('');
}

// Render reviews
export function renderReviews(reviews = []) {
    const reviewsContainer = document.getElementById('reviews-list');
    if (!reviewsContainer) return;
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to leave a review!</p>';
        return;
    }
    
    reviewsContainer.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <h4>${review.name}</h4>
                <div class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            </div>
            <p>${review.comment}</p>
            <small>${new Date(review.date).toLocaleDateString()}</small>
        </div>
    `).join('');
}

// Render chat messages
export function renderChatHistory(messages = []) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    chatContainer.innerHTML = messages.map(message => `
        <div class="message ${message.sender}">
            <p>${message.text}</p>
            <small>${new Date(message.timestamp).toLocaleTimeString()}</small>
        </div>
    `).join('');
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show loading spinner
export function showLoading(container) {
    if (container) {
        container.innerHTML = '<div class="loading-spinner">Loading...</div>';
    }
}

// Hide loading spinner
export function hideLoading() {
    const spinners = document.querySelectorAll('.loading-spinner');
    spinners.forEach(spinner => spinner.remove());
}

// Initialize UI components
export function initUI() {
    renderServices();
    console.log('UI module initialized');
}