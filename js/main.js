// main.js - 
import { initLocation } from './modules/location.js';
import BookingManager from './modules/booking.js';
import calendarManager from './modules/calendar.js';

class App {
  constructor() {
    this.currentLang = 'es';
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      this.setupLanguageToggle();
      await this.initModules();
      this.setupGlobalErrorHandling();
      this.isInitialized = true;
      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.showNotification('Error inicializando la aplicación', 'error');
    }
  }

  setupLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        this.currentLang = this.currentLang === 'es' ? 'en' : 'es';
        
        document.querySelectorAll('[data-es][data-en]').forEach(el => {
          const text = el.getAttribute(`data-${this.currentLang}`);
          if (text) {
            el.textContent = text;
          }
        });
        
        langToggle.textContent = this.currentLang === 'es' ? 'EN' : 'ES';
      });
    }
  }

  async initModules() {
    const promises = [];

    // Inicializar módulo de ubicación si existe el mapa
    if (document.getElementById('map')) {
      promises.push(
        this.safeInitModule('Location', () => initLocation())
      );
    }
    
    // Inicializar módulo de reservas si existe el formulario
    if (document.getElementById('bookingForm')) {
      promises.push(
        this.safeInitModule('Calendar', () => this.initCalendarIntegration())
      );
    }

    // Esperar a que todos los módulos se inicialicen
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  async safeInitModule(moduleName, initFunction) {
    try {
      await initFunction();
      console.log(`✅ ${moduleName} module initialized`);
    } catch (error) {
      console.warn(`⚠️ ${moduleName} module failed to initialize:`, error);
      // No lanzar error para no bloquear otros módulos
    }
  }

  async initCalendarIntegration() {
    try {
      // Inicializar calendar manager de forma no bloqueante
      const initPromise = calendarManager.init();
      
      // Timeout para no bloquear indefinidamente
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Calendar init timeout')), 15000);
      });

      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ Calendar integration ready');
      
    } catch (error) {
      console.warn('⚠️ Calendar integration failed:', error);
      // El proceso continuará sin calendar - no es crítico
      // Esto permite que el booking funcione sin Google Calendar
    }
  }

  setupGlobalErrorHandling() {
    // Manejar errores JavaScript globales
    window.addEventListener('error', (e) => {
      // Filtrar errores conocidos que no son críticos
      if (this.isKnownNonCriticalError(e.error)) {
        console.warn('Non-critical error:', e.error);
        return;
      }

      console.error('Global error:', e.error);
      
      // Solo mostrar notificación para errores que afectan la funcionalidad
      if (this.isCriticalError(e.error)) {
        this.showNotification('Ha ocurrido un error inesperado', 'error');
      }
    });

    // Manejar promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', (e) => {
      // Filtrar rechazos conocidos que no son críticos
      if (this.isKnownNonCriticalError(e.reason)) {
        console.warn('Non-critical promise rejection:', e.reason);
        e.preventDefault();
        return;
      }

      console.error('Unhandled promise rejection:', e.reason);
      
      // Prevenir que aparezca en consola del navegador para errores no críticos
      if (!this.isCriticalError(e.reason)) {
        e.preventDefault();
      }
    });
  }

  // Verificar si un error es conocido y no crítico
  isKnownNonCriticalError(error) {
    if (!error) return true; // Error null/undefined no es crítico
    
    const errorString = error.toString ? error.toString() : String(error);
    
    // Errores conocidos de Google APIs que no afectan funcionalidad core
    const nonCriticalPatterns = [
      'GAPI load timeout',
      'timeout parameter',
      'ontimeout parameter',
      'Failed to load Google API',
      'gapi.load',
      'apis.google.com',
      'Access-Control-Allow-Origin',
      'CORS'
    ];

    return nonCriticalPatterns.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Verificar si un error es crítico para la funcionalidad
  isCriticalError(error) {
    if (!error) return false;
    
    const errorString = error.toString ? error.toString() : String(error);
    
    // Errores críticos que afectan funcionalidad principal
    const criticalPatterns = [
      'BookingManager',
      'EmailJS',
      'form submission',
      'network error',
      'server error'
    ];

    return criticalPatterns.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Método utilitario para mostrar notificaciones
  showNotification(message, type = 'info') {
    // Verificar si ya existe un contenedor de notificaciones  
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      background-color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    `;
    notification.textContent = message;
    
    // Permitir cerrar al hacer clic
    notification.addEventListener('click', () => {
      this.removeNotification(notification);
    });
    
    container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
  }

  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }

  // Método utilitario estático para uso desde otros módulos
  static showNotification(message, type = 'info') {
    if (window.app && window.app.isInitialized) {
      window.app.showNotification(message, type);
    } else {
      // Fallback si no hay instancia de app
      console.log(`${type.toUpperCase()}: ${message}`);
      
      // Para errores críticos, mostrar alert como último recurso
      if (type === 'error') {
        alert(message);
      }
    }
  }

  // Método para obtener el idioma actual
  getCurrentLanguage() {
    return this.currentLang;
  }

  // Método para cambiar idioma programáticamente
  setLanguage(lang) {
    if (lang !== this.currentLang && (lang === 'es' || lang === 'en')) {
      this.currentLang = lang;
      
      document.querySelectorAll('[data-es][data-en]').forEach(el => {
        const text = el.getAttribute(`data-${this.currentLang}`);
        if (text) {
          el.textContent = text;
        }
      });
      
      const langToggle = document.getElementById('langToggle');
      if (langToggle) {
        langToggle.textContent = this.currentLang === 'es' ? 'EN' : 'ES';
      }
    }
  }

  // Método para verificar si la app está lista
  isReady() {
    return this.isInitialized;
  }

  // Método para obtener estados de módulos
  getModuleStatus() {
    return {
      app: this.isInitialized,
      booking: window.bookingManager?.isReady() || false,
      calendar: window.calendarManager?.isAvailable() || false
    };
  }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Manejar errores de carga del módulo
window.addEventListener('load', () => {
  // Verificar que todos los módulos críticos estén cargados
  setTimeout(() => {
    if (window.app && !window.app.isReady()) {
      console.warn('App initialization may have failed');
    }
  }, 2000);
});

// Exportar para uso global
window.App = App;

export default App;