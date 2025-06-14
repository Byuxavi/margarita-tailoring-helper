// js/main.js - Orquestador principal de la aplicación
import { initLocation } from './modules/location.js';
import BookingManager from './modules/booking.js';
import calendarManager from './modules/calendar.js';

class App {
    constructor() {
        this.modules = new Map();
        this.isInitialized = false;
        this.initStartTime = Date.now();
        this.config = {
            maxInitTime: 15000, // 15 segundos máximo para inicialización
            moduleTimeout: 10000, // 10 segundos por módulo
            retryAttempts: 1
        };
        
        // Estado de módulos
        this.moduleStatus = {
            booking: 'pending',
            calendar: 'pending',
            location: 'pending'
        };
    }

    /**
     * Inicializar aplicación principal
     */
    async init() {
        try {
            console.log('🚀 Iniciando Margarita\'s Tailoring App...');
            
            // Configurar manejadores globales de error
            this.setupGlobalErrorHandlers();
            
            // Inicializar módulos
            await this.initModules();
            
            this.isInitialized = true;
            
            // Configurar notificaciones de usuario
            this.setupUserNotifications();
            
            const initTime = Date.now() - this.initStartTime;
            console.log(`✅ App inicializada en ${initTime}ms`);
            
            // Mostrar estado de módulos al usuario
            this.displayModuleStatus();
            
        } catch (error) {
            console.error('❌ Error crítico inicializando app:', error);
            this.handleCriticalError(error);
        }
    }

    /**
     * Inicializar todos los módulos de forma segura
     */
    async initModules() {
        console.log('📦 Inicializando módulos...');
        
        const moduleInitializers = [
            { name: 'booking', init: () => this.safeInitModule('booking', () => this.initBookingModule()) },
            { name: 'calendar', init: () => this.safeInitModule('calendar', () => this.initCalendarIntegration()) },
            { name: 'location', init: () => this.safeInitModule('location', () => this.initLocationModule()) }
        ];

        // Inicializar módulos en paralelo con manejo de errores individual
        const results = await Promise.allSettled(
            moduleInitializers.map(module => module.init())
        );

        // Procesar resultados
        results.forEach((result, index) => {
            const moduleName = moduleInitializers[index].name;
            
            if (result.status === 'fulfilled' && result.value) {
                this.moduleStatus[moduleName] = 'success';
                console.log(`✅ Módulo ${moduleName} inicializado correctamente`);
            } else {
                this.moduleStatus[moduleName] = 'error';
                const error = result.status === 'rejected' ? result.reason : 'Unknown error';
                console.warn(`⚠️ Módulo ${moduleName} falló: ${error.message || error}`);
            }
        });

        // Verificar si al menos el módulo de booking está funcionando (crítico)
        if (this.moduleStatus.booking !== 'success') {
            throw new Error('Critical booking module failed to initialize');
        }

        console.log('📦 Inicialización de módulos completada');
    }

    /**
     * Inicializar un módulo de forma segura con timeout y reintentos
     */
    async safeInitModule(moduleName, initFunction, retries = this.config.retryAttempts) {
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                console.log(`🔄 Inicializando ${moduleName}${attempt > 0 ? ` (intento ${attempt + 1})` : ''}...`);
                
                // Ejecutar con timeout
                const initPromise = initFunction();
                const timeoutPromise = this.createTimeout(
                    this.config.moduleTimeout, 
                    `${moduleName} initialization timeout`
                );
                
                const result = await Promise.race([initPromise, timeoutPromise]);
                
                if (result !== false) {
                    return true;
                }
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ ${moduleName} falló en intento ${attempt + 1}:`, error.message);
                
                if (attempt < retries) {
                    await this.delay(1000 * (attempt + 1)); // Backoff exponencial
                }
            }
        }
        
        // Si llegamos aquí, todos los intentos fallaron
        console.error(`❌ ${moduleName} falló después de ${retries + 1} intentos:`, lastError);
        return false;
    }

    /**
     * Inicializar módulo de reservas (crítico)
     */
    async initBookingModule() {
        try {
            // El BookingManager se inicializa automáticamente en su constructor
            // Solo verificamos que esté disponible
            if (window.bookingManager) {
                this.modules.set('booking', window.bookingManager);
                console.log('✅ BookingManager ya inicializado');
                return true;
            }
            
            // Si no existe, crear una nueva instancia
            const bookingManager = new BookingManager();
            this.modules.set('booking', bookingManager);
            
            // Esperar a que se inicialice completamente
            let attempts = 0;
            const maxAttempts = 20; // 10 segundos
            
            while (!bookingManager.isReady() && attempts < maxAttempts) {
                await this.delay(500);
                attempts++;
            }
            
            if (bookingManager.isReady()) {
                console.log('✅ BookingManager inicializado correctamente');
                return true;
            } else {
                console.warn('⚠️ BookingManager inicializado pero no completamente listo');
                return true; // Aún permitir continuar
            }
            
        } catch (error) {
            console.error('❌ Error inicializando BookingManager:', error);
            throw error;
        }
    }

    /**
     * Inicializar integración con Google Calendar
     */
    async initCalendarIntegration() {
        try {
            console.log('📅 Inicializando Google Calendar...');
            
            // Inicializar el calendar manager
            const initialized = await calendarManager.init();
            
            if (initialized) {
                this.modules.set('calendar', calendarManager);
                
                const mode = calendarManager.getMode();
                const diagnostic = calendarManager.getDiagnosticInfo();
                
                console.log('📅 Calendar Manager Status:', {
                    mode: mode,
                    ...diagnostic
                });
                
                if (mode === 'fallback') {
                    console.log('📅 Google Calendar en modo fallback - Enlaces manuales disponibles');
                } else {
                    console.log('✅ Google Calendar API inicializada correctamente');
                }
                
                return true;
            } else {
                throw new Error('Calendar manager initialization failed');
            }
            
        } catch (error) {
            console.warn('⚠️ Error inicializando Google Calendar:', error);
            
            // Intentar usar el calendar manager en modo fallback
            if (calendarManager.isAvailable()) {
                this.modules.set('calendar', calendarManager);
                console.log('📅 Google Calendar disponible en modo fallback');
                return true;
            }
            
            throw error;
        }
    }

    /**
     * Inicializar módulo de ubicación/mapas
     */
    async initLocationModule() {
        try {
            console.log('🗺️ Inicializando módulo de ubicación...');
            
            // Verificar si estamos en la página que necesita mapas
            const needsLocation = document.getElementById('map') || 
                                 document.querySelector('.location-container') ||
                                 window.location.pathname.includes('location');
            
            if (!needsLocation) {
                console.log('🗺️ Módulo de ubicación no necesario en esta página');
                return true;
            }
            
            // Inicializar el módulo de ubicación
            const locationModule = await initLocation();
            
            if (locationModule) {
                this.modules.set('location', locationModule);
                console.log('✅ Módulo de ubicación inicializado');
                return true;
            } else {
                throw new Error('Location module initialization failed');
            }
            
        } catch (error) {
            console.warn('⚠️ Error inicializando módulo de ubicación:', error);
            // El módulo de ubicación no es crítico, continuar sin él
            return true;
        }
    }

    /**
     * Configurar manejadores globales de error
     */
    setupGlobalErrorHandlers() {
        // Errores JavaScript no capturados
        window.addEventListener('error', (event) => {
            console.error('❌ Error JavaScript global:', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
            
            this.handleNonCriticalError(event.error);
        });

        // Promesas rechazadas no capturadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promesa rechazada no manejada:', event.reason);
            
            // Prevenir que aparezca en la consola del navegador
            event.preventDefault();
            
            this.handleNonCriticalError(event.reason);
        });

        // Errores de red y recursos
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                console.warn('⚠️ Error cargando recurso:', {
                    tag: event.target.tagName,
                    source: event.target.src || event.target.href,
                    message: 'Failed to load resource'
                });
            }
        }, true);
    }

    /**
     * Configurar sistema de notificaciones para el usuario
     */
    setupUserNotifications() {
        // Crear contenedor de notificaciones si no existe
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Hacer disponible globalmente
        window.App = {
            showNotification: (message, type = 'info') => this.showNotification(message, type)
        };
    }

    /**
     * Mostrar notificación al usuario
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            max-width: 300px;
            word-wrap: break-word;
            pointer-events: auto;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            cursor: pointer;
        `;
        
        notification.textContent = message;
        container.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-remover
        const removeNotification = () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        };

        // Click para cerrar
        notification.addEventListener('click', removeNotification);

        // Auto-remover después del tiempo especificado
        setTimeout(removeNotification, duration);
    }

    /**
     * Mostrar estado de módulos al usuario
     */
    displayModuleStatus() {
        const statusMessages = [];
        
        if (this.moduleStatus.booking === 'success') {
            statusMessages.push('✅ Sistema de reservas listo');
        } else {
            statusMessages.push('❌ Sistema de reservas no disponible');
        }

        if (this.moduleStatus.calendar === 'success') {
            const calendarMode = calendarManager?.getMode();
            if (calendarMode === 'fallback') {
                statusMessages.push('📅 Enlaces de calendario disponibles');
            } else {
                statusMessages.push('✅ Integración con Google Calendar activa');
            }
        }

        if (this.moduleStatus.location === 'success') {
            statusMessages.push('🗺️ Mapas disponibles');
        }

        // Mostrar solo si hay algún problema crítico
        if (this.moduleStatus.booking !== 'success') {
            this.showNotification('Sistema de reservas no disponible. Por favor recarga la página.', 'error', 10000);
        } else if (Object.values(this.moduleStatus).some(status => status === 'error')) {
            console.log('ℹ️ Estado de módulos:', statusMessages.join(' | '));
        }
    }

    /**
     * Manejar errores críticos
     */
    handleCriticalError(error) {
        console.error('💥 Error crítico de la aplicación:', error);
        
        // Mostrar mensaje al usuario
        this.showNotification(
            'Error inicializando la aplicación. Por favor recarga la página.', 
            'error', 
            15000
        );

        // Intentar funcionalidad básica
        this.enableBasicFunctionality();
    }

    /**
     * Manejar errores no críticos
     */
    handleNonCriticalError(error) {
        // Solo log, no mostrar al usuario a menos que sea relevante
        if (error?.message?.includes('booking') || error?.message?.includes('reservation')) {
            this.showNotification(
                'Algunos servicios pueden no estar disponibles. Intenta recargar si experimentas problemas.', 
                'warning'
            );
        }
    }

    /**
     * Habilitar funcionalidad básica en caso de error crítico
     */
    enableBasicFunctionality() {
        // Asegurar que al menos los enlaces básicos funcionen
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="tel:"]') || e.target.matches('a[href^="mailto:"]')) {
                // Permitir enlaces de teléfono y email siempre
                return true;
            }
        });

        console.log('🔧 Funcionalidad básica habilitada');
    }

    /**
     * Utilidades
     */
    createTimeout(ms, message = 'Operation timeout') {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Métodos públicos para acceso externo
     */
    getModule(name) {
        return this.modules.get(name);
    }

    getModuleStatus(name) {
        return this.moduleStatus[name] || 'unknown';
    }

    isModuleReady(name) {
        return this.moduleStatus[name] === 'success';
    }

    async reloadModule(name) {
        console.log(`🔄 Recargando módulo ${name}...`);
        
        try {
            let success = false;
            
            switch (name) {
                case 'booking':
                    success = await this.initBookingModule();
                    break;
                case 'calendar':
                    success = await this.initCalendarIntegration();
                    break;
                case 'location':
                    success = await this.initLocationModule();
                    break;
                default:
                    throw new Error(`Unknown module: ${name}`);
            }
            
            this.moduleStatus[name] = success ? 'success' : 'error';
            
            if (success) {
                this.showNotification(`✅ Módulo ${name} recargado exitosamente`, 'success');
            } else {
                this.showNotification(`❌ Error recargando módulo ${name}`, 'error');
            }
            
            return success;
            
        } catch (error) {
            console.error(`❌ Error recargando módulo ${name}:`, error);
            this.moduleStatus[name] = 'error';
            this.showNotification(`❌ Error recargando módulo ${name}`, 'error');
            return false;
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 DOM cargado, inicializando Margarita\'s Tailoring App...');
    
    try {
        window.app = new App();
        await window.app.init();
        
        // Hacer métodos útiles disponibles globalmente para debugging
        window.appDebug = {
            reloadModule: (name) => window.app.reloadModule(name),
            getModuleStatus: (name) => window.app.getModuleStatus(name),
            showNotification: (msg, type) => window.app.showNotification(msg, type)
        };
        
    } catch (error) {
        console.error('💥 Error fatal inicializando la aplicación:', error);
        
        // Mostrar error básico al usuario
        document.body.insertAdjacentHTML('afterbegin', `
            <div style="
                position: fixed; 
                top: 0; 
                left: 0; 
                right: 0; 
                background: #ef4444; 
                color: white; 
                padding: 15px; 
                text-align: center; 
                z-index: 9999;
                font-weight: 500;
            ">
                ⚠️ Error cargando la aplicación. Por favor recarga la página o contacta soporte.
                <button onclick="location.reload()" style="
                    margin-left: 15px; 
                    background: white; 
                    color: #ef4444; 
                    border: none; 
                    padding: 5px 15px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-weight: 500;
                ">
                    Recargar
                </button>
            </div>
        `);
    }
});

export default App;