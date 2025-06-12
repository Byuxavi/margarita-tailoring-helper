// js/modules/email.js
// Módulo para manejar envío de emails con EmailJS

class EmailService {
    constructor() {
        this.serviceId = 'service_xsakmyn';
        this.templateId = 'template_1dt15su';
        this.publicKey = 'vdWmzVZ71cnknMJPF';
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Cargar EmailJS desde CDN
            if (!window.emailjs) {
                await this.loadEmailJS();
            }
            
            // Inicializar EmailJS con la clave pública
            emailjs.init(this.publicKey);
            this.isInitialized = true;
            console.log('EmailJS inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando EmailJS:', error);
            throw error;
        }
    }

    loadEmailJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async sendAppointmentConfirmation(appointmentData, calendarLink = '') {
        try {
            await this.init();

            // Formatear fecha y hora para el email
            const formattedDate = new Date(appointmentData.date).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const formattedTime = appointmentData.time;

            // Preparar datos para el template de EmailJS
            const templateParams = {
                to_name: appointmentData.name,
                to_email: appointmentData.email,
                from_name: 'Margarita León - Tailoring Services',
                reply_to: 'margarita.tailoring@gmail.com',
                
                // Datos de la cita
                client_name: appointmentData.name,
                client_email: appointmentData.email,
                client_phone: appointmentData.phone,
                service_type: appointmentData.service,
                appointment_date: formattedDate,
                appointment_time: formattedTime,
                service_description: appointmentData.description,
                
                // Enlaces útiles
                calendar_link: calendarLink,
                shop_location: 'Salt Lake City, Utah',
                contact_info: 'Teléfono: (801) 555-0123 | Email: margarita.tailoring@gmail.com',
                
                // Mensaje personalizado
                message: `¡Hola ${appointmentData.name}! Tu cita para ${appointmentData.service} ha sido confirmada para el ${formattedDate} a las ${formattedTime}. ${calendarLink ? 'Puedes agregar esta cita a tu calendario usando el enlace incluido.' : ''}`
            };

            console.log('Enviando email con datos:', templateParams);

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            console.log('Email enviado exitosamente:', response);
            return response;

        } catch (error) {
            console.error('Error enviando email:', error);
            throw error;
        }
    }

    async sendTestEmail() {
        try {
            await this.init();
            
            const testParams = {
                to_name: 'Usuario de Prueba',
                to_email: 'test@example.com',
                from_name: 'Margarita León - Tailoring Services',
                message: 'Este es un email de prueba del sistema de citas.'
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                testParams
            );

            console.log('Email de prueba enviado:', response);
            return response;
        } catch (error) {
            console.error('Error en email de prueba:', error);
            throw error;
        }
    }
}

// Crear instancia única del servicio
const emailService = new EmailService();

export { emailService };