// js/modules/calendar.js
// Módulo para integración con Google Calendar API

class CalendarManager {
    constructor() {
        this.CLIENT_ID = '946439619564-icqajnh76akqfipvci6iab7am1s2vqkc.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyCyrePzpyKk0TyxmsOD_DfsugNzsqj100c';
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        
        this.gapi = null;
        this.isInitialized = false;
        this.isSignedIn = false;
    }

    /**
     * Inicializar Google Calendar API
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Cargar Google API desde CDN
            await this.loadGoogleAPI();
            
            // Inicializar gapi
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2', {
                    callback: resolve,
                    onerror: reject
                });
            });

            // Inicializar cliente
            await gapi.client.init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: [this.DISCOVERY_DOC],
                scope: this.SCOPES
            });

            this.gapi = gapi;
            this.isInitialized = true;
            console.log('Google Calendar API inicializada correctamente');

        } catch (error) {
            console.error('Error inicializando Google Calendar API:', error);
            throw new Error('Failed to initialize Google Calendar API');
        }
    }

    /**
     * Cargar Google API desde CDN
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Verificar si el usuario está autenticado
     */
    async checkAuthStatus() {
        if (!this.isInitialized) {
            await this.init();
        }

        const authInstance = this.gapi.auth2.getAuthInstance();
        this.isSignedIn = authInstance.isSignedIn.get();
        return this.isSignedIn;
    }

    /**
     * Autenticar usuario (solicitar permisos)
     */
    async authenticate() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            const authInstance = this.gapi.auth2.getAuthInstance();
            
            if (!authInstance.isSignedIn.get()) {
                await authInstance.signIn();
            }

            this.isSignedIn = true;
            console.log('Usuario autenticado correctamente');
            return true;

        } catch (error) {
            console.error('Error en autenticación:', error);
            throw new Error('Authentication failed');
        }
    }

    /**
     * Crear evento en Google Calendar
     * @param {Object} appointmentData - Datos de la cita
     * @returns {Promise<Object>} Resultado de la creación del evento
     */
    async createAppointmentEvent(appointmentData) {
        try {
            // Verificar autenticación
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                await this.authenticate();
            }

            // Preparar datos del evento
            const event = this.formatEventData(appointmentData);

            // Crear evento en Google Calendar
            const response = await this.gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            console.log('Evento creado exitosamente:', response);

            return {
                success: true,
                eventId: response.result.id,
                htmlLink: response.result.htmlLink,
                event: response.result
            };

        } catch (error) {
            console.error('Error creando evento en calendario:', error);
            
            // Si falla la autenticación, intentar una vez más
            if (error.status === 401) {
                try {
                    await this.authenticate();
                    return await this.createAppointmentEvent(appointmentData);
                } catch (retryError) {
                    console.error('Error en reintento de autenticación:', retryError);
                }
            }

            return {
                success: false,
                error: error.message || 'Failed to create calendar event'
            };
        }
    }

    /**
     * Formatear datos para crear evento de Google Calendar
     * @param {Object} appointmentData - Datos de la cita
     * @returns {Object} Evento formateado para Google Calendar
     */
    formatEventData(appointmentData) {
        // Crear objetos Date para inicio y fin
        const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); // +1 hora

        // Mapear nombres de servicios
        const serviceNames = {
            'hemming': 'Hemming Service',
            'zipper': 'Zipper Repair',
            'resizing': 'Clothing Resizing',
            'custom': 'Custom Clothing',
            'alterations': 'General Alterations'
        };

        const serviceName = serviceNames[appointmentData.service] || appointmentData.service;
        
        // Construir descripción detallada
        let description = `Appointment with Margarita's Tailoring Services\n\n`;
        description += `Service: ${serviceName}\n`;
        description += `Client: ${appointmentData.fullName}\n`;
        description += `Phone: ${appointmentData.phone}\n`;
        description += `Email: ${appointmentData.email}\n`;
        
        if (appointmentData.description) {
            description += `\nService Details:\n${appointmentData.description}`;
        }
        
        if (appointmentData.notes) {
            description += `\nAdditional Notes:\n${appointmentData.notes}`;
        }
        
        description += `\n\nBooking ID: ${appointmentData.id}`;
        description += `\n\nContact Information:`;
        description += `\nMargarita's Tailoring Services`;
        description += `\n123 Main Street, Salt Lake City, UT 84101`;
        description += `\nPhone: (801) 555-0123`;

        return {
            summary: `${serviceName} - Margarita's Tailoring`,
            description: description,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/Denver' // Utah timezone
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'America/Denver'
            },
            location: '123 Main Street, Salt Lake City, UT 84101',
            attendees: [
                {
                    email: appointmentData.email,
                    displayName: appointmentData.fullName
                }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 día antes
                    { method: 'popup', minutes: 60 }       // 1 hora antes
                ]
            },
            colorId: '2' // Verde sage para citas de costura
        };
    }

    /**
     * Generar enlace de Google Calendar (fallback)
     * @param {Object} appointmentData - Datos de la cita
     * @returns {string} URL para añadir evento a Google Calendar
     */
    generateCalendarLink(appointmentData) {
        const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));

        // Formatear fechas para URL de Google Calendar
        const formatDateForGoogle = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const serviceNames = {
            'hemming': 'Hemming Service',
            'zipper': 'Zipper Repair',
            'resizing': 'Clothing Resizing',
            'custom': 'Custom Clothing',
            'alterations': 'General Alterations'
        };

        const serviceName = serviceNames[appointmentData.service] || appointmentData.service;
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `${serviceName} - Margarita's Tailoring`,
            dates: `${formatDateForGoogle(startDateTime)}/${formatDateForGoogle(endDateTime)}`,
            details: `Appointment with Margarita's Tailoring Services\nService: ${serviceName}\nClient: ${appointmentData.fullName}\nPhone: ${appointmentData.phone}`,
            location: '123 Main Street, Salt Lake City, UT 84101',
            ctz: 'America/Denver'
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    /**
     * Cerrar sesión de Google
     */
    async signOut() {
        if (this.isInitialized && this.gapi) {
            const authInstance = this.gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            this.isSignedIn = false;
            console.log('Usuario desconectado del calendario');
        }
    }

    /**
     * Obtener información del usuario autenticado
     */
    getCurrentUser() {
        if (this.isInitialized && this.isSignedIn) {
            const authInstance = this.gapi.auth2.getAuthInstance();
            const user = authInstance.currentUser.get();
            const profile = user.getBasicProfile();
            
            return {
                id: profile.getId(),
                name: profile.getName(),
                email: profile.getEmail(),
                image: profile.getImageUrl()
            };
        }
        return null;
    }
}

// Crear instancia única del manager
const calendarManager = new CalendarManager();

export default calendarManager;