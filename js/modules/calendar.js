// js/modules/calendar.js

class CalendarManager {
    constructor() {
        this.CLIENT_ID = '946439619564-icqajnh76akqfipvci6iab7am1s2vqkc.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyCyrePzpyKk0TyxmsOD_DfsugNzsqj100c';
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        
        this.gapi = null;
        this.isInitialized = false;
        this.isSignedIn = false;
        this.initPromise = null; // Para evitar múltiples inicializaciones
    }

    /**
     * Inicializar Google Calendar API
     */
    async init() {
        // Si ya está inicializando, retornar la promesa existente
        if (this.initPromise) {
            return this.initPromise;
        }

        // Si ya está inicializado, retornar exitosamente
        if (this.isInitialized) {
            return Promise.resolve();
        }

        // Crear nueva promesa de inicialización
        this.initPromise = this._performInit();
        return this.initPromise;
    }

    async _performInit() {
        try {
            // Verificar si estamos en un contexto seguro (HTTPS)
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                throw new Error('Google Calendar API requires HTTPS');
            }

            // Cargar Google API desde CDN
            await this.loadGoogleAPI();
            
            // Inicializar gapi con timeout
            await Promise.race([
                new Promise((resolve, reject) => {
                    gapi.load('client:auth2', {
                        callback: resolve,
                        onerror: reject,
                        timeout: 5000 // 5 segundos de timeout
                    });
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('GAPI load timeout')), 5000)
                )
            ]);

            // Inicializar cliente con configuración corregida
            await gapi.client.init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: [this.DISCOVERY_DOC],
                scope: this.SCOPES,
                // Configuraciones adicionales para evitar errores de CORS
                hosted_domain: undefined,
                ux_mode: 'popup',
                redirect_uri: window.location.origin
            });

            this.gapi = gapi;
            this.isInitialized = true;
            console.log('Google Calendar API inicializada correctamente');
            
            return Promise.resolve();

        } catch (error) {
            console.error('Error inicializando Google Calendar API:', error);
            this.isInitialized = false;
            this.initPromise = null;
            
            // No lanzar error para no bloquear la aplicación
            return Promise.resolve();
        }
    }

    /**
     * Cargar Google API desde CDN con timeout
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('Google API load timeout'));
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('Failed to load Google API'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Verificar si el usuario está autenticado
     */
    async checkAuthStatus() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.gapi || !this.gapi.auth2) {
                return false;
            }

            const authInstance = this.gapi.auth2.getAuthInstance();
            if (!authInstance) {
                return false;
            }

            this.isSignedIn = authInstance.isSignedIn.get();
            return this.isSignedIn;
        } catch (error) {
            console.warn('Error checking auth status:', error);
            return false;
        }
    }

    /**
     * Autenticar usuario (solicitar permisos)
     */
    async authenticate() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.gapi || !this.gapi.auth2) {
                throw new Error('Google API not initialized');
            }

            const authInstance = this.gapi.auth2.getAuthInstance();
            if (!authInstance) {
                throw new Error('Auth instance not available');
            }
            
            if (!authInstance.isSignedIn.get()) {
                // Configurar opciones de sign-in
                const signInOptions = {
                    scope: this.SCOPES,
                    prompt: 'consent'
                };
                
                await authInstance.signIn(signInOptions);
            }

            this.isSignedIn = true;
            console.log('Usuario autenticado correctamente');
            return true;

        } catch (error) {
            console.error('Error en autenticación:', error);
            this.isSignedIn = false;
            
            // Retornar false en lugar de lanzar error
            return false;
        }
    }

    /**
     * Crear evento en Google Calendar
     * @param {Object} appointmentData - Datos de la cita
     * @returns {Promise<Object>} Resultado de la creación del evento
     */
    async createAppointmentEvent(appointmentData) {
        try {
            // Verificar inicialización
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.gapi || !this.gapi.client || !this.gapi.client.calendar) {
                console.warn('Google Calendar API not available');
                return { success: false, error: 'API not available' };
            }

            // Verificar autenticación
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    return { success: false, error: 'Authentication failed' };
                }
            }

            // Preparar datos del evento
            const event = this.formatEventData(appointmentData);

            // Crear evento en Google Calendar
            const response = await this.gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                sendNotifications: true
            });

            console.log('Evento creado exitosamente:', response);

            return {
                success: true,
                eventId: response.result.id,
                htmlLink: response.result.htmlLink,
                event: response.result
            };

        } catch (error) {
            console.warn('Error creando evento en calendario:', error);
            
            // Intentar reautenticación una sola vez
            if (error.status === 401 && !this._retryAuth) {
                this._retryAuth = true;
                try {
                    const authSuccess = await this.authenticate();
                    if (authSuccess) {
                        const result = await this.createAppointmentEvent(appointmentData);
                        this._retryAuth = false;
                        return result;
                    }
                } catch (retryError) {
                    console.error('Error en reintento:', retryError);
                }
                this._retryAuth = false;
            }

            return {
                success: false,
                error: error.message || 'Failed to create calendar event',
                fallbackLink: this.generateCalendarLink(appointmentData)
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

        const serviceName = serviceNames[appointmentData.service] || appointmentData.service;
        
        // Construir descripción detallada
        let description = `Cita con Margarita's Tailoring Services\n\n`;
        description += `Servicio: ${serviceName}\n`;
        description += `Cliente: ${appointmentData.fullName}\n`;
        description += `Teléfono: ${appointmentData.phone}\n`;
        description += `Email: ${appointmentData.email}\n`;
        
        if (appointmentData.description) {
            description += `\nDetalles del servicio:\n${appointmentData.description}`;
        }
        
        if (appointmentData.notes) {
            description += `\nNotas adicionales:\n${appointmentData.notes}`;
        }
        
        description += `\n\nID de reserva: ${appointmentData.id}`;
        description += `\n\nInformación de contacto:`;
        description += `\nMargarita's Tailoring Services`;
        description += `\n88 W 50 S Unit E2, Centerville, UT 84014`;
        description += `\nTeléfono: (801) 555-0123`;

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
            location: '88 W 50 S Unit E2, Centerville, UT 84014',
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
            colorId: '2', // Verde sage para citas de costura
            status: 'confirmed'
        };
    }

    /**
     * Generar enlace de Google Calendar (fallback)
     * @param {Object} appointmentData - Datos de la cita
     * @returns {string} URL para añadir evento a Google Calendar
     */
    generateCalendarLink(appointmentData) {
        try {
            const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
            const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));

            // Formatear fechas para URL de Google Calendar
            const formatDateForGoogle = (date) => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const serviceNames = {
                'alteraciones-basicas': 'Alteraciones Básicas',
                'reparaciones': 'Reparaciones',
                'ajustes-formales': 'Ajustes Formales',
                'vestidos-novia': 'Vestidos de Novia',
                'diseno-personalizado': 'Diseño Personalizado'
            };

            const serviceName = serviceNames[appointmentData.service] || appointmentData.service;
            
            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: `${serviceName} - Margarita's Tailoring`,
                dates: `${formatDateForGoogle(startDateTime)}/${formatDateForGoogle(endDateTime)}`,
                details: `Cita con Margarita's Tailoring Services\nServicio: ${serviceName}\nCliente: ${appointmentData.fullName}\nTeléfono: ${appointmentData.phone}`,
                location: '88 W 50 S Unit E2, Centerville, UT 84014',
                ctz: 'America/Denver'
            });

            return `https://calendar.google.com/calendar/render?${params.toString()}`;
        } catch (error) {
            console.error('Error generating calendar link:', error);
            return 'https://calendar.google.com/calendar/';
        }
    }

    /**
     * Cerrar sesión de Google
     */
    async signOut() {
        try {
            if (this.isInitialized && this.gapi && this.gapi.auth2) {
                const authInstance = this.gapi.auth2.getAuthInstance();
                if (authInstance) {
                    await authInstance.signOut();
                    this.isSignedIn = false;
                    console.log('Usuario desconectado del calendario');
                }
            }
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    /**
     * Obtener información del usuario autenticado
     */
    getCurrentUser() {
        try {
            if (this.isInitialized && this.isSignedIn && this.gapi && this.gapi.auth2) {
                const authInstance = this.gapi.auth2.getAuthInstance();
                if (authInstance) {
                    const user = authInstance.currentUser.get();
                    const profile = user.getBasicProfile();
                    
                    return {
                        id: profile.getId(),
                        name: profile.getName(),
                        email: profile.getEmail(),
                        image: profile.getImageUrl()
                    };
                }
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
        return null;
    }

    /**
     * Método para verificar si el servicio está disponible
     */
    isAvailable() {
        return this.isInitialized && this.gapi && this.gapi.client && this.gapi.client.calendar;
    }
}

// Crear instancia única del manager
const calendarManager = new CalendarManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.calendarManager = calendarManager;
}

export default calendarManager;