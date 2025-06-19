// Configuración del mapa de Google Maps
let map;
let marker;

// Configuración de la ubicación
const margaritasLocation = {
  lat: 40.9180, // Latitud aproximada de Centerville, UT
  lng: -111.8700 // Longitud aproximada de Centerville, UT
};

// Función para inicializar el mapa
function initMap() {
  // Crear el mapa
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: margaritasLocation,
    styles: [
      {
        "featureType": "all",
        "elementType": "geometry.fill",
        "stylers": [{"weight": "2.00"}]
      },
      {
        "featureType": "all",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#9c9c9c"}]
      },
      {
        "featureType": "all",
        "elementType": "labels.text",
        "stylers": [{"visibility": "on"}]
      },
      {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [{"color": "#f2f2f2"}]
      },
      {
        "featureType": "landscape",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#ffffff"}]
      },
      {
        "featureType": "landscape.man_made",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#ffffff"}]
      },
      {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [{"visibility": "off"}]
      },
      {
        "featureType": "road",
        "elementType": "all",
        "stylers": [{"saturation": "-100"}, {"lightness": "45"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#eeeeee"}]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#7b7b7b"}]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#ffffff"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [{"visibility": "simplified"}]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels.icon",
        "stylers": [{"visibility": "off"}]
      },
      {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [{"visibility": "off"}]
      },
      {
        "featureType": "water",
        "elementType": "all",
        "stylers": [{"color": "#46bcec"}, {"visibility": "on"}]
      },
      {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [{"color": "#c8d7d4"}]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#070707"}]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#ffffff"}]
      }
    ],
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
  });

  // Crear marcador personalizado
  marker = new google.maps.Marker({
    position: margaritasLocation,
    map: map,
    title: "Margarita's Tailoring",
    icon: {
      url: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#FAB2A1" stroke="#fff" stroke-width="3"/>
          <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">✂</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 40)
    }
  });

  // Crear ventana de información
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="font-family: 'Montserrat', sans-serif; max-width: 250px;">
        <h3 style="color: #FAB2A1; margin: 0 0 10px 0; font-size: 18px;">
          <i class="fas fa-cut" style="margin-right: 8px;"></i>
          Margarita's Tailoring
        </h3>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">
          <i class="fas fa-map-marker-alt" style="color: #FAB2A1; margin-right: 5px;"></i>
          88 W 50 S Unit E2<br>
          Centerville, UTAH 84014
        </p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">
          <i class="fas fa-phone" style="color: #FAB2A1; margin-right: 5px;"></i>
          +1 (385) 457-2324
        </p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">
          <i class="fas fa-clock" style="color: #FAB2A1; margin-right: 5px;"></i>
          Lun - Vie: 9:00 - 18:00<br>
          Sáb: 10:00 - 14:00
        </p>
        <div style="margin-top: 10px;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=88+W+50+S+Unit+E2,+Centerville,+UT+84014" 
             target="_blank" 
             style="background: #FAB2A1; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; display: inline-block;">
            <i class="fas fa-directions" style="margin-right: 5px;"></i>
            Obtener Direcciones
          </a>
        </div>
      </div>
    `
  });

  // Abrir ventana de información al hacer clic en el marcador
  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  // Geocodificar la dirección exacta para mayor precisión
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({
    address: '88 W 50 S Unit E2, Centerville, UT 84014'
  }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const preciseLocation = results[0].geometry.location;
      map.setCenter(preciseLocation);
      marker.setPosition(preciseLocation);
    }
  });
}

// Función para manejar errores del mapa
window.gm_authFailure = function() {
  document.getElementById('map').innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; text-align: center; padding: 20px;">
      <div>
        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; color: #ffc107;"></i>
        <p>Error al cargar el mapa</p>
        <small>Verifica tu clave de API de Google Maps</small>
      </div>
    </div>
  `;
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // El mapa se inicializará cuando se cargue la API de Google Maps
});