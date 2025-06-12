// Location.js - Google Maps Integration
const API_KEY = 'AIzaSyCyrePzpyKk0TyxmsOD_DfsugNzsqj100c'; // Mismo API key del calendar
const MARGARITA_LOCATION = {
  lat: 40.918000,
  lng: -111.872160,
  address: "88 W 50 S Unit E2, Centerville, UTAH 84014"
};

export function initLocation() {
  loadGoogleMaps().then(() => initMap());
}

async function loadGoogleMaps() {
  if (window.google) return;
  
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=marker`;
  script.async = true;
  document.head.appendChild(script);
  
  return new Promise((resolve) => {
    script.onload = resolve;
  });
}

function initMap() {
  const map = new google.maps.Map(document.getElementById('map'), {
    zoom: 15,
    center: MARGARITA_LOCATION,
    mapId: 'MARGARITA_MAP',
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ]
  });

  // Usar AdvancedMarkerElement (nueva API recomendada)
  if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
    new google.maps.marker.AdvancedMarkerElement({
      map: map,
      position: MARGARITA_LOCATION,
      title: "Margarita's Tailoring"
    });
  } else {
    // Fallback para navegadores que no soportan AdvancedMarkerElement
    new google.maps.Marker({
      position: MARGARITA_LOCATION,
      map: map,
      title: "Margarita's Tailoring"
    });
  }
}