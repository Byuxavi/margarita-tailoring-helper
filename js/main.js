// main.js - Orquestador Principal
import { initLocation } from './modules/location.js';
import BookingManager from './modules/booking.js';
import calendarManager from './modules/calendar.js';

class App {
  constructor() {
    this.currentLang = 'es';
    this.init();
  }

  init() {
    this.setupLanguageToggle();
    this.initModules();
    this.setupGlobalErrorHandling();
  }

  setupLanguageToggle() {
    document.getElementById('langToggle')?.addEventListener('click', () => {
      this.currentLang = this.currentLang === 'es' ? 'en' : 'es';
      document.querySelectorAll('[data-es][data-en]').forEach(el => 
        el.textContent = el.getAttribute(`data-${this.currentLang}`)
      );
      document.getElementById('langToggle').textContent = this.currentLang === 'es' ? 'EN' : 'ES';
    });
  }

  async initModules() {
    // Inicializar módulos según la página actual
    if (document.getElementById('map')) {
      initLocation();
    }
    
    if (document.getElementById('bookingForm')) {
      // BookingManager se inicializa automáticamente en su constructor
      // cuando detecta el formulario
      await this.initCalendarIntegration();
    }
  }

  async initCalendarIntegration() {
    try {
      await calendarManager.init();
      console.log('Calendar integration ready');
    } catch (error) {
      console.warn('Calendar integration failed:', error);
      // El proceso continuará sin calendar - no es crítico
    }
  }

  setupGlobalErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      // Opcional: mostrar notificación al usuario
      this.showNotification('Ha ocurrido un error inesperado', 'error');
    });

    // Manejar errores de promesas no capturadas
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      e.preventDefault(); // Prevenir que aparezca en consola del navegador
    });
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
      background-color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    `;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 4000);
  }

  // Método utilitario estático para uso desde otros módulos
  static showNotification(message, type = 'info') {
    if (window.app) {
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
      document.querySelectorAll('[data-es][data-en]').forEach(el => 
        el.textContent = el.getAttribute(`data-${this.currentLang}`)
      );
      document.getElementById('langToggle').textContent = this.currentLang === 'es' ? 'EN' : 'ES';
    }
  }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Exportar para uso global
window.App = App;