class GeoLocateApp {
  constructor() {
    this.output = document.getElementById('output');
    this.locationBtn = document.getElementById('get-location');
    this.themeToggle = document.getElementById('theme-toggle');
    this.mapContainer = document.getElementById('map-container');
    this.mapElement = document.getElementById('map');
    this.map = null;
    this.marker = null;
    this.watchId = null;
    this.positionHistory = [];
    this.pathLayer = null;
    
    this.init();
  }
  
  init() {
    this.loadTheme();
    this.setupEventListeners();
    this.initMap(); // Initialize map with default view
  }
  
  initMap() {
    // Set default view (center of the world)
    this.map = L.map('map').setView([20, 0], 2);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
    
    // Create a feature group for the path
    this.pathLayer = L.featureGroup().addTo(this.map);
  }
  
  loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.setTheme(savedTheme);
  }
  
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const icon = theme === 'dark' ? '☀️' : '🌙';
    this.themeToggle.querySelector('.theme-icon').textContent = icon;
    
    // Update map tiles for dark mode
    this.updateMapTheme();
  }
  
  updateMapTheme() {
    const tiles = document.querySelectorAll('.leaflet-tile');
    tiles.forEach(tile => {
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        tile.style.filter = 'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)';
      } else {
        tile.style.filter = '';
      }
    });
  }
  
  setupEventListeners() {
    this.themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    });
    
    this.locationBtn.addEventListener('click', () => {
      if (this.watchId) {
        this.stopTracking();
        this.locationBtn.innerHTML = '<span class="btn-icon">📍</span> Get My Location';
      } else {
        this.startTracking();
        this.locationBtn.innerHTML = '<span class="btn-icon">✋</span> Stop Tracking';
      }
    });
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
  
  startTracking() {
    this.showLoading('Starting real-time tracking...');
    this.positionHistory = [];
    this.pathLayer.clearLayers();
    
    if (!navigator.geolocation) {
      this.showError(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    
    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      position => this.updatePosition(position),
      error => this.showError(error),
      options
    );
  }
  
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.output.innerHTML = '<div class="success">Tracking stopped</div>';
  }
  
  updatePosition(position) {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    const date = new Date(position.timestamp).toLocaleTimeString();
    
    // Add to position history
    this.positionHistory.push([latitude, longitude]);
    
    // Update display
    this.output.innerHTML = `
      <div class="coordinates success">
        <p>Latitude: <strong>${latitude.toFixed(6)}</strong></p>
        <p>Longitude: <strong>${longitude.toFixed(6)}</strong></p>
        <p>Accuracy: <strong>±${Math.round(accuracy)} meters</strong></p>
        ${heading ? `<p>Heading: <strong>${Math.round(heading)}°</strong></p>` : ''}
        ${speed ? `<p>Speed: <strong>${(speed * 3.6).toFixed(1)} km/h</strong></p>` : ''}
      </div>
      <p class="timestamp">Updated at: ${date}</p>
      <button id="copy-coords" class="secondary-btn">Copy Coordinates</button>
    `;
    
    // Add copy functionality
    document.getElementById('copy-coords')?.addEventListener('click', () => {
      navigator.clipboard.writeText(`${latitude}, ${longitude}`);
      const copyBtn = document.getElementById('copy-coords');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Coordinates';
      }, 2000);
    });
    
    // Update map
    this.updateMap(latitude, longitude);
  }
  
  updateMap(lat, lng) {
    this.mapContainer.classList.remove('hidden');
    
    // Center map on current position
    this.map.setView([lat, lng], 17);
    
    // Update or create marker
    if (!this.marker) {
      this.marker = L.marker([lat, lng]).addTo(this.map)
        .bindPopup("You are here!")
        .openPopup();
    } else {
      this.marker.setLatLng([lat, lng]);
    }
    
    // Draw path if we have enough points
    if (this.positionHistory.length > 1) {
      this.pathLayer.clearLayers();
      L.polyline(this.positionHistory, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(this.pathLayer);
    }
  }
  
  showLoading(message = 'Detecting your location...') {
    this.output.innerHTML = `
      <div class="loading">
        <p>${message}</p>
      </div>
    `;
    this.locationBtn.disabled = true;
    setTimeout(() => { this.locationBtn.disabled = false; }, 1000);
  }
  
  showError(error) {
    this.output.innerHTML = `
      <div class="error">
        <p>${error.message}</p>
        <p>Please ensure you've granted location permissions and try again.</p>
      </div>
    `;
    this.locationBtn.disabled = false;
    this.mapContainer.classList.add('hidden');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GeoLocateApp();
});