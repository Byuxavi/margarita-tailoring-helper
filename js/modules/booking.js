// Booking Module 
class BookingManager {
    constructor() {
        this.emailConfig = {
            serviceId: 'service_xsakmyn',
            templateId: 'template_1dt15su',
            publicKey: 'vdWmzVZ71cnknMJPF'
        };
        this.init();
    }

    init() {
        this.setupForm();
        this.setupDateValidation();
        this.setupConditionalFields();
        this.setupModal();
        this.loadEmailJS();
        // Removido loadGoogleCalendar() - se maneja desde CalendarManager
    }

    loadEmailJS() {
        if (!window.emailjs) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = () => emailjs.init(this.emailConfig.publicKey);
            document.head.appendChild(script);
        }
    }

    setupForm() {
        const form = document.getElementById('bookingForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit(form);
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                form.reset();
                this.hideAddressSection();
            });
        }
    }

    setupDateValidation() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 3);
            dateInput.max = maxDate.toISOString().split('T')[0];
        }
    }

    setupConditionalFields() {
        const pickupCheckbox = document.getElementById('pickup');
        const addressSection = document.getElementById('addressSection');

        if (pickupCheckbox && addressSection) {
            pickupCheckbox.addEventListener('change', () => {
                if (pickupCheckbox.checked) {
                    this.showAddressSection();
                } else {
                    this.hideAddressSection();
                }
            });
        }
    }

    showAddressSection() {
        const addressSection = document.getElementById('addressSection');
        const addressInput = document.getElementById('address');
        
        if (addressSection && addressInput) {
            addressSection.classList.remove('hidden');
            addressInput.required = true;
        }
    }

    hideAddressSection() {
        const addressSection = document.getElementById('addressSection');
        const addressInput = document.getElementById('address');
        
        if (addressSection && addressInput) {
            addressSection.classList.add('hidden');
            addressInput.required = false;
            addressInput.value = '';
        }
    }

    setupModal() {
        const modal = document.getElementById('successModal');
        const closeBtn = document.getElementById('closeModal');

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }

    showModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    async handleSubmit(form) {
        const submitBtn = document.getElementById('submitBtn');

        try {
            this.setLoadingState(true);

            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());

            if (!this.validateForm(bookingData)) {
                throw new Error('Por favor completa todos los campos requeridos');
            }

            // Guardar reserva
            this.saveBooking(bookingData);

            // Enviar emails (tanto confirmación como notificación)
            await this.sendNotifications(bookingData);

            // Intentar agregar a Google Calendar (opcional)
            await this.tryAddToGoogleCalendar(bookingData);

            this.showModal();
            form.reset();
            this.hideAddressSection();

        } catch (error) {
            console.error('Error submitting booking:', error);
            alert('Hubo un error al enviar tu reserva. Por favor intenta nuevamente.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // NUEVO - Método para intentar agregar a Google Calendar sin bloquear el proceso
    async tryAddToGoogleCalendar(data) {
        try {
            // Verificar si CalendarManager está disponible
            if (window.calendarManager) {
                const appointmentData = {
                    id: Date.now(),
                    fullName: `${data.firstName} ${data.lastName}`,
                    email: data.email,
                    phone: data.phone,
                    service: data.service,
                    appointmentDate: data.date,
                    appointmentTime: data.time,
                    description: data.description,
                    notes: data.address ? `Recolección en: ${data.address}` : null
                };

                await window.calendarManager.createAppointmentEvent(appointmentData);
                console.log('Evento agregado a Google Calendar');
            }
        } catch (error) {
            console.warn('No se pudo agregar a Google Calendar:', error);
            // No bloquear el proceso si falla el calendario
        }
    }

    // CORREGIDO - Enviar tanto email de confirmación como notificación
    async sendNotifications(data) {
        const promises = [];

        // 1. Email de confirmación al cliente
        promises.push(this.sendConfirmationEmail(data));

        // 2. Email de notificación al negocio
        promises.push(this.sendBusinessNotification(data));

        // Ejecutar ambos emails en paralelo
        await Promise.allSettled(promises);
    }

    // NUEVO - Email de confirmación para el cliente
    async sendConfirmationEmail(data) {
        if (!window.emailjs) {
            throw new Error('EmailJS not loaded');
        }

        const templateParams = {
            to_email: data.email, // Email del CLIENTE
            to_name: `${data.firstName} ${data.lastName}`,
            from_name: 'Margarita\'s Tailoring',
            service: data.service,
            date: data.date,
            time: data.time,
            priority: data.priority ? 'Sí' : 'No',
            pickup: data.pickup ? 'Sí' : 'No',
            address: data.address || 'N/A',
            description: data.description || 'Sin descripción adicional',
            subject: 'Confirmación de Cita - Margarita\'s Tailoring',
            message: `Estimado/a ${data.firstName},

Su cita ha sido confirmada exitosamente:

📅 Fecha: ${data.date}
🕐 Hora: ${data.time}
✂️ Servicio: ${data.service}
⚡ Servicio Express: ${data.priority ? 'Sí' : 'No'}
🚗 Recolección a domicilio: ${data.pickup ? 'Sí' : 'No'}
${data.address ? `📍 Dirección: ${data.address}` : ''}

${data.description ? `Detalles adicionales: ${data.description}` : ''}

Si necesita hacer cambios, contáctenos:
📞 (801) 555-0123
📧 info@margaritastailoring.com

¡Gracias por elegir Margarita's Tailoring!`
        };

        return emailjs.send(
            this.emailConfig.serviceId,
            'template_confirmation', // Template específico para confirmación
            templateParams
        );
    }

    // CORREGIDO - Email de notificación para el negocio
    async sendBusinessNotification(data) {
        if (!window.emailjs) {
            throw new Error('EmailJS not loaded');
        }

        const templateParams = {
            to_email: 'info@margaritastailoring.com', // Email del NEGOCIO
            from_name: `${data.firstName} ${data.lastName}`,
            from_email: data.email,
            phone: data.phone,
            service: data.service,
            date: data.date,
            time: data.time,
            priority: data.priority ? 'Sí' : 'No',
            pickup: data.pickup ? 'Sí' : 'No',
            address: data.address || 'N/A',
            description: data.description || 'Sin descripción adicional',
            subject: 'Nueva Reserva de Cita',
            message: `Nueva reserva de cita:
            
Nombre: ${data.firstName} ${data.lastName}
Email: ${data.email}
Teléfono: ${data.phone}
Servicio: ${data.service}
Fecha: ${data.date}
Hora: ${data.time}
Servicio Express: ${data.priority ? 'Sí' : 'No'}
Recolección a domicilio: ${data.pickup ? 'Sí' : 'No'}
${data.address ? `Dirección: ${data.address}` : ''}
${data.description ? `Descripción: ${data.description}` : ''}`
        };

        return emailjs.send(
            this.emailConfig.serviceId,
            this.emailConfig.templateId, // Template para notificaciones de negocio
            templateParams
        );
    }

    validateForm(data) {
        const required = ['firstName', 'lastName', 'email', 'phone', 'service', 'date', 'time'];
        
        for (const field of required) {
            if (!data[field] || data[field].trim() === '') {
                return false;
            }
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return false;
        }

        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(data.phone)) {
            return false;
        }

        return true;
    }

    saveBooking(data) {
        try {
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            const booking = {
                id: Date.now(),
                ...data,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            bookings.push(booking);
            localStorage.setItem('bookings', JSON.stringify(bookings));
        } catch (error) {
            console.warn('No se pudo guardar en localStorage:', error);
            // No bloquear el proceso si falla localStorage
        }
    }

    setLoadingState(loading) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            submitBtn.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    getBookings() {
        try {
            return JSON.parse(localStorage.getItem('bookings') || '[]');
        } catch (error) {
            console.warn('Error reading bookings:', error);
            return [];
        }
    }

    getBooking(id) {
        const bookings = this.getBookings();
        return bookings.find(booking => booking.id === id);
    }
}

// Initialize booking manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('bookingForm')) {
        window.bookingManager = new BookingManager();
    }
});

export default BookingManager;