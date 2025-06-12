// js/modules/calendar.js - Google Calendar API Corregido

class CalendarManager {
    constructor() {
        this.CLIENT_ID = '946439619564-icqajnh76akqfipvci6iab7am1s2vqkc.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyCyrePzpyKk0TyxmsOD_DfsugNzsqj100c';
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        
        this.gapi = null;
        this.googleAuth = null;
        this.isInitialized = false;
        this.isApiLoaded = false;
        this.initPromise = null;
        this.loadAttempts = 0;
        this.maxLoadAttempts = 3;
    }

    /**
     * Inicializar Google Calendar API con manejo robusto de errores
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        if (this.isInitialized) {
            return Promise.resolve(true);
        }

        this.initPromise = this._performInit();
        return this.initPromise;
    }

    async _performInit() {
        try {
            console.log('Iniciando Google Calendar API...');

            // Verificar contexto seguro
            if (!this._isSecureContext()) {
                console.warn('Google Calendar API requires HTTPS context');
                return false;
            }

            // Cargar Google API con reintentos
            const apiLoaded = await this._loadGoogleAPIWithRetry();
            if (!apiLoaded) {
                throw new Error('Failed to load Google API after multiple attempts');
            }

            // Inicializar gapi.load con configuración corregida
            await this._initializeGapi();

            // Configurar cliente
            await this._initializeClient();

            this.isInitialized = true;
            console.log('✅ Google Calendar API inicializada correctamente');
            return true;

        } catch (error) {
            console.error('❌ Error inicializando Google Calendar API:', error);
            this.isInitialized = false;
            this.initPromise = null;
            
            // No lanzar error para no bloquear la aplicación
            return false;
        }
    }

    /**
     * Verificar si estamos en un contexto seguro
     */
    _isSecureContext() {
        return location.protocol === 'https:' || 
               location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1';
    }

    /**
     * Cargar Google API con reintentos
     */
    async _loadGoogleAPIWithRetry() {
        while (this.loadAttempts < this.maxLoadAttempts) {
            try {
                this.loadAttempts++;
                console.log(`Intento ${this.loadAttempts} - Cargando Google API...`);
                
                await this._loadGoogleAPI();
                this.isApiLoaded = true;
                return true;
                
            } catch (error) {
                console.warn(`Intento ${this.loadAttempts} falló:`, error);
                
                if (this.loadAttempts < this.maxLoadAttempts) {
                    // Esperar before retry (exponential backoff)
                    const delay = Math.pow(2, this.loadAttempts) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        return false;
    }

    /**
     * Cargar Google API desde CDN
     */
    _loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            // Si ya está cargado, resolver inmediatamente
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            // Timeout más corto pero manejado correctamente
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('Google API load timeout (8s)'));
            }, 8000);

            script.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Google API script cargado');
                resolve();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('Failed to load Google API script'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializar gapi.load con configuración corregida
     */
    _initializeGapi() {
        return new Promise((resolve, reject) => {
            if (!window.gapi) {
                reject(new Error('gapi not available'));
                return;
            }

            // CORRECCIÓN: Configurar timeout correctamente
            const timeoutId = setTimeout(() => {
                reject(new Error('gapi.load timeout'));
            }, 10000);

            try {
                window.gapi.load('client:auth2', {
                    callback: () => {
                        clearTimeout(timeoutId);
                        console.log('✅ gapi client:auth2 cargado');
                        resolve();
                    },
                    onerror: (error) => {
                        clearTimeout(timeoutId);
                        reject(error || new Error('gapi.load failed'));
                    }
                    // REMOVIDO: timeout parameter que causaba el error
                });
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Inicializar cliente de Google API
     */
    async _initializeClient() {
        try {
            await window.gapi.client.init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: [this.DISCOVERY_DOC],
                scope: this.SCOPES
            });

            this.gapi = window.gapi;
            console.log('✅ Cliente de Google API inicializado');

        } catch (error) {
            console.error('Error inicializando cliente:', error);
            throw error;
        }
    }

    /**
     * Verificar estado de autenticación
     */
    async checkAuthStatus() {
        try {
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) return false;
            }

            if (!this.gapi?.auth2) {
                return false;
            }

            const authInstance = this.gapi.auth2.getAuthInstance();
            if (!authInstance) {
                return false;
            }

            const isSignedIn = authInstance.isSignedIn.get();
            console.log('Estado de autenticación:', isSignedIn);
            return isSignedIn;

        } catch (error) {
            console.warn('Error verificando autenticación:', error);
            return false;
        }
    }

    /**
     * Autenticar usuario con manejo mejorado
     */
    async authenticate() {
        try {
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    throw new Error('API not initialized');
                }
            }

            const authInstance = this.gapi.auth2.getAuthInstance();
            if (!authInstance) {
                throw new Error('Auth instance not available');
            }

            if (authInstance.isSignedIn.get()) {
                console.log('✅ Ya autenticado');
                return true;
            }

            console.log('🔐 Solicitando autenticación...');
            
            // Configurar opciones de autenticación
            const signInOptions = {
                scope: this.SCOPES,
                prompt: 'consent',
                include_granted_scopes: true
            };

            const user = await authInstance.signIn(signInOptions);
            
            if (user && authInstance.isSignedIn.get()) {
                console.log('✅ Autenticación exitosa');
                return true;
            } else {
                throw new Error('Sign-in was not successful');
            }

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            
            // Mostrar mensaje específico según el tipo de error
            if (error.error === 'popup_blocked_by_browser') {
                console.warn('Popup bloqueado por el navegador');
            } else if (error.error === 'access_denied') {
                console.warn('Usuario denegó acceso');
            }
            
            return false;
        }
    }

    /**
     * Crear evento en Google Calendar con manejo robusto
     */
    async createAppointmentEvent(appointmentData) {
        try {
            console.log('📅 Creando evento en calendario...');

            // Verificar disponibilidad de la API
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    return this._generateFallbackResponse(appointmentData, 'API not available');
                }
            }

            // Verificar autenticación
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    return this._generateFallbackResponse(appointmentData, 'Authentication failed');
                }
            }

            // Formatear evento
            const event = this.formatEventData(appointmentData);

            // Crear evento
            const response = await this.gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                sendNotifications: true
            });

            console.log('✅ Evento creado exitosamente:', response.result.id);

            return {
                success: true,
                eventId: response.result.id,
                htmlLink: response.result.htmlLink,
                event: response.result
            };

        } catch (error) {
            console.warn('⚠️ Error creando evento:', error);
            return this._generateFallbackResponse(appointmentData, error.message);
        }
    }

    /**
     * Generar respuesta de fallback con enlace manual
     */
    _generateFallbackResponse(appointmentData, errorMessage) {
        return {
            success: false,
            error: errorMessage,
            fallbackLink: this.generateCalendarLink(appointmentData),
            message: 'No se pudo agregar automáticamente. Usa el enlace para agregar manualmente.'
        };
    }

    /**
     * Formatear datos del evento (sin cambios)
     */
    formatEventData(appointmentData) {
        const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));

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
        
        let description = `Cita con Margarita's Tailoring Services\n\n`;
        description += `Servicio: ${serviceName}\n`;
        description += `Cliente: ${appointmentData.fullName}\n`;
        description += `Teléfono: ${appointmentData.phone}\n`;
        description += `Email: ${appointmentData.email}\n`;
        
        if (appointmentData.description) {
            description += `\nDetalles: ${appointmentData.description}`;
        }
        
        if (appointmentData.notes) {
            description += `\nNotas: ${appointmentData.notes}`;
        }

        return {
            summary: `${serviceName} - Margarita's Tailoring`,
            description: description,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/Denver'
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
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 }
                ]
            },
            colorId: '2',
            status: 'confirmed'
        };
    }

    /**
     * Generar enlace manual de Google Calendar
     */
    generateCalendarLink(appointmentData) {
        try {
            const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
            const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));

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
                details: `Servicio: ${serviceName}\nCliente: ${appointmentData.fullName}\nTeléfono: ${appointmentData.phone}`,
                location: '88 W 50 S Unit E2, Centerville, UT 84014',
                ctz: 'America/Denver'
            });

            return `https://calendar.google.com/calendar/render?${params.toString()}`;
        } catch (error) {
            console.error('Error generando enlace:', error);
            return 'https://calendar.google.com/calendar/';
        }
    }

    /**
     * Cerrar sesión
     */
    async signOut() {
        try {
            if (this.isInitialized && this.gapi?.auth2) {
                const authInstance = this.gapi.auth2.getAuthInstance();
                if (authInstance && authInstance.isSignedIn.get()) {
                    await authInstance.signOut();
                    console.log('✅ Sesión cerrada');
                }
            }
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    }

    /**
     * Verificar disponibilidad del servicio
     */
    isAvailable() {
        return this.isInitialized && 
               this.gapi && 
               this.gapi.client && 
               this.gapi.client.calendar;
    }

    /**
     * Obtener información del usuario
     */
    getCurrentUser() {
        try {
            if (this.isInitialized && this.gapi?.auth2) {
                const authInstance = this.gapi.auth2.getAuthInstance();
                if (authInstance && authInstance.isSignedIn.get()) {
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
            console.error('Error obteniendo usuario:', error);
        }
        return null;
    }
}

// Crear instancia global
const calendarManager = new CalendarManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.calendarManager = calendarManager;
}

export default calendarManager;