// js/modules/calendar.js - Migrado a Google Identity Services (GIS)

class CalendarManager {
    constructor() {
        this.CLIENT_ID = '946439619564-icqajnh76akqfipvci6iab7am1s2vqkc.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyCyrePzpyKk0TyxmsOD_DfsugNzsqj100c';
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        
        this.gapi = null;
        this.tokenClient = null;
        this.accessToken = null;
        this.isInitialized = false;
        this.isApiLoaded = false;
        this.isGisLoaded = false;
        this.initPromise = null;
        this.loadAttempts = 0;
        this.maxLoadAttempts = 3;
    }

    /**
     * Inicializar Google Calendar API con Google Identity Services
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
            console.log('Iniciando Google Calendar API con GIS...');

            // Verificar contexto seguro
            if (!this._isSecureContext()) {
                console.warn('Google Calendar API requires HTTPS context');
                return false;
            }

            // Cargar ambas librerías en paralelo
            const [gapiLoaded, gisLoaded] = await Promise.all([
                this._loadGoogleAPIWithRetry(),
                this._loadGoogleIdentityServices()
            ]);

            if (!gapiLoaded || !gisLoaded) {
                throw new Error('Failed to load required Google libraries');
            }

            // Inicializar gapi client (solo para API calls, no para auth)
            await this._initializeGapiClient();

            // Inicializar Google Identity Services
            await this._initializeGIS();

            this.isInitialized = true;
            console.log('✅ Google Calendar API inicializada correctamente con GIS');
            return true;

        } catch (error) {
            console.error('❌ Error inicializando Google Calendar API:', error);
            this.isInitialized = false;
            this.initPromise = null;
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
        let attempts = 0;
        while (attempts < this.maxLoadAttempts) {
            try {
                attempts++;
                console.log(`Intento ${attempts} - Cargando Google API...`);
                
                await this._loadGoogleAPI();
                this.isApiLoaded = true;
                return true;
                
            } catch (error) {
                console.warn(`Intento ${attempts} falló:`, error);
                
                if (attempts < this.maxLoadAttempts) {
                    const delay = Math.pow(2, attempts) * 1000;
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
                console.log('✅ Google API script cargado');
                resolve();
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('Failed to load Google API script'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Cargar Google Identity Services
     */
    _loadGoogleIdentityServices() {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('Google Identity Services load timeout'));
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Google Identity Services cargado');
                this.isGisLoaded = true;
                resolve();
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('Failed to load Google Identity Services'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializar gapi client (solo para API calls)
     */
    _initializeGapiClient() {
        return new Promise((resolve, reject) => {
            if (!window.gapi) {
                reject(new Error('gapi not available'));
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('gapi.load timeout'));
            }, 10000);

            try {
                window.gapi.load('client', {
                    callback: async () => {
                        try {
                            await window.gapi.client.init({
                                apiKey: this.API_KEY,
                                discoveryDocs: [this.DISCOVERY_DOC]
                            });
                            
                            this.gapi = window.gapi;
                            clearTimeout(timeoutId);
                            console.log('✅ gapi client inicializado');
                            resolve();
                        } catch (error) {
                            clearTimeout(timeoutId);
                            reject(error);
                        }
                    },
                    onerror: (error) => {
                        clearTimeout(timeoutId);
                        reject(error || new Error('gapi.load failed'));
                    }
                });
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Inicializar Google Identity Services
     */
    _initializeGIS() {
        return new Promise((resolve, reject) => {
            try {
                if (!window.google?.accounts?.oauth2) {
                    reject(new Error('Google Identity Services not available'));
                    return;
                }

                // Inicializar el cliente OAuth2
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: (response) => {
                        if (response.error) {
                            console.error('Error en OAuth callback:', response.error);
                            return;
                        }
                        
                        this.accessToken = response.access_token;
                        console.log('✅ Token de acceso obtenido');
                        
                        // Configurar el token en gapi
                        if (this.gapi?.client) {
                            this.gapi.client.setToken({
                                access_token: this.accessToken
                            });
                        }
                    }
                });

                console.log('✅ Google Identity Services inicializado');
                resolve();

            } catch (error) {
                reject(error);
            }
        });
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

            // Con GIS, verificamos si tenemos un token válido
            if (this.accessToken && this.gapi?.client?.getToken()) {
                console.log('Estado de autenticación: autenticado');
                return true;
            }

            console.log('Estado de autenticación: no autenticado');
            return false;

        } catch (error) {
            console.warn('Error verificando autenticación:', error);
            return false;
        }
    }

    /**
     * Autenticar usuario con Google Identity Services
     */
    async authenticate() {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.isInitialized) {
                    const initialized = await this.init();
                    if (!initialized) {
                        reject(new Error('API not initialized'));
                        return;
                    }
                }

                if (!this.tokenClient) {
                    reject(new Error('Token client not available'));
                    return;
                }

                // Verificar si ya tenemos un token válido
                if (await this.checkAuthStatus()) {
                    console.log('✅ Ya autenticado');
                    resolve(true);
                    return;
                }

                console.log('🔐 Solicitando autenticación...');

                // Configurar callback temporal para esta autenticación
                const originalCallback = this.tokenClient.callback;
                this.tokenClient.callback = (response) => {
                    // Restaurar callback original
                    this.tokenClient.callback = originalCallback;
                    
                    if (response.error) {
                        console.error('❌ Error en autenticación:', response.error);
                        reject(new Error(response.error));
                        return;
                    }
                    
                    this.accessToken = response.access_token;
                    console.log('✅ Autenticación exitosa');
                    
                    // Configurar el token en gapi
                    if (this.gapi?.client) {
                        this.gapi.client.setToken({
                            access_token: this.accessToken
                        });
                    }
                    
                    resolve(true);
                };

                // Solicitar token
                this.tokenClient.requestAccessToken({
                    prompt: 'consent'
                });

            } catch (error) {
                console.error('❌ Error en autenticación:', error);
                reject(error);
            }
        });
    }

    /**
     * Crear evento en Google Calendar
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
                try {
                    await this.authenticate();
                } catch (authError) {
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
     * Formatear datos del evento
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
            if (this.accessToken) {
                // Revocar token
                window.google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('✅ Token revocado');
                });
                
                this.accessToken = null;
                
                // Limpiar token de gapi
                if (this.gapi?.client) {
                    this.gapi.client.setToken(null);
                }
                
                console.log('✅ Sesión cerrada');
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
               this.gapi.client.calendar &&
               this.tokenClient;
    }

    /**
     * Obtener información del usuario (simplificado con GIS)
     */
    getCurrentUser() {
        try {
            if (this.accessToken) {
                // Con GIS necesitarías hacer una llamada adicional a la API de Google
                // para obtener la información del usuario. Por simplicidad, retornamos null
                return null;
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