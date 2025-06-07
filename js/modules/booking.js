// booking.js - Booking page specific functionality
import { saveAppointment } from './modules/data.js';
import { sendEmail } from './modules/api.js';
import { fadeIn } from './modules/animations.js';

// Initialize booking page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Booking page initialized');
    setupBookingForm();
    setupServiceSelection();
});

// Setup booking form validation and submission
function setupBookingForm() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const appointment = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            service: formData.get('service'),
            date: formData.get('date'),
            time: formData.get('time'),
            notes: formData.get('notes')
        };
        
        // Basic validation
        if (!appointment.name || !appointment.email || !appointment.service) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        // Save appointment
        if (saveAppointment(appointment)) {
            showMessage('Appointment booked successfully!', 'success');
            form.reset();
            
            // Send confirmation email (placeholder)
            await sendEmail({
                to_email: appointment.email,
                appointment_details: appointment
            });
        } else {
            showMessage('Error booking appointment. Please try again.', 'error');
        }
    });
}

// Setup service selection
function setupServiceSelection() {
    const serviceSelect = document.getElementById('service');
    if (!serviceSelect) return;
    
    const services = [
        { value: 'hemming', text: 'Hemming ($15-25)' },
        { value: 'zipper', text: 'Zipper Repair ($20-30)' },
        { value: 'resizing', text: 'Resizing ($25-45)' },
        { value: 'custom', text: 'Custom Clothing ($50+)' }
    ];
    
    serviceSelect.innerHTML = '<option value="">Select a service...</option>' + 
        services.map(service => `<option value="${service.value}">${service.text}</option>`).join('');
}

// Show success/error messages
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const form = document.getElementById('booking-form');
    form.insertAdjacentElement('beforebegin', messageDiv);
    
    fadeIn(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}