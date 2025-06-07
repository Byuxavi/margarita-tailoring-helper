// data.js - localStorage management and data operations

// Data keys for localStorage
const KEYS = {
    APPOINTMENTS: 'tailoring_appointments',
    REVIEWS: 'tailoring_reviews',
    CHAT_HISTORY: 'tailoring_chat_history'
};

// Save data to localStorage
export function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

// Load data from localStorage
export function loadData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

// Appointment management
export function saveAppointment(appointment) {
    const appointments = loadData(KEYS.APPOINTMENTS) || [];
    appointment.id = Date.now();
    appointments.push(appointment);
    return saveData(KEYS.APPOINTMENTS, appointments);
}

export function getAppointments() {
    return loadData(KEYS.APPOINTMENTS) || [];
}

// Reviews management
export function saveReview(review) {
    const reviews = loadData(KEYS.REVIEWS) || [];
    review.id = Date.now();
    review.date = new Date().toISOString();
    reviews.push(review);
    return saveData(KEYS.REVIEWS, reviews);
}

export function getReviews() {
    return loadData(KEYS.REVIEWS) || [];
}

// Chat history management
export function saveChatMessage(message) {
    const chatHistory = loadData(KEYS.CHAT_HISTORY) || [];
    message.timestamp = Date.now();
    chatHistory.push(message);
    return saveData(KEYS.CHAT_HISTORY, chatHistory);
}

export function getChatHistory() {
    return loadData(KEYS.CHAT_HISTORY) || [];
}

// Initialize data module
export function initData() {
    console.log('Data module initialized');
}