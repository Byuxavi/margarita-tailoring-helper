// main.js - Corregido para mejor manejo de Google Calendar y errores
import { initLocation } from './modules/location.js';
import BookingManager from './modules/booking.js';
import calendarManager from './modules/calendar.js';

class App {
  constructor() {
    this.currentLang = 'es';
    this.isInitialized = false;
    this.calendarAvailable = false;
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
        this.safeInitModule('Booking', () => this.initBookingModule())
      );
      
      // Intentar inicializar calendar de forma no bloqueante
      promises.push(
        this.safeInitModule('Calendar', () => this.initCalendarIntegration())
      );
    }

    // Esperar a que todos los módulos se inicialicen
    if (promises.length > 0) {
      const results = await Promise.allSettled(promises);
      
      // Log de resultados para debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Module ${index} failed:`, result.reason);
        }
      });
    }
  }

  async safeInitModule(moduleName, initFunction) {
    try {
      await initFunction();
      console.log(`✅ ${moduleName} module initialized`);
      return true;
    } catch (error) {
      console.warn(`⚠️ ${moduleName} module failed to initialize:`, error);
      // No lanzar error para no bloquear otros módulos
      return false;
    }
  }

  async initBookingModule() {
    // El BookingManager ya se inicializa automáticamente
    // Solo verificamos que esté disponible
    if (window.bookingManager) {
      console.log('✅ Booking module already initialized');
      return true;
    }
    
    // Si no existe, esperamos un poco y reintentamos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!window.bookingManager) {
      throw new Error('BookingManager not available');
    }
    
    return true;
  }

  async initCalendarIntegration() {
    try {
      console.log('🔄 Intentando inicializar Google Calendar...');
      
      // Verificar si estamos en un contexto seguro
      if (!this.isSecureContext()) {
        console.warn('⚠️ Google Calendar requiere HTTPS - funcionalidad limitada');
        return false;
      }

      // Intentar inicializar con timeout más corto
      const initPromise = calendarManager.init();
      
      // Timeout más corto para no bloquear
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Calendar init timeout')), 10000);
      });

      const result = await Promise.race([initPromise, timeoutPromise]);
      
      if (result) {
        this.calendarAvailable = true;
        console.log('✅ Google Calendar integration ready');
        
        // Integrar con el booking manager
        this.integrateCalendarWithBooking();
        
        return true;
      } else {
        throw new Error('Calendar initialization failed');
      }
      
    } catch (error) {
      console.warn('⚠️ Google Calendar no disponible:', error.message);
      this.calendarAvailable = false;
      
      // Mostrar notificación informativa solo si es un error de configuración
      if (error.message.includes('deprecated') || error.message.includes('idpiframe')) {
        console.warn('📝 Nota: Google Calendar usa APIs deprecadas - se necesita actualización');
      }
      
      // No mostrar error al usuario - el booking funcionará sin calendar
      return false;
    }
  }

  isSecureContext() {
    return location.protocol === 'https:' || 
           location.hostname === 'localhost' || 
           location.hostname === '127.0.0.1';
  }

  integrateCalendarWithBooking() {
    if (!window.bookingManager || !this.calendarAvailable) {
      return;
    }

    try {
      // Extender el BookingManager para incluir calendar
      const originalHandleSubmit = window.bookingManager.handleSubmit;
      
      window.bookingManager.handleSubmit = async function(form) {
        try {
          // Ejecutar el proceso normal de booking
          await originalHandleSubmit.call(this, form);
          
          // Si el booking fue exitoso, intentar agregar al calendar
          if (window.app.calendarAvailable) {
            const formData = new FormData(form);
            const appointmentData = {
              fullName: `${formData.get('firstName')} ${formData.get('lastName')}`,
              email: formData.get('email'),
              phone: formData.get('phone'),
              service: formData.get('service'),
              appointmentDate: formData.get('date'),
              appointmentTime: formData.get('time'),
              description: formData.get('description') || '',
              notes: formData.get('pickup') ? 'Recolección a domicilio' : ''
            };
            
            // Intentar agregar al calendar (no bloqueante)
            window.app.addToCalendar(appointmentData);
          }
          
        } catch (error) {
          throw error; // Re-lanzar para mantener el comportamiento original
        }
      };
      
      console.log('✅ Calendar integrado con booking');
      
    } catch (error) {
      console.warn('⚠️ Error integrando calendar:', error);
    }
  }

  async addToCalendar(appointmentData) {
    try {
      console.log('📅 Intentando agregar evento al calendario...');
      
      const result = await calendarManager.createAppointmentEvent(appointmentData);
      
      if (result.success) {
        this.showNotification('✅ Evento agregado al calendario', 'success');
      } else {
        console.warn('Calendar fallback:', result.message);
        
        // Mostrar link manual si está disponible
        if (result.fallbackLink) {
          this.showCalendarFallback(result.fallbackLink);
        }
      }
      
    } catch (error) {
      console.warn('Error agregando al calendario:', error);
      // No mostrar error - el booking ya fue exitoso
    }
  }

  showCalendarFallback(link) {
    // Crear un modal simple para mostrar el link del calendario
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #333;">Agregar al Calendario</h3>
      <p style="margin: 0 0 20px 0; color: #666;">Haz clic en el enlace para agregar manualmente:</p>
      <a href="${link}" target="_blank" 
         style="display: inline-block; background: #4285f4; color: white; 
                padding: 10px 20px; border-radius: 5px; text-decoration: none;
                margin-bottom: 15px;">
        📅 Abrir Google Calendar
      </a>
      <br>
      <button onclick="this.closest('.calendar-modal').remove()" 
              style="background: #ccc; border: none; padding: 8px 16px; 
                     border-radius: 4px; cursor: pointer;">
        Cerrar
      </button>
    `;
    
    modal.className = 'calendar-modal';
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Auto-cerrar en 10 segundos
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 10000);
  }

  setupGlobalErrorHandling() {
    // Manejar errores JavaScript globales
    window.addEventListener('error', (e) => {
      // Filtrar errores conocidos que no son críticos
      if (this.isKnownNonCriticalError(e.error)) {
        console.warn('Non-critical error:', e.error?.message || e.error);
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
        console.warn('Non-critical promise rejection:', e.reason?.message || e.reason);
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
    if (!error) return true;
    
    const errorString = error.toString ? error.toString() : String(error);
    
    // Errores conocidos que no afectan funcionalidad core
    const nonCriticalPatterns = [
      'gapi load timeout',
      'timeout parameter',
      'ontimeout parameter',
      'failed to load google api',
      'gapi.load',
      'apis.google.com',
      'access-control-allow-origin',
      'cors',
      'idpiframe',
      'initialization_failed',
      'deprecated',
      'new libraries instead',
      'migration guide',
      'calendar init timeout',
      'could not establish connection',
      'receiving end does not exist',
      'message channel closed',
      'content security policy',
      'script-src',
      'gstatic.com'
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
      'bookingmanager not available',
      'emailjs not available',
      'form submission failed',
      'network error',
      'server error',
      'email sending failed'
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
    
    // Auto-remover
    const duration = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);
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
      calendar: this.calendarAvailable,
      location: !!window.initLocation
    };
  }

  // Método para verificar disponibilidad de calendar
  isCalendarAvailable() {
    return this.calendarAvailable;
  }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Manejar errores de carga del módulo
window.addEventListener('load', () => {
  // Verificar que la app esté lista después de la carga
  setTimeout(() => {
    if (window.app) {
      const status = window.app.getModuleStatus();
      console.log('📊 Module Status:', status);
      
      if (!window.app.isReady()) {
        console.warn('⚠️ App initialization may have failed');
      }
    }
  }, 2000);
});

// Exportar para uso global
window.App = App;

export default App;