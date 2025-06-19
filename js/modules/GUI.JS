/**
 * GESTOR DE RESERVAS - BookingManager
 * 
 * Esta clase maneja todo el sistema de reservas de citas, incluyendo:
 * - Validación de formularios
 * - Envío de emails automáticos
 * - Gestión de campos condicionales
 * - Control de modales y notificaciones
 * - Almacenamiento local de respaldo
 */

class BookingManager {
    /**
     * CONSTRUCTOR - Inicializa la configuración del gestor
     * Establece los parámetros de EmailJS y ejecuta la inicialización
     */
    constructor() {
        // Configuración de EmailJS para envío de emails automáticos
        this.emailConfig = {
            serviceId: 'service_xsakmyn',        // ID del servicio de email
            templateId: 'template_1dt15su',      // ID de la plantilla HTML del email
            publicKey: 'vdWmzVZ71cnknMJPF'      // Clave pública para autenticación
        };
        
        this.isInitialized = false;  // Control de estado de inicialización
        this.init();                 // Ejecutar inicialización automática
    }

    /**
     * INICIALIZACIÓN PRINCIPAL
     * Configura todos los componentes del sistema de reservas
     */
    async init() {
        try {
            // Configurar el formulario principal y sus eventos
            await this.setupForm();
            
            // Configurar validación de fechas (no permitir fechas pasadas)
            this.setupDateValidation();
            
            // Configurar campos que aparecen/desaparecen según selecciones
            this.setupConditionalFields();
            
            // Configurar ventana modal de éxito
            this.setupModal();
            
            // Cargar y configurar EmailJS para envío de emails
            await this.loadEmailJS();
            
            this.isInitialized = true;
            console.log('✅ BookingManager initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing BookingManager:', error);
        }
    }

    /**
     * CARGA DE EMAILJS
     * Carga dinámicamente la librería EmailJS desde CDN
     * Incluye manejo de timeouts y errores
     */
    async loadEmailJS() {
        return new Promise((resolve, reject) => {
            // Si EmailJS ya está cargado, no hacer nada
            if (window.emailjs) {
                resolve();
                return;
            }

            // Crear script tag para cargar EmailJS
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            
            // Timeout de seguridad (10 segundos máximo)
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error('EmailJS load timeout'));
            }, 10000);

            // Cuando el script se carga exitosamente
            script.onload = () => {
                clearTimeout(timeout);
                try {
                    // Inicializar EmailJS con la clave pública
                    emailjs.init(this.emailConfig.publicKey);
                    console.log('✅ EmailJS loaded and initialized');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            // Si hay error cargando el script
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('Failed to load EmailJS'));
            };
            
            // Añadir el script al documento
            document.head.appendChild(script);
        });
    }

    /**
     * CONFIGURACIÓN DEL FORMULARIO
     * Establece eventos para envío y reset del formulario
     */
    setupForm() {
        const form = document.getElementById('bookingForm');
        if (!form) {
            console.warn('Booking form not found');
            return;
        }

        // Evento para manejar el envío del formulario
        form.addEventListener('submit', (e) => {
            e.preventDefault();           // Prevenir envío normal del formulario
            this.handleSubmit(form);      // Manejar envío personalizado
        });

        // Configurar botón de reset/limpiar
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                form.reset();                    // Limpiar todos los campos
                this.hideAddressSection();      // Ocultar sección de dirección
            });
        }
    }

    /**
     * VALIDACIÓN DE FECHAS
     * Establece fechas mínimas y máximas permitidas para reservas
     */
    setupDateValidation() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            // Fecha mínima: hoy (no permitir fechas pasadas)
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            
            // Fecha máxima: 3 meses desde hoy
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 3);
            dateInput.max = maxDate.toISOString().split('T')[0];
        }
    }

    /**
     * CONFIGURACIÓN DE CAMPOS CONDICIONALES
     * Maneja la aparición/desaparición de campos según selecciones del usuario
     */
    setupConditionalFields() {
        const pickupCheckbox = document.getElementById('pickup');
        const addressSection = document.getElementById('addressSection');

        if (pickupCheckbox && addressSection) {
            // Cuando cambia el estado del checkbox de recolección
            pickupCheckbox.addEventListener('change', () => {
                if (pickupCheckbox.checked) {
                    this.showAddressSection();    // Mostrar campo de dirección
                } else {
                    this.hideAddressSection();    // Ocultar campo de dirección
                }
            });
        }
    }

    /**
     * MOSTRAR SECCIÓN DE DIRECCIÓN
     * Hace visible el campo de dirección y lo marca como requerido
     */
    showAddressSection() {
        const addressSection = document.getElementById('addressSection');
        const addressInput = document.getElementById('address');
        
        if (addressSection && addressInput) {
            addressSection.classList.remove('hidden');  // Mostrar visualmente
            addressInput.required = true;               // Marcar como campo obligatorio
        }
    }

    /**
     * OCULTAR SECCIÓN DE DIRECCIÓN
     * Oculta el campo de dirección y lo marca como no requerido
     */
    hideAddressSection() {
        const addressSection = document.getElementById('addressSection');
        const addressInput = document.getElementById('address');
        
        if (addressSection && addressInput) {
            addressSection.classList.add('hidden');     // Ocultar visualmente
            addressInput.required = false;              // Marcar como no obligatorio
            addressInput.value = '';                    // Limpiar el valor
        }
    }

    /**
     * CONFIGURACIÓN DE MODAL
     * Establece eventos para mostrar/ocultar ventana modal de éxito
     */
    setupModal() {
        const modal = document.getElementById('successModal');
        const closeBtn = document.getElementById('closeModal');

        if (closeBtn && modal) {
            // Cerrar modal con botón X
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });

            // Cerrar modal haciendo click fuera de él
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }

    /**
     * MOSTRAR MODAL DE ÉXITO
     * Muestra la ventana modal y bloquea scroll del body
     */
    showModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('hidden');          // Hacer visible
            document.body.style.overflow = 'hidden';   // Bloquear scroll de fondo
        }
    }

    /**
     * OCULTAR MODAL
     * Oculta la ventana modal y restaura scroll del body
     */
    hideModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.add('hidden');             // Ocultar
            document.body.style.overflow = '';         // Restaurar scroll
        }
    }

    /**
     * MANEJO DE ENVÍO DEL FORMULARIO
     * Procesa el envío completo: validación, email y confirmación
     */
    async handleSubmit(form) {
        // Verificar que el sistema esté inicializado
        if (!this.isInitialized) {
            console.warn('BookingManager not initialized yet');
            this.showErrorNotification('Sistema no inicializado. Por favor recarga la página.');
            return;
        }

        try {
            // Mostrar estado de carga en el botón
            this.setLoadingState(true);

            // Extraer datos del formulario
            const formData = new FormData(form);
            const bookingData = Object.fromEntries(formData.entries());

            // Validar que todos los campos requeridos estén completos
            if (!this.validateForm(bookingData)) {
                throw new Error('Por favor completa todos los campos requeridos');
            }

            console.log('📧 Enviando email con datos:', bookingData);

            // Enviar email de reserva al negocio
            await this.sendBookingEmail(bookingData);

            // Guardar reserva en almacenamiento local (respaldo)
            this.saveBooking(bookingData);

            // Mostrar confirmación de éxito
            this.showModal();
            form.reset();                    // Limpiar formulario
            this.hideAddressSection();      // Ocultar campos condicionales

            this.showSuccessNotification('¡Reserva enviada exitosamente! Recibirás confirmación pronto.');

        } catch (error) {
            console.error('❌ Error enviando reserva:', error);
            this.showErrorNotification('Error al enviar la reserva. Por favor intenta nuevamente o contacta por teléfono.');
        } finally {
            // Restaurar estado normal del botón
            this.setLoadingState(false);
        }
    }

    /**
     * ENVÍO DE EMAIL DE RESERVA
     * Utiliza EmailJS para enviar la información de la reserva por email
     */
    async sendBookingEmail(data) {
        // Verificar que EmailJS esté disponible
        if (!window.emailjs) {
            throw new Error('EmailJS no está disponible');
        }

        // Mapeo de códigos de servicios a nombres legibles en español
        const serviceNames = {
            'alteraciones-basicas': 'Alteraciones Básicas ($25-50)',
            'reparaciones': 'Reparaciones ($15-35)', 
            'ajustes-formales': 'Ajustes Formales ($40-80)',
            'vestidos-novia': 'Vestidos de Novia ($150-300)',
            'diseno-personalizado': 'Diseño Personalizado (Cotización)'
        };

        // Obtener nombre legible del servicio
        const serviceName = serviceNames[data.service] || data.service;

        // Preparar parámetros que coinciden con la plantilla de EmailJS
        const templateParams = {
            // Información personal del cliente
            from_name: `${data.firstName} ${data.lastName}`,
            from_email: data.email,
            phone: data.phone,
            
            // Detalles del servicio
            service: serviceName,
            date: this.formatDate(data.date),
            time: this.formatTime(data.time),
            
            // Opciones adicionales
            priority: data.priority ? 'Sí' : 'No',          // Servicio express
            pickup: data.pickup ? 'Sí' : 'No',              // Recolección a domicilio
            address: data.address || '',                     // Dirección (si aplica)
            description: data.description || '',             // Descripción adicional
            
            // Metadatos del email
            to_email: 'info@margaritastailoring.com',        // Email del negocio
            subject: `Nueva Reserva - ${data.firstName} ${data.lastName}`,
            
            // Mensaje completo como respaldo
            message: this.createFullMessage(data, serviceName)
        };

        console.log('📧 Parámetros del email:', templateParams);

        try {
            // Enviar email usando EmailJS
            const result = await emailjs.send(
                this.emailConfig.serviceId,
                this.emailConfig.templateId,
                templateParams
            );

            console.log('✅ Email enviado exitosamente:', result);
            return result;

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            
            // Proporcionar mensaje de error más específico según el código
            let errorMessage = 'Error desconocido enviando email';
            
            if (error.status === 400) {
                errorMessage = 'Error en los datos del formulario';
            } else if (error.status === 401) {
                errorMessage = 'Error de autenticación con EmailJS';
            } else if (error.status === 403) {
                errorMessage = 'Acceso denegado a EmailJS';
            } else if (error.status >= 500) {
                errorMessage = 'Error del servidor de EmailJS';
            }

            throw new Error(errorMessage);
        }
    }

    /**
     * FORMATEO DE FECHA
     * Convierte fecha del input a formato legible en español
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',      // Día de la semana completo
                year: 'numeric',      // Año en números
                month: 'long',        // Mes completo
                day: 'numeric'        // Día del mes
            });
        } catch (error) {
            return dateString;    // Devolver original si hay error
        }
    }

    /**
     * FORMATEO DE HORA
     * Convierte hora del input a formato legible de 24 horas
     */
    formatTime(timeString) {
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',      // Hora con 2 dígitos
                minute: '2-digit'     // Minutos con 2 dígitos
            });
        } catch (error) {
            return timeString;    // Devolver original si hay error
        }
    }

    /**
     * CREACIÓN DE MENSAJE COMPLETO
     * Genera un mensaje de texto completo con todos los detalles de la reserva
     */
    createFullMessage(data, serviceName) {
        let message = `NUEVA RESERVA DE CITA\n\n`;
        message += `Nombre: ${data.firstName} ${data.lastName}\n`;
        message += `Email: ${data.email}\n`;
        message += `Teléfono: ${data.phone}\n`;
        message += `Servicio: ${serviceName}\n`;
        message += `Fecha: ${this.formatDate(data.date)}\n`;
        message += `Hora: ${this.formatTime(data.time)}\n`;
        message += `Servicio Express: ${data.priority ? 'Sí' : 'No'}\n`;
        message += `Recolección a domicilio: ${data.pickup ? 'Sí' : 'No'}\n`;
        
        // Añadir dirección solo si fue proporcionada
        if (data.address) {
            message += `Dirección de recolección: ${data.address}\n`;
        }
        
        // Añadir descripción adicional si fue proporcionada
        if (data.description) {
            message += `\nDescripción adicional:\n${data.description}\n`;
        }

        // Añadir timestamp de cuándo se realizó la reserva
        message += `\n---\nReserva realizada el ${new Date().toLocaleString('es-ES')}`;
        
        return message;
    }

    /**
     * VALIDACIÓN DEL FORMULARIO
     * Verifica que todos los campos requeridos estén completos y sean válidos
     */
    validateForm(data) {
        // Lista de campos obligatorios
        const required = ['firstName', 'lastName', 'email', 'phone', 'service', 'date', 'time'];
        
        // Verificar que todos los campos requeridos estén presentes
        for (const field of required) {
            if (!data[field] || data[field].trim() === '') {
                console.error(`❌ Campo requerido faltante: ${field}`);
                this.showErrorNotification(`El campo ${this.getFieldDisplayName(field)} es requerido`);
                return false;
            }
        }

        // Validar formato de email usando expresión regular
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            console.error('❌ Formato de email inválido');
            this.showErrorNotification('Por favor ingresa un email válido');
            return false;
        }

        // Validar formato básico de teléfono (números, espacios, guiones, paréntesis)
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(data.phone.trim())) {
            console.error('❌ Formato de teléfono inválido');
            this.showErrorNotification('Por favor ingresa un teléfono válido');
            return false;
        }

        // Si requiere recolección, verificar que se haya proporcionado dirección
        if (data.pickup && (!data.address || data.address.trim() === '')) {
            console.error('❌ Dirección requerida para recolección');
            this.showErrorNotification('La dirección es requerida para el servicio de recolección');
            return false;
        }

        return true;  // Todas las validaciones pasaron
    }

    /**
     * OBTENER NOMBRE LEGIBLE DE CAMPO
     * Convierte nombres técnicos de campos a nombres legibles para el usuario
     */
    getFieldDisplayName(field) {
        const fieldNames = {
            firstName: 'Nombre',
            lastName: 'Apellido', 
            email: 'Email',
            phone: 'Teléfono',
            service: 'Servicio',
            date: 'Fecha',
            time: 'Hora',
            address: 'Dirección'
        };
        return fieldNames[field] || field;
    }

    /**
     * GUARDADO LOCAL DE RESERVA
     * Guarda la reserva en localStorage del navegador como respaldo
     */
    saveBooking(data) {
        try {
            // Obtener reservas existentes
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            
            // Crear objeto de reserva con metadatos
            const booking = {
                id: Date.now(),                         // ID único basado en timestamp
                ...data,                                // Todos los datos del formulario
                status: 'pending',                      // Estado inicial
                createdAt: new Date().toISOString()     // Timestamp de creación
            };
            
            // Añadir nueva reserva y guardar
            bookings.push(booking);
            localStorage.setItem('bookings', JSON.stringify(bookings));
            console.log('✅ Reserva guardada localmente');
        } catch (error) {
            console.warn('⚠️ No se pudo guardar localmente:', error);
            // No bloquear el proceso si falla localStorage
        }
    }

    /**
     * CONTROL DE ESTADO DE CARGA
     * Cambia la apariencia del botón de envío durante el procesamiento
     */
    setLoadingState(loading) {
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;

        const btnText = submitBtn.querySelector('.btn-text');        // Texto normal
        const btnLoading = submitBtn.querySelector('.btn-loading');  // Spinner de carga

        if (loading) {
            // Mostrar estado de carga
            if (btnText) btnText.classList.add('hidden');
            if (btnLoading) btnLoading.classList.remove('hidden');
            submitBtn.disabled = true;  // Deshabilitar botón
        } else {
            // Restaurar estado normal
            if (btnText) btnText.classList.remove('hidden');
            if (btnLoading) btnLoading.classList.add('hidden');
            submitBtn.disabled = false;  // Habilitar botón
        }
    }

    /**
     * MÉTODOS DE NOTIFICACIÓN
     * Funciones auxiliares para mostrar mensajes al usuario
     */

    /**
     * MOSTRAR NOTIFICACIÓN DE ÉXITO
     */
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }

    /**
     * MOSTRAR NOTIFICACIÓN DE ERROR
     */
    showErrorNotification(message) {
        this.showNotification(message, 'error');
    }

    /**
     * MOSTRAR NOTIFICACIÓN GENÉRICA
     * Sistema principal de notificaciones con fallback
     */
    showNotification(message, type = 'info') {
        // Usar sistema de notificaciones de la app principal si está disponible
        if (window.App && window.App.showNotification) {
            window.App.showNotification(message, type);
        } else {
            // Fallback: log en consola y notificación visual simple
            console.log(`${type.toUpperCase()}: ${message}`);
            this.createSimpleNotification(message, type);
        }
    }

    /**
     * CREAR NOTIFICACIÓN VISUAL SIMPLE
     * Crea una notificación toast básica si no hay sistema principal
     */
    createSimpleNotification(message, type) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background-color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada (deslizar desde la derecha)
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remover después de un tiempo
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, type === 'error' ? 8000 : 5000);  // Errores se muestran más tiempo
    }

    /**
     * MÉTODOS UTILITARIOS PÚBLICOS
     * Funciones para verificar estado y obtener datos
     */

    /**
     * VERIFICAR SI EL SISTEMA ESTÁ LISTO
     * Retorna true si BookingManager y EmailJS están inicializados
     */
    isReady() {
        return this.isInitialized && window.emailjs;
    }

    /**
     * OBTENER RESERVAS GUARDADAS
     * Recupera todas las reservas del almacenamiento local
     */
    getBookings() {
        try {
            return JSON.parse(localStorage.getItem('bookings') || '[]');
        } catch (error) {
            console.warn('Error reading bookings:', error);
            return [];
        }
    }
}

/**
 * INICIALIZACIÓN AUTOMÁTICA
 * Crea instancia de BookingManager cuando el DOM esté completamente cargado
 */
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si existe el formulario de reservas en la página
    if (document.getElementById('bookingForm')) {
        window.bookingManager = new BookingManager();
        console.log('🚀 BookingManager inicializado');
    }
});

// Exportar clase para uso en módulos
export default BookingManager;