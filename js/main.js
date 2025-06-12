// main.js - Orquestador Principal
import { initLocation } from './modules/location.js';
import BookingManager from './modules/booking.js';
import calendarManager from './modules/calendar.js';
import { emailService } from './modules/email.js';

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
    if (document.getElementById('map')) initLocation();
    if (document.getElementById('bookingForm')) {
      window.bookingManager = new BookingManager();
      await this.initCalendarIntegration();
    }
  }

  async initCalendarIntegration() {
    try {
      await calendarManager.init();
      console.log('Calendar integration ready');
    } catch (error) {
      console.warn('Calendar integration failed:', error);
    }
  }

  setupGlobalErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      // Opcional: mostrar notificación al usuario
    });
  }

  // Método utilitario para otros módulos
  static showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => new App());

// Exportar para uso global
window.App = App;