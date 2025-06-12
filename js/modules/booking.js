// Booking Module - CON INTEGRACIÓN GOOGLE CALENDAR
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
        this.loadGoogleCalendar(); // NUEVO
    }

    loadEmailJS() {
        if (!window.emailjs) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = () => emailjs.init(this.emailConfig.publicKey);
            document.head.appendChild(script);
        }
    }

    // NUEVO - Cargar Google Calendar API
    loadGoogleCalendar() {
        if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => this.initGoogleCalendar();
            document.head.appendChild(script);
        }
    }

    // NUEVO - Inicializar Google Calendar
    async initGoogleCalendar() {
        try {
            await new Promise(resolve => gapi.load('client:auth2', resolve));
            await gapi.client.init({
                apiKey: 'AIzaSyCyrePzpyKk0TyxmsOD_DfsugNzsqj100c',
                clientId: '946439619564-icqajnh76akqfipvci6iab7am1s2vqkc.apps.googleusercontent.com',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.events'
            });
            console.log('Google Calendar API listo');
        } catch (error) {
            console.warn('Google Calendar no disponible:', error);
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

            // Enviar email
            await this.sendEmailNotification(bookingData);

            // NUEVO - Agregar a Google Calendar
            await this.addToGoogleCalendar(bookingData);

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

    // NUEVO - Agregar evento a Google Calendar
    async addToGoogleCalendar(data) {
        try {
            if (!window.gapi || !gapi.client.calendar) {
                console.warn('Google Calendar API no disponible');
                return;
            }

            // Verificar autenticación
            const authInstance = gapi.auth2.getAuthInstance();
            if (!authInstance.isSignedIn.get()) {
                await authInstance.signIn();
            }

            // Crear evento
            const startDateTime = new Date(`${data.date}T${data.time}`);
            const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));

            const event = {
                summary: `${data.service} - Margarita's Tailoring`,
                description: `Cliente: ${data.firstName} ${data.lastName}\nTeléfono: ${data.phone}\nEmail: ${data.email}\n${data.description ? `Detalles: ${data.description}` : ''}`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'America/Denver'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'America/Denver'
                },
                location: '88 W 50 S Unit E2, Centerville, UT 84014',
                attendees: [{ email: data.email }],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 60 }
                    ]
                }
            };

            await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            console.log('Evento agregado a Google Calendar');
        } catch (error) {
            console.warn('No se pudo agregar a Google Calendar:', error);
            // No bloquear el proceso si falla el calendario
        }
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
        const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        const booking = {
            id: Date.now(),
            ...data,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        bookings.push(booking);
        localStorage.setItem('bookings', JSON.stringify(bookings));
    }

    async sendEmailNotification(data) {
        if (!window.emailjs) {
            throw new Error('EmailJS not loaded');
        }

        const templateParams = {
            to_email: 'info@margaritastailoring.com',
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
            this.emailConfig.templateId,
            templateParams
        );
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
        return JSON.parse(localStorage.getItem('bookings') || '[]');
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