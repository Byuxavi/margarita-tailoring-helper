// booking.js - Fixed Version
class BookingManager {
    constructor() {
        this.emailConfig = {
            serviceId: 'service_xsakmyn',
            templateId: 'template_1dt15su',
            publicKey: 'vdWmzVZ71cnknMJPF'
        };
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.setupForm();
            this.setupDateValidation();
            this.setupConditionalFields();
            this.setupModal();
            await this.loadEmailJS();
            this.isInitialized = true;
            console.log('✅ BookingManager initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing BookingManager:', error);
        }
    }

    async loadEmailJS() {
        return new Promise((resolve, reject) => {
            if (window.emailjs) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('EmailJS load timeout'));
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);
                try {
                    emailjs.init(this.emailConfig.publicKey);
                    console.log('✅ EmailJS loaded and initialized');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('Failed to load EmailJS'));
            };
            
            document.head.appendChild(script);
        });
    }

    setupForm() {
        const form = document.getElementById('bookingForm');
        if (!form) {
            console.warn('Booking form not found');
            return;
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(form);
        });

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
        if (!this.isInitialized) {
            console.warn('BookingManager not initialized yet');
            return;
        }

        try {
            this.setLoadingState(true);

            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());

            if (!this.validateForm(bookingData)) {
                throw new Error('Por favor completa todos los campos requeridos');
            }

            // Guardar reserva primero
            this.saveBooking(bookingData);

            // Enviar notificaciones por email
            await this.sendNotifications(bookingData);

            // Intentar agregar a Google Calendar (no crítico)
            this.tryAddToGoogleCalendar(bookingData).catch(error => {
                console.warn('Calendar integration failed:', error);
            });

            // Mostrar éxito
            this.showModal();
            form.reset();
            this.hideAddressSection();

            // Mostrar notificación de éxito
            this.showSuccessNotification('¡Reserva enviada exitosamente!');

        } catch (error) {
            console.error('Error submitting booking:', error);
            this.showErrorNotification('Hubo un error al enviar tu reserva. Por favor intenta nuevamente.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Método mejorado para Google Calendar (no bloquea el proceso)
    async tryAddToGoogleCalendar(data) {
        try {
            // Verificar si CalendarManager está disponible y inicializado
            if (!window.calendarManager) {
                console.warn('CalendarManager not available');
                return null;
            }

            const appointmentData = {
                id: Date.now(),
                fullName: `${data.firstName} ${data.lastName}`,
                email: data.email,
                phone: data.phone,
                service: data.service,
                appointmentDate: data.date,
                appointmentTime: data.time,
                description: data.description || '',
                notes: data.address ? `Recolección en: ${data.address}` : null
            };

            const result = await window.calendarManager.createAppointmentEvent(appointmentData);
            
            if (result.success) {
                console.log('✅ Evento agregado a Google Calendar:', result.eventId);
                this.showSuccessNotification('¡También se agregó a tu Google Calendar!');
            } else {
                console.warn('⚠️ Calendar integration failed:', result.error);
                // Mostrar enlace de fallback si está disponible
                if (result.fallbackLink) {
                    this.showCalendarFallback(result.fallbackLink);
                }
            }

            return result;

        } catch (error) {
            console.warn('Calendar integration error:', error);
            return null;
        }
    }

    showCalendarFallback(link) {
        const modal = document.getElementById('successModal');
        if (modal) {
            const existingLink = modal.querySelector('.calendar-fallback');
            if (!existingLink) {
                const linkElement = document.createElement('div');
                linkElement.className = 'calendar-fallback';
                linkElement.innerHTML = `
                    <p class="text-sm text-gray-600 mt-4">
                        <a href="${link}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                            Haz clic aquí para agregar manualmente a tu calendario
                        </a>
                    </p>
                `;
                modal.querySelector('.modal-content').appendChild(linkElement);
            }
        }
    }

    // Método mejorado para enviar notificaciones
    async sendNotifications(data) {
        if (!window.emailjs) {
            throw new Error('EmailJS not available');
        }

        const promises = [];

        // Email de confirmación al cliente
        promises.push(
            this.sendConfirmationEmail(data).catch(error => {
                console.error('Error sending confirmation email:', error);
                return { error: 'confirmation_failed' };
            })
        );

        // Email de notificación al negocio
        promises.push(
            this.sendBusinessNotification(data).catch(error => {
                console.error('Error sending business notification:', error);
                return { error: 'business_notification_failed' };
            })
        );

        const results = await Promise.allSettled(promises);
        
        // Verificar resultados
        const confirmationResult = results[0];
        const businessResult = results[1];

        let hasErrors = false;

        if (confirmationResult.status === 'rejected' || confirmationResult.value?.error) {
            console.warn('Confirmation email failed');
            hasErrors = true;
        }

        if (businessResult.status === 'rejected' || businessResult.value?.error) {
            console.warn('Business notification failed');
            hasErrors = true;
        }

        if (hasErrors) {
            console.warn('Some email notifications failed, but booking was saved');
        } else {
            console.log('✅ All email notifications sent successfully');
        }
    }

    // Email de confirmación para el cliente
    async sendConfirmationEmail(data) {
        const serviceNames = {
            'alteraciones-basicas': 'Alteraciones Básicas',
            'reparaciones': 'Reparaciones',
            'ajustes-formales': 'Ajustes Formales',
            'vestidos-novia': 'Vestidos de Novia',
            'diseno-personalizado': 'Diseño Personalizado',
            'hemming': 'Hemming Service',
            'zipper': 'Zipper Repair',
            'resizing': 'Clothing Resizing',
            'custom': 'Custom Clothing',
            'alterations': 'General Alterations'
        };

        const serviceName = serviceNames[data.service] || data.service;

        const templateParams = {
            to_email: data.email,
            to_name: `${data.firstName} ${data.lastName}`,
            from_name: 'Margarita\'s Tailoring',
            service: serviceName,
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
✂️ Servicio: ${serviceName}
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
            'template_confirmation',
            templateParams
        );
    }

    // Email de notificación para el negocio
    async sendBusinessNotification(data) {
        const serviceNames = {
            'alteraciones-basicas': 'Alteraciones Básicas',
            'reparaciones': 'Reparaciones',
            'ajustes-formales': 'Ajustes Formales',
            'vestidos-novia': 'Vestidos de Novia',
            'diseno-personalizado': 'Diseño Personalizado',
            'hemming': 'Hemming Service',
            'zipper': 'Zipper Repair',
            'resizing': 'Clothing Resizing',
            'custom': 'Custom Clothing',
            'alterations': 'General Alterations'
        };

        const serviceName = serviceNames[data.service] || data.service;

        const templateParams = {
            to_email: 'info@margaritastailoring.com',
            from_name: `${data.firstName} ${data.lastName}`,
            from_email: data.email,
            phone: data.phone,
            service: serviceName,
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
Servicio: ${serviceName}
Fecha: ${data.date}
Hora: ${data.time}
Servicio Express: ${data.priority ? 'Sí' : 'No'}
Recolección a domicilio: ${data.pickup ? 'Sí' : 'No'}
${data.address ? `Dirección: ${data.address}` : ''}
${data.description ? `Descripción: ${data.description}` : ''}`
        };

        return emailjs.send(
            this.emailConfig.serviceId,
            this.emailConfig.templateId,
            templateParams
        );
    }

    validateForm(data) {
        const required = ['firstName', 'lastName', 'email', 'phone', 'service', 'date', 'time'];
        
        for (const field of required) {
            if (!data[field] || data[field].trim() === '') {
                console.error(`Required field missing: ${field}`);
                return false;
            }
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            console.error('Invalid email format');
            return false;
        }

        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(data.phone)) {
            console.error('Invalid phone format');
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
            console.log('✅ Booking saved to localStorage');
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
            // No bloquear el proceso si falla localStorage
        }
    }

    setLoadingState(loading) {
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;

        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        if (loading) {
            if (btnText) btnText.classList.add('hidden');
            if (btnLoading) btnLoading.classList.remove('hidden');
            submitBtn.disabled = true;
        } else {
            if (btnText) btnText.classList.remove('hidden');
            if (btnLoading) btnLoading.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    // Métodos de notificación mejorados
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }

    showErrorNotification(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Usar el sistema de notificaciones de la app principal si está disponible
        if (window.App && window.App.showNotification) {
            window.App.showNotification(message, type);
        } else {
            // Fallback simple
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Mostrar alert como último recurso
            if (type === 'error') {
                alert(message);
            }
        }
    }

    // Métodos utilitarios
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

    // Método para verificar estado
    isReady() {
        return this.isInitialized && window.emailjs;
    }

    // Método para reinicializar si es necesario
    async reinitialize() {
        this.isInitialized = false;
        return this.init();
    }
}

// Inicializar BookingManager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('bookingForm')) {
        window.bookingManager = new BookingManager();
    }
});

export default BookingManager;