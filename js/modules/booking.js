// booking.js - Versión corregida
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
                console.log('✅ EmailJS already loaded');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('EmailJS load timeout'));
            }, 15000); // Aumenté el timeout

            script.onload = () => {
                clearTimeout(timeout);
                try {
                    if (window.emailjs) {
                        emailjs.init(this.emailConfig.publicKey);
                        console.log('✅ EmailJS loaded and initialized');
                        resolve();
                    } else {
                        throw new Error('EmailJS not available after load');
                    }
                } catch (error) {
                    console.error('Error initializing EmailJS:', error);
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
            this.showErrorNotification('Sistema no inicializado. Por favor recarga la página.');
            return;
        }

        try {
            this.setLoadingState(true);

            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());

            // Agregar valores de checkboxes manualmente si no están
            bookingData.priority = document.getElementById('priority').checked;
            bookingData.pickup = document.getElementById('pickup').checked;

            console.log('📧 Datos del formulario:', bookingData);

            if (!this.validateForm(bookingData)) {
                throw new Error('Por favor completa todos los campos requeridos');
            }

            console.log('📧 Enviando email con datos:', bookingData);

            // Enviar email principal al negocio
            await this.sendBookingEmail(bookingData);

            // Guardar reserva localmente (opcional, no crítico)
            this.saveBooking(bookingData);

            // Mostrar éxito
            this.showModal();
            form.reset();
            this.hideAddressSection();

            this.showSuccessNotification('¡Reserva enviada exitosamente! Recibirás confirmación pronto.');

        } catch (error) {
            console.error('❌ Error enviando reserva:', error);
            this.showErrorNotification('Error al enviar la reserva. Por favor intenta nuevamente o contacta por teléfono.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async sendBookingEmail(data) {
        if (!window.emailjs) {
            throw new Error('EmailJS no está disponible');
        }

        // Mapear nombres de servicios para mostrar en español
        const serviceNames = {
            'alteraciones-basicas': 'Alteraciones Básicas ($25-50)',
            'reparaciones': 'Reparaciones ($15-35)', 
            'ajustes-formales': 'Ajustes Formales ($40-80)',
            'vestidos-novia': 'Vestidos de Novia ($150-300)',
            'diseno-personalizado': 'Diseño Personalizado (Cotización)'
        };

        const serviceName = serviceNames[data.service] || data.service;

        // Preparar parámetros que coinciden exactamente con tu plantilla HTML
        const templateParams = {
            // Variables principales de tu plantilla
            from_name: `${data.firstName} ${data.lastName}`.trim(),
            from_email: data.email.trim(),
            phone: data.phone.trim(),
            service: serviceName,
            date: this.formatDate(data.date),
            time: this.formatTime(data.time),
            priority: data.priority ? 'Sí (+$20)' : 'No',
            pickup: data.pickup ? 'Sí (+$15)' : 'No',
            address: data.address ? data.address.trim() : 'No aplica',
            description: data.description ? data.description.trim() : 'Sin descripción adicional',
            
            // Variables adicionales para el subject y mensaje general
            to_email: 'info@margaritastailoring.com',
            subject: `Nueva Reserva - ${data.firstName} ${data.lastName}`,
            
            // Mensaje completo como backup
            message: this.createFullMessage(data, serviceName)
        };

        console.log('📧 Parámetros del email:', templateParams);

        try {
            const result = await emailjs.send(
                this.emailConfig.serviceId,
                this.emailConfig.templateId,
                templateParams
            );

            console.log('✅ Email enviado exitosamente:', result);
            
            // Verificar el status de la respuesta
            if (result.status === 200) {
                console.log('✅ Confirmación: Email entregado correctamente');
            } else {
                console.warn('⚠️ Email enviado pero status inesperado:', result.status);
            }
            
            return result;

        } catch (error) {
            console.error('❌ Error detallado enviando email:', error);
            
            // Proporcionar más información sobre el error
            let errorMessage = 'Error desconocido enviando email';
            
            if (error.status === 400) {
                errorMessage = 'Error en los datos del formulario - Verifica que todos los campos estén completos';
            } else if (error.status === 401) {
                errorMessage = 'Error de autenticación con EmailJS - Verifica las credenciales';
            } else if (error.status === 403) {
                errorMessage = 'Acceso denegado a EmailJS - Verifica la configuración';
            } else if (error.status === 404) {
                errorMessage = 'Template o Service ID no encontrado en EmailJS';
            } else if (error.status >= 500) {
                errorMessage = 'Error del servidor de EmailJS - Intenta más tarde';
            } else if (error.text) {
                errorMessage = `Error EmailJS: ${error.text}`;
            }

            throw new Error(errorMessage);
        }
    }

    // Métodos utilitarios para formatear datos
    formatDate(dateString) {
        try {
            const date = new Date(dateString + 'T00:00:00'); // Evitar problemas de timezone
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Error formateando fecha:', error);
            return dateString;
        }
    }

    formatTime(timeString) {
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.warn('Error formateando hora:', error);
            return timeString;
        }
    }

    createFullMessage(data, serviceName) {
        let message = `NUEVA RESERVA DE CITA\n\n`;
        message += `Nombre: ${data.firstName} ${data.lastName}\n`;
        message += `Email: ${data.email}\n`;
        message += `Teléfono: ${data.phone}\n`;
        message += `Servicio: ${serviceName}\n`;
        message += `Fecha: ${this.formatDate(data.date)}\n`;
        message += `Hora: ${this.formatTime(data.time)}\n`;
        message += `Servicio Express: ${data.priority ? 'Sí (+$20)' : 'No'}\n`;
        message += `Recolección a domicilio: ${data.pickup ? 'Sí (+$15)' : 'No'}\n`;
        
        if (data.address) {
            message += `Dirección de recolección: ${data.address}\n`;
        }
        
        if (data.description) {
            message += `\nDescripción adicional:\n${data.description}\n`;
        }

        message += `\n---\nReserva realizada el ${new Date().toLocaleString('es-ES')}`;
        
        return message;
    }

    validateForm(data) {
        const required = ['firstName', 'lastName', 'email', 'phone', 'service', 'date', 'time'];
        
        for (const field of required) {
            if (!data[field] || data[field].toString().trim() === '') {
                console.error(`❌ Campo requerido faltante: ${field}`);
                this.showErrorNotification(`El campo ${this.getFieldDisplayName(field)} es requerido`);
                return false;
            }
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            console.error('❌ Formato de email inválido');
            this.showErrorNotification('Por favor ingresa un email válido');
            return false;
        }

        // Validar teléfono básico
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(data.phone.toString().trim())) {
            console.error('❌ Formato de teléfono inválido');
            this.showErrorNotification('Por favor ingresa un teléfono válido');
            return false;
        }

        // Si requiere recolección, validar dirección
        if (data.pickup && (!data.address || data.address.toString().trim() === '')) {
            console.error('❌ Dirección requerida para recolección');
            this.showErrorNotification('La dirección es requerida para el servicio de recolección');
            return false;
        }

        return true;
    }

    getFieldDisplayName(field) {
        const fieldNames = {
            firstName: 'Nombre',
            lastName: 'Apellido', 
            email: 'Email',
            phone: 'Teléfono',
            service: 'Servicio',
            date: 'Fecha',
            time: 'Hora',
            address: 'Dirección'
        };
        return fieldNames[field] || field;
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
            console.log('✅ Reserva guardada localmente');
        } catch (error) {
            console.warn('⚠️ No se pudo guardar localmente:', error);
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

    // Métodos de notificación
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
            
            // Crear notificación visual simple
            this.createSimpleNotification(message, type);
        }
    }

    createSimpleNotification(message, type) {
        // Crear una notificación visual básica si no hay sistema principal
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background-color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remover
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, type === 'error' ? 8000 : 5000);
    }

    // Métodos utilitarios públicos
    isReady() {
        return this.isInitialized && window.emailjs;
    }

    getBookings() {
        try {
            return JSON.parse(localStorage.getItem('bookings') || '[]');
        } catch (error) {
            console.warn('Error reading bookings:', error);
            return [];
        }
    }
}

// Inicializar BookingManager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('bookingForm')) {
        window.bookingManager = new BookingManager();
        console.log('🚀 BookingManager inicializado');
    }
});

// Hacer BookingManager disponible globalmente si es necesario
window.BookingManager = BookingManager;