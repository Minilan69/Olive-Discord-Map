class MapManager {
    constructor() {
        this.map = null;
        this.editMode = false;
        this.userMarker = null;
        this.otherMarkers = [];
        this.currentUser = null;

        this.initIcons();
        this.initMap();
        this.checkAuthentication();
    }

    initIcons() {
        // Icons pour les marqueurs utilisateurs avec différentes couleurs
        this.userIcon = L.icon({
            iconUrl: '/assets/pin-red.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -30],
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            shadowSize: [40, 40]
        });

        this.userIcon2 = L.icon({
            iconUrl: '/assets/pin-black.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -30],
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            shadowSize: [40, 40]
        });
    }

    initMap() {
        // Initialisation de la carte avec centre sur Paris et zoom 5
        this.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([48.8566, 2.3522], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            minZoom: 3
        }).addTo(this.map);

        // Ajouter le contrôle de zoom en haut à droite
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Événement de clic sur la carte
        this.map.on('click', (e) => this.handleMapClick(e));
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/me');
            const data = await response.json();

            if (!data.loggedIn) {
                this.showBlurOverlay("Tu dois te connecter pour accéder à la carte");
                return;
            }

            if (data.notInGuild) {
                this.showBlurOverlay("Tu dois être sur le serveur Discord pour accéder à la carte", true);
                return;
            }

            // Utilisateur connecté et dans la guilde
            this.currentUser = data;
            this.hideBlurOverlay();
            this.updateAuthenticatedUI(data);
            await this.loadPoints();

        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
        }
    }

    showBlurOverlay(message, isGuildError = false) {
        document.getElementById('blur-message').textContent = message;
        document.getElementById('blur-overlay').classList.remove('hidden');
        document.querySelector('.sidebar').style.display = 'none';

        if (isGuildError) {
            const loginBtn = document.getElementById('login-btn');
            loginBtn.textContent = 'Rejoindre le serveur Discord';
            loginBtn.onclick = () => {
                window.location.href = 'https://discord.gg/maman';
            };
        }
    }

    hideBlurOverlay() {
        document.getElementById('blur-overlay').classList.add('hidden');
        document.querySelector('.sidebar').style.display = 'block';
    }

    updateAuthenticatedUI(data) {
        const logoutBtn = document.getElementById('logout-point-btn');
        logoutBtn.innerHTML = `<i data-lucide="log-out" class="btn-icon"></i> Se déconnecter`;
        logoutBtn.style.display = 'block';
    }

    async loadPoints() {
        try {
            const response = await fetch('/points');
            const points = await response.json();

            points.forEach(point => {
                if (point.id === this.currentUser.id) {
                    this.createUserMarker(point);
                } else {
                    this.createOtherMarker(point);
                }
            });

        } catch (error) {
            console.error('Erreur lors du chargement des points:', error);
        }
    }

    createUserMarker(point) {
        this.userMarker = L.marker([point.latitude, point.longitude], {
            icon: this.userIcon,
            draggable: true
        }).addTo(this.map);

        this.userMarker.bindPopup(point.username).openPopup();
        this.userMarker.on('dragend', () => {
            const pos = this.userMarker.getLatLng();
            this.updatePoint(pos.lat, pos.lng);
        });

        this.map.setView([point.latitude, point.longitude], 12);
    }

    createOtherMarker(point) {
        const marker = L.marker([point.latitude, point.longitude], {
            icon: this.userIcon2
        }).addTo(this.map);

        marker.bindPopup(point.username);
        this.otherMarkers.push(marker);
    }

    handleMapClick(e) {
        if (!this.editMode) return;

        const { lat, lng } = e.latlng;

        if (this.userMarker) {
            this.userMarker.setLatLng(e.latlng);
        } else {
            this.userMarker = L.marker(e.latlng, {
                icon: this.userIcon,
                draggable: true
            }).addTo(this.map);

            this.userMarker.bindPopup(this.currentUser.username).openPopup();
            this.userMarker.on('dragend', () => {
                const pos = this.userMarker.getLatLng();
                this.updatePoint(pos.lat, pos.lng);
            });
        }

        this.updatePoint(lat, lng);
    }

    async updatePoint(lat, lng) {
        // Ajouter un petit décalage aléatoire pour masquer la position exacte
        const offsetLat = (Math.random() - 0.5) * 0.001;
        const offsetLng = (Math.random() - 0.5) * 0.001;

        const latFinal = 41.30391707903242 + offsetLat;
        const lngFinal = -81.90169215202333 + offsetLng;

        try {
            const response = await fetch('/update-point', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: latFinal,
                    longitude: lngFinal
                })
            });

            if (!response.ok) {
                console.error('Erreur mise à jour position');
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour du point:', error);
        }
    }

    toggleEditMode() {
        this.editMode = !this.editMode;

        const toggleBtn = document.getElementById('toggle-position-btn');
        toggleBtn.textContent = this.editMode
            ? 'Désactiver le mode position'
            : 'Activer le mode position';

        if (this.editMode) {
            // Supprimer les marqueurs des autres utilisateurs en mode édition
            this.otherMarkers.forEach(marker => this.map.removeLayer(marker));
            toggleBtn.classList.add('active');
        } else {
            // Recharger la page pour rafraîchir les marqueurs
            window.location.reload();
        }
    }

    async deletePoint() {
        try {
            const response = await fetch('/delete-point', {
                method: 'POST'
            });

            if (response.ok) {
                if (this.userMarker) {
                    this.map.removeLayer(this.userMarker);
                    this.userMarker = null;
                }
                alert('Point supprimé');
            } else {
                alert('Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du point:', error);
            alert('Erreur lors de la suppression');
        }
    }

    async searchCity(cityName) {
        if (!cityName.trim()) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
            );
            const data = await response.json();

            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                this.map.setView([lat, lon], 12);
            } else {
                alert('Ville non trouvée');
            }
        } catch (error) {
            console.error('Erreur de géocodage:', error);
            alert('Erreur lors de la recherche');
        }
    }
}

// Instance globale du gestionnaire de carte
let mapManager;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    mapManager = new MapManager();
    // Exposer globalement pour l'utilisation dans d'autres scripts
    window.mapManager = mapManager;
});