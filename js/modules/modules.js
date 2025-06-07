// Data management module for localStorage operations
// Handles appointments, chat messages, reviews, and user preferences

/**
 * Base localStorage manager class
 */
class StorageManager {
    constructor(prefix = 'margarita_tailoring') {
        this.prefix = prefix;
    }

    /**
     * Generate storage key with prefix
     * @param {string} key - Storage key
     * @returns {string} Prefixed key
     */
    getKey(key) {
        return `${this.prefix}_${key}`;
    }

    /**
     * Store data in localStorage
     * @param {string} key - Storage key
     * @param {*} data - Data to store
     */
    set(key, data) {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(this.getKey(key), serializedData);
        } catch (error) {
            console.error('Error storing data:', error);
        }
    }

    /**
     * Retrieve data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Retrieved data
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.getKey(key));
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error retrieving data:', error);
            return defaultValue;
        }
    }

    /**
     * Remove data from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(this.getKey(key));
        } catch (error) {
            console.error('Error removing data:', error);
        }
    }

    /**
     * Clear all data with current prefix
     */
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing data:', error);
        }
    }

    /**
     * Get all keys with current prefix
     * @returns {Array<string>} Array of keys
     */
    getAllKeys() {
        try {
            const keys = Object.keys(localStorage);
            return keys
                .filter(key => key.startsWith(this.getKey('')))
                .map(key => key.replace(this.getKey(''), ''));
        } catch (error) {
            console.error('Error getting all keys:', error);
            return [];
        }
    }
}

/**
 * Appointment data management
 */
export class AppointmentManager extends StorageManager {
    constructor() {
        super('margarita_appointments');
    }

    /**
     * Save new appointment
     * @param {Object} appointment - Appointment data
     * @returns {string} Appointment ID
     */
    saveAppointment(appointment) {
        const appointmentId = this.generateId();
        const appointmentData = {
            id: appointmentId,
            ...appointment,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        // Get existing appointments
        const appointments = this.getAllAppointments();
        appointments.push(appointmentData);

        // Store updated appointments list
        this.set('list', appointments);
        
        console.log('Appointment saved:', appointmentData);
        return appointmentId;
    }

    /**
     * Get all appointments
     * @returns {Array<Object>} Array of appointments
     */
    getAllAppointments() {
        return this.get('list', []);
    }

    /**
     * Get appointment by ID
     * @param {string} id - Appointment ID
     * @returns {Object|null} Appointment data
     */
    getAppointment(id) {
        const appointments = this.getAllAppointments();
        return appointments.find(apt => apt.id === id) || null;
    }

    /**
     * Update appointment status
     * @param {string} id - Appointment ID
     * @param {string} status - New status
     */
    updateAppointmentStatus(id, status) {
        const appointments = this.getAllAppointments();
        const appointmentIndex = appointments.findIndex(apt => apt.id === id);
        
        if (appointmentIndex !== -1) {
            appointments[appointmentIndex].status = status;
            appointments[appointmentIndex].updatedAt = new Date().toISOString();
            this.set('list', appointments);
        }
    }

    /**
     * Delete appointment
     * @param {string} id - Appointment ID
     */
    deleteAppointment(id) {
        const appointments = this.getAllAppointments();
        const filteredAppointments = appointments.filter(apt => apt.id !== id);
        this.set('list', filteredAppointments);
    }

    /**
     * Generate unique appointment ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get appointments by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array<Object>} Filtered appointments
     */
    getAppointmentsByDateRange(startDate, endDate) {
        const appointments = this.getAllAppointments();
        return appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= startDate && aptDate <= endDate;
        });
    }
}

/**
 * Chat messages management
 */
export class ChatManager extends StorageManager {
    constructor() {
        super('margarita_chat');
    }

    /**
     * Save chat message
     * @param {Object} message - Message data
     */
    saveMessage(message) {
        const messageData = {
            id: this.generateMessageId(),
            ...message,
            timestamp: new Date().toISOString()
        };

        const messages = this.getAllMessages();
        messages.push(messageData);

        // Keep only last 100 messages to prevent storage overflow
        if (messages.length > 100) {
            messages.splice(0, messages.length - 100);
        }

        this.set('messages', messages);
        return messageData;
    }

    /**
     * Get all chat messages
     * @returns {Array<Object>} Array of messages
     */
    getAllMessages() {
        return this.get('messages', []);
    }

    /**
     * Get messages by conversation ID
     * @param {string} conversationId - Conversation ID
     * @returns {Array<Object>} Filtered messages
     */
    getMessagesByConversation(conversationId) {
        const messages = this.getAllMessages();
        return messages.filter(msg => msg.conversationId === conversationId);
    }

    /**
     * Clear chat history
     */
    clearChatHistory() {
        this.remove('messages');
    }

    /**
     * Generate unique message ID
     * @returns {string} Unique ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update message translation
     * @param {string} messageId - Message ID
     * @param {string} translation - Translated text
     */
    updateMessageTranslation(messageId, translation) {
        const messages = this.getAllMessages();
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            messages[messageIndex].translation = translation;
            this.set('messages', messages);
        }
    }
}

/**
 * Reviews and comments management
 */
export class ReviewsManager extends StorageManager {
    constructor() {
        super('margarita_reviews');
    }

    /**
     * Save new review
     * @param {Object} review - Review data
     * @returns {string} Review ID
     */
    saveReview(review) {
        const reviewId = this.generateReviewId();
        const reviewData = {
            id: reviewId,
            ...review,
            createdAt: new Date().toISOString(),
            approved: false // Reviews need approval by default
        };

        const reviews = this.getAllReviews();
        reviews.push(reviewData);
        this.set('list', reviews);

        return reviewId;
    }

    /**
     * Get all reviews
     * @param {boolean} approvedOnly - Return only approved reviews
     * @returns {Array<Object>} Array of reviews
     */
    getAllReviews(approvedOnly = false) {
        const reviews = this.get('list', []);
        return approvedOnly ? reviews.filter(review => review.approved) : reviews;
    }

    /**
     * Get review by ID
     * @param {string} id - Review ID
     * @returns {Object|null} Review data
     */
    getReview(id) {
        const reviews = this.getAllReviews();
        return reviews.find(review => review.id === id) || null;
    }

    /**
     * Approve review
     * @param {string} id - Review ID
     */
    approveReview(id) {
        const reviews = this.getAllReviews();
        const reviewIndex = reviews.findIndex(review => review.id === id);
        
        if (reviewIndex !== -1) {
            reviews[reviewIndex].approved = true;
            reviews[reviewIndex].approvedAt = new Date().toISOString();
            this.set('list', reviews);
        }
    }

    /**
     * Delete review
     * @param {string} id - Review ID
     */
    deleteReview(id) {
        const reviews = this.getAllReviews();
        const filteredReviews = reviews.filter(review => review.id !== id);
        this.set('list', filteredReviews);
    }

    /**
     * Generate unique review ID
     * @returns {string} Unique ID
     */
    generateReviewId() {
        return `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get average rating
     * @returns {number} Average rating
     */
    getAverageRating() {
        const reviews = this.getAllReviews(true);
        if (reviews.length === 0) return 0;

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        return Math.round((totalRating / reviews.length) * 10) / 10;
    }

    /**
     * Get reviews by rating
     * @param {number} rating - Rating to filter by
     * @returns {Array<Object>} Filtered reviews
     */
    getReviewsByRating(rating) {
        const reviews = this.getAllReviews(true);
        return reviews.filter(review => review.rating === rating);
    }
}

/**
 * User preferences and settings management
 */
export class PreferencesManager extends StorageManager {
    constructor() {
        super('margarita_preferences');
    }

    /**
     * Save user language preference
     * @param {string} language - Language code (es, en, etc.)
     */
    setLanguage(language) {
        this.set('language', language);
    }

    /**
     * Get user language preference
     * @returns {string} Language code
     */
    getLanguage() {
        return this.get('language', 'es'); // Default to Spanish
    }

    /**
     * Save theme preference
     * @param {string} theme - Theme name (light, dark)
     */
    setTheme(theme) {
        this.set('theme', theme);
    }

    /**
     * Get theme preference
     * @returns {string} Theme name
     */
    getTheme() {
        return this.get('theme', 'light');
    }

    /**
     * Save notification preferences
     * @param {Object} notifications - Notification settings
     */
    setNotificationPreferences(notifications) {
        this.set('notifications', notifications);
    }

    /**
     * Get notification preferences
     * @returns {Object} Notification settings
     */
    getNotificationPreferences() {
        return this.get('notifications', {
            email: true,
            browser: true,
            appointments: true,
            reviews: true
        });
    }

    /**
     * Save user contact information
     * @param {Object} contact - Contact information
     */
    setContactInfo(contact) {
        this.set('contact', contact);
    }

    /**
     * Get user contact information
     * @returns {Object} Contact information
     */
    getContactInfo() {
        return this.get('contact', {});
    }
}

// Export singleton instances
export const appointmentManager = new AppointmentManager();
export const chatManager = new ChatManager();
export const reviewsManager = new ReviewsManager();
export const preferencesManager = new PreferencesManager();