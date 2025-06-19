// ===== CONFIGURACIÓN Y CONSTANTES =====
const CONFIG = {
  defaultLanguage: 'es',
  servicesFile: './data/services.json'
};


// ===== ESTADO GLOBAL =====
let currentLanguage = localStorage.getItem('language') || CONFIG.defaultLanguage;
let servicesData = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

async function initializeApp() {
  try {
    // Configurar idioma inicial
    setLanguage(currentLanguage);
    
    // Configurar tema inicial
    setTheme(isDarkMode);
    
    // Cargar servicios
    await loadServices();
    
    // Inicializar contador de visitas
    await initVisitCounter();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Inicializar navegación suave
    initSmoothScrolling();
    
    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la aplicación:', error);
  }
}

// ===== GESTIÓN DE SERVICIOS =====
async function loadServices() {
  try {
    const response = await fetch(CONFIG.servicesFile);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    servicesData = await response.json();
    renderServices();
    console.log('✅ Servicios cargados correctamente');
  } catch (error) {
    console.error('❌ Error al cargar servicios:', error);
    showServicesError();
  }
}

function renderServices() {
  const servicesContainer = document.getElementById('services-container');
  if (!servicesContainer || !servicesData) return;

  servicesContainer.innerHTML = '';
  
  servicesData.services.forEach(service => {
    const serviceCard = createServiceCard(service);
    servicesContainer.appendChild(serviceCard);
  });
}

function createServiceCard(service) {
  const card = document.createElement('div');
  card.className = 'service-card';
  card.setAttribute('data-service-type', service.type);
  
  const serviceName = service.name[currentLanguage];
  const serviceDesc = service.description[currentLanguage];
  const serviceFeatures = service.features[currentLanguage];
  
  card.innerHTML = `
    <div class="service-icon">
      <i class="${service.image}"></i>
    </div>
    <div class="service-content">
      <h3 class="service-title">${serviceName}</h3>
      <p class="service-description">${serviceDesc}</p>
      <div class="service-details">
        <div class="service-price">
          <span class="price-range">€${service.price.min} - €${service.price.max}</span>
        </div>
        <div class="service-duration">
          <i class="fas fa-clock"></i>
          <span>${service.duration}</span>
        </div>
      </div>
      <div class="service-features">
        <h4 data-es="Incluye:" data-en="Includes:">${currentLanguage === 'es' ? 'Incluye:' : 'Includes:'}</h4>
        <ul>
          ${serviceFeatures.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
      <div class="service-materials">
        <strong data-es="Materiales:" data-en="Materials:">${currentLanguage === 'es' ? 'Materiales:' : 'Materials:'}</strong>
        <span>${service.materials.join(', ')}</span>
      </div>
    </div>
    <div class="service-action">
      <a href="booking.html?service=${service.id}" class="btn outline-btn service-btn" 
         data-es="Reservar" data-en="Book Now">
         ${currentLanguage === 'es' ? 'Reservar' : 'Book Now'}
      </a>
    </div>
  `;
  
  // Agregar animación de entrada
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 100);
  
  return card;
}

function showServicesError() {
  const servicesContainer = document.getElementById('services-container');
  if (!servicesContainer) return;
  
  servicesContainer.innerHTML = `
    <div class="services-error">
      <i class="fas fa-exclamation-triangle"></i>
      <h3 data-es="Error al cargar servicios" data-en="Error loading services">
        ${currentLanguage === 'es' ? 'Error al cargar servicios' : 'Error loading services'}
      </h3>
      <p data-es="Por favor, recarga la página" data-en="Please reload the page">
        ${currentLanguage === 'es' ? 'Por favor, recarga la página' : 'Please reload the page'}
      </p>
    </div>
  `;
}

// ===== GESTIÓN DE IDIOMAS =====
function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  
  // Actualizar elementos con data-es y data-en
  const elements = document.querySelectorAll('[data-es][data-en]');
  elements.forEach(element => {
    const text = element.getAttribute(`data-${lang}`);
    if (text) {
      // Preservar HTML interno si existe
      if (text.includes('<')) {
        element.innerHTML = text;
      } else {
        element.textContent = text;
      }
    }
  });
  
  // Actualizar indicador de idioma
  const langIndicator = document.getElementById('current-lang');
  if (langIndicator) {
    langIndicator.textContent = lang.toUpperCase();
  }
  
  // Re-renderizar servicios si están cargados
  if (servicesData) {
    renderServices();
  }
  
  // Actualizar título de la página
  document.title = lang === 'es' ? "Margarita's Tailoring - Sastrería de Alta Costura" : "Margarita's Tailoring - Haute Couture Tailoring";
}

// ===== GESTIÓN DE TEMA =====
function setTheme(darkMode) {
  isDarkMode = darkMode;
  localStorage.setItem('darkMode', darkMode);
  
  if (darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  // Actualizar icono del toggle
  const themeIcon = document.querySelector('#theme-toggle i');
  if (themeIcon) {
    themeIcon.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// ===== NAVEGACIÓN SUAVE =====
function initSmoothScrolling() {
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const navHeight = document.getElementById('navbar').offsetHeight;
        const targetPosition = targetElement.offsetTop - navHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Actualizar enlace activo
        updateActiveNavLink(this);
        
        // Cerrar menú móvil si está abierto
        closeMobileMenu();
      }
    });
  });
}

function updateActiveNavLink(activeLink) {
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => link.classList.remove('active'));
  activeLink.classList.add('active');
}

// ===== MENÚ MÓVIL =====
function toggleMobileMenu() {
  const navbar = document.getElementById('navbar');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  
  navbar.classList.toggle('mobile-menu-open');
  
  // Cambiar icono
  const icon = mobileBtn.querySelector('i');
  if (navbar.classList.contains('mobile-menu-open')) {
    icon.className = 'fas fa-times';
  } else {
    icon.className = 'fas fa-bars';
  }
}

function closeMobileMenu() {
  const navbar = document.getElementById('navbar');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  
  navbar.classList.remove('mobile-menu-open');
  
  const icon = mobileBtn.querySelector('i');
  icon.className = 'fas fa-bars';
}

// ===== EFECTOS DE SCROLL =====
function initScrollEffects() {
  let lastScrollTop = 0;
  const navbar = document.getElementById('navbar');
  
  window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Navbar transparente/sólido
    if (scrollTop > 100) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Ocultar/mostrar navbar en mobile
    if (window.innerWidth <= 768) {
      if (scrollTop > lastScrollTop && scrollTop > 200) {
        navbar.style.transform = 'translateY(-100%)';
      } else {
        navbar.style.transform = 'translateY(0)';
      }
    }
    
    lastScrollTop = scrollTop;
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Toggle de idioma
  const languageToggle = document.getElementById('language-toggle');
  if (languageToggle) {
    languageToggle.addEventListener('click', () => {
      const newLang = currentLanguage === 'es' ? 'en' : 'es';
      setLanguage(newLang);
    });
  }
  
  // Toggle de tema
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(!isDarkMode);
    });
  }
  
  // Menú móvil
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
  }
  
  // Cerrar menú móvil al hacer clic fuera
  document.addEventListener('click', function(e) {
    const navbar = document.getElementById('navbar');
    if (!navbar.contains(e.target) && navbar.classList.contains('mobile-menu-open')) {
      closeMobileMenu();
    }
  });
  
  // Efectos de scroll
  initScrollEffects();
  
  // Botones CTA
  const ctaButtons = document.querySelectorAll('.btn');
  ctaButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      // Efecto ripple
      createRippleEffect(e, this);
    });
  });
}

// ===== EFECTOS VISUALES =====
function createRippleEffect(event, element) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// ===== UTILIDADES =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Optimizar scroll events
const optimizedScrollHandler = debounce(initScrollEffects, 10);

// ===== MANEJO DE ERRORES GLOBALES =====
window.addEventListener('error', function(e) {
  console.error('❌ Error global capturado:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('❌ Promise rejection no manejada:', e.reason);
});

// ===== EXPORT PARA TESTING =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setLanguage,
    setTheme,
    loadServices,
    initVisitCounter
  };
}