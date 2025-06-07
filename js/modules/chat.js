// chat.js - Live chat functionality
import { saveChatMessage, getChatHistory } from './modules/data.js';
import { translateText } from './modules/api.js';
import { renderChatHistory } from './modules/ui.js';

// Initialize chat page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chat page initialized');
    loadChatHistory();
    setupChatForm();
});

// Load and display chat history
function loadChatHistory() {
    const chatHistory = getChatHistory();
    renderChatHistory(chatHistory);
}

// Setup chat form submission
function setupChatForm() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message-input');
    
    if (!form || !input) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const messageText = input.value.trim();
        if (!messageText) return;
        
        // Create message object
        const message = {
            text: messageText,
            sender: 'client',
            timestamp: Date.now()
        };
        
        // Save message
        saveChatMessage(message);
        
        // Clear input
        input.value = '';
        
        // Update chat display
        loadChatHistory();
        
        // Simulate auto-translation (placeholder)
        const translatedText = await translateText(messageText, 'es');
        console.log('Translated message:', translatedText);
        
        // Auto-reply simulation (placeholder for Margarita's response)
        setTimeout(() => {
            const reply = {
                text: 'Thank you for your message! I will respond shortly.',
                sender: 'margarita',
                timestamp: Date.now()
            };
            
            saveChatMessage(reply);
            loadChatHistory();
        }, 1000);
    });
}

// Language toggle functionality
function setupLanguageToggle() {
    const toggleBtn = document.getElementById('language-toggle');
    if (!toggleBtn) return;
    
    let currentLang = 'en';
    
    toggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'es' : 'en';
        toggleBtn.textContent = currentLang === 'en' ? 'Español' : 'English';
        
        // TODO: Implement UI language change
        console.log('Language changed to:', currentLang);
    });
}