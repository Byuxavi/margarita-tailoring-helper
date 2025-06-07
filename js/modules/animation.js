// animations.js - Animation triggers and effects

// Fade in animation
export function fadeIn(element, duration = 500) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        
        element.style.opacity = percentage;
        
        if (percentage < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// Slide in from left animation
export function slideInLeft(element, duration = 500) {
    element.style.transform = 'translateX(-100%)';
    element.style.transition = `transform ${duration}ms ease-out`;
    
    setTimeout(() => {
        element.style.transform = 'translateX(0)';
    }, 10);
}

// Bounce animation for buttons
export function bounceButton(button) {
    button.style.transform = 'scale(0.95)';
    button.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 100);
}

// Scroll reveal animation
export function setupScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-reveal');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements with scroll-reveal class
    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
}

// Button hover effects
export function setupButtonAnimations() {
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => bounceButton(button));
    });
}

// Loading animation
export function showLoadingAnimation(container) {
    container.innerHTML = `
        <div class="loading-animation">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

// Initialize animations
export function initAnimations() {
    setupScrollReveal();
    setupButtonAnimations();
    console.log('Animations module initialized');
}