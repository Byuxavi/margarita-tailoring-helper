// js/modules/calendar.js - Versión mejorada con mejor manejo de errores

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
        this.initPromise = null;
        this.loadAttempts = 0;
        this.maxLoadAttempts = 2; // Reducido para fallar más rápido
        this.fallbackMode = false;
    }

    /**
     * Inicializar Google Calendar API con Google Identity Services (GIS)
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
            console.log('🔄 Iniciando Google Calendar API con GIS...');

            // Verificar contexto seguro primero
            if (!this._isSecureContext()) {
                console.warn('⚠️ Google Calendar API requires HTTPS context, switching to fallback mode');
                this.fallbackMode = true;
                this.isInitialized = true; // Marcar como inicializado para usar fallback
                return true;
            }

            // Verificar conectividad básica
            const hasNetwork = await this._checkNetworkConnectivity();
            if (!hasNetwork) {
                console.warn('⚠️ Network connectivity issues, switching to fallback mode');
                this.fallbackMode = true;
                this.isInitialized = true;
                return true;
            }

            // Intentar cargar las APIs con timeout más corto
            const loadPromise = Promise.race([
                this._loadAPIs(),
                this._createTimeout(8000, 'API load timeout')
            ]);

            const apisLoaded = await loadPromise;

            if (apisLoaded) {
                await this._initializeAPIs();
                this.isInitialized = true;
                console.log('✅ Google Calendar API inicializada correctamente');
                return true;
            } else {
                throw new Error('Failed to load APIs');
            }

        } catch (error) {
            console.warn('⚠️ Error inicializando Google Calendar API, usando modo fallback:', error.message);
            this.fallbackMode = true;
            this.isInitialized = true; // Marcar como inicializado para usar fallback
            this.initPromise = null;
            return true; // Retornar true porque el fallback está disponible
        }
    }

    /**
     * Verificar si estamos en un contexto seguro
     */
    _isSecureContext() {
        return location.protocol === 'https:' || 
               location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' ||
               location.hostname === '0.0.0.0';
    }

    /**
     * Verificar conectividad de red básica
     */
    async _checkNetworkConnectivity() {
        try {
            const response = await fetch('https://www.google.com/favicon.ico', {
                mode: 'no-cors',
                cache: 'no-cache'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Crear timeout promise
     */
    _createTimeout(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }

    /**
     * Cargar ambas APIs de Google
     */
    async _loadAPIs() {
        try {
            const [gapiLoaded, gsiLoaded] = await Promise.all([
                this._loadGoogleAPI(),
                this._loadGoogleIdentityServices()
            ]);

            return gapiLoaded && gsiLoaded;
        } catch (error) {
            console.error('Error loading Google APIs:', error);
            return false;
        }
    }

    /**
     * Cargar Google API desde CDN
     */
    _loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            const timeout = setTimeout(() => {
                cleanup();
                resolve(false); // No rechazar, solo resolver false
            }, 5000);

            const cleanup = () => {
                clearTimeout(timeout);
                script.remove();
            };

            script.onload = () => {
                cleanup();
                console.log('✅ Google API script cargado');
                resolve(true);
            };
            
            script.onerror = () => {
                cleanup();
                console.warn('⚠️ Failed to load Google API script');
                resolve(false);
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
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            const timeout = setTimeout(() => {
                cleanup();
                resolve(false);
            }, 5000);

            const cleanup = () => {
                clearTimeout(timeout);
                script.remove();
            };

            script.onload = () => {
                cleanup();
                console.log('✅ Google Identity Services cargado');
                resolve(true);
            };
            
            script.onerror = () => {
                cleanup();
                console.warn('⚠️ Failed to load Google Identity Services');
                resolve(false);
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializar ambas APIs
     */
    async _initializeAPIs() {
        if (!window.gapi || !window.google?.accounts) {
            throw new Error('APIs not loaded');
        }

        // Inicializar gapi
        await this._initializeGapi();
        
        // Inicializar cliente de identidad
        await this._initializeIdentityClient();
    }

    /**
     * Inicializar gapi
     */
    _initializeGapi() {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('gapi.load timeout'));
            }, 5000);

            try {
                window.gapi.load('client', {
                    callback: async () => {
                        try {
                            clearTimeout(timeoutId);
                            
                            await window.gapi.client.init({
                                apiKey: this.API_KEY,
                                discoveryDocs: [this.DISCOVERY_DOC]
                            });

                            this.gapi = window.gapi;
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
     * Inicializar cliente de identidad usando GIS
     */
    async _initializeIdentityClient() {
        if (!window.google?.accounts?.oauth2) {
            throw new Error('Google Identity Services not available');
        }

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                    console.error('Token error:', tokenResponse.error);
                    return;
                }
                this.accessToken = tokenResponse.access_token;
                console.log('✅ Token de acceso obtenido');
            },
        });

        console.log('✅ Cliente de identidad inicializado');
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

            if (this.fallbackMode) {
                return false; // En modo fallback, no hay autenticación
            }

            return !!this.accessToken;

        } catch (error) {
            console.warn('Error verificando autenticación:', error);
            return false;
        }
    }

    /**
     * Autenticar usuario con GIS
     */
    async authenticate() {
        try {
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    return false;
                }
            }

            if (this.fallbackMode) {
                console.log('⚠️ En modo fallback, no hay autenticación disponible');
                return false;
            }

            if (this.accessToken) {
                console.log('✅ Ya autenticado');
                return true;
            }

            console.log('🔐 Solicitando autenticación...');
            
            return new Promise((resolve, reject) => {
                const originalCallback = this.tokenClient.callback;
                
                this.tokenClient.callback = (tokenResponse) => {
                    this.tokenClient.callback = originalCallback;
                    
                    if (tokenResponse.error !== undefined) {
                        console.error('❌ Error en autenticación:', tokenResponse.error);
                        resolve(false); // No rechazar, resolver false
                        return;
                    }
                    
                    this.accessToken = tokenResponse.access_token;
                    console.log('✅ Autenticación exitosa');
                    resolve(true);
                };

                this.tokenClient.requestAccessToken({
                    prompt: 'consent'
                });
            });

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            return false;
        }
    }

    /**
     * Crear evento en Google Calendar
     */
    async createAppointmentEvent(appointmentData) {
        try {
            console.log('📅 Creando evento en calendario...');

            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    return this._generateFallbackResponse(appointmentData, 'Calendar API not available');
                }
            }

            // Si estamos en modo fallback, devolver enlace manual directamente
            if (this.fallbackMode) {
                console.log('📅 Usando modo fallback - generando enlace manual');
                return this._generateFallbackResponse(appointmentData, 'Using manual calendar link');
            }

            // Verificar autenticación
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    return this._generateFallbackResponse(appointmentData, 'Authentication failed');
                }
            }

            // Configurar token de acceso
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

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
                event: response.result,
                fallbackLink: this.generateCalendarLink(appointmentData) // Incluir fallback siempre
            };

        } catch (error) {
            console.warn('⚠️ Error creando evento, usando fallback:', error);
            return this._generateFallbackResponse(appointmentData, error.message);
        }
    }

    /**
     * Generar respuesta de fallback con enlace manual
     */
    _generateFallbackResponse(appointmentData, errorMessage) {
        const fallbackLink = this.generateCalendarLink(appointmentData);
        
        return {
            success: false,
            error: errorMessage,
            fallbackLink: fallbackLink,
            message: 'No se pudo agregar automáticamente al calendario. Puedes usar el enlace para agregarlo manualmente.',
            isOnline: navigator.onLine,
            hasSecureContext: this._isSecureContext()
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
     * Revocar token de acceso
     */
    async signOut() {
        try {
            if (this.accessToken && window.google?.accounts?.oauth2) {
                window.google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('✅ Token revocado');
                });
                
                this.accessToken = null;
                
                if (this.gapi?.client) {
                    this.gapi.client.setToken(null);
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
        if (this.fallbackMode) {
            return true; // El enlace manual siempre está disponible
        }
        
        return this.isInitialized && 
               this.gapi && 
               this.gapi.client && 
               this.gapi.client.calendar &&
               this.tokenClient;
    }

    /**
     * Obtener modo actual
     */
    getMode() {
        return this.fallbackMode ? 'fallback' : 'api';
    }

    /**
     * Información de diagnóstico
     */
    getDiagnosticInfo() {
        return {
            isInitialized: this.isInitialized,
            fallbackMode: this.fallbackMode,
            hasSecureContext: this._isSecureContext(),
            isOnline: navigator.onLine,
            hasGapi: !!window.gapi,
            hasGSI: !!window.google?.accounts,
            hasToken: !!this.accessToken
        };
    }
}

// Crear instancia global
const calendarManager = new CalendarManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.calendarManager = calendarManager;
}

export default calendarManager;