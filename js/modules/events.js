// events.js - Event handlers for user interactions

// Navigation event handlers
export function handleNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                window.location.href = href;
            }
        });
    });
}

// Form submission handlers
export function handleFormSubmissions() {
    // Booking form handler
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
    
    // Review form handler
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
    
    // Chat form handler
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }
}

// Booking form submission
function handleBookingSubmit(e) {
    e.preventDefault();
    // TODO: Implement booking logic in Week 6
    console.log('Booking form submitted');
}

// Review form submission
function handleReviewSubmit(e) {
    e.preventDefault();
    // TODO: Implement review logic in Week 6
    console.log('Review form submitted');
}

// Chat form submission
function handleChatSubmit(e) {
    e.preventDefault();
    // TODO: Implement chat logic in Week 6
    console.log('Chat form submitted');
}

// Mobile menu toggle
export function handleMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('mobile-open');
        });
    }
}

// Initialize all event handlers
export function initEvents() {
    handleNavigation();
    handleFormSubmissions();
    handleMobileMenu();
    console.log('Event handlers initialized');
}