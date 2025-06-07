// main.js - Main entry point for Margarita's Tailoring Helper
import { initAPI } from './modules/api.js';
import { initData } from './modules/data.js';
import { initEvents } from './modules/events.js';
import { initUI } from './modules/ui.js';
import { initAnimations } from './modules/animations.js';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Margarita\'s Tailoring Helper - Initializing...');
    
    // Initialize core modules
    initData();
    initAPI();
    initUI();
    initEvents();
    initAnimations();
    
    console.log('Application initialized successfully');
});