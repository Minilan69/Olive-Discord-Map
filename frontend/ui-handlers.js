// ui-handlers.js - Gestionnaires d'événements pour l'interface utilisateur

class UIHandlers {
    constructor() {
        this.init();
    }

    init() {
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Attendre que le DOM soit chargé
        document.addEventListener('DOMContentLoaded', () => {
            this.setupMapControls();
            this.setupMemberSearch();
        });
    }

    setupMapControls() {
        // Bouton pour basculer le mode édition
        const toggleBtn = document.getElementById('toggle-position-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (window.mapManager) {
                    window.mapManager.toggleEditMode();
                }
            });
        }

        // Bouton pour supprimer le point utilisateur
        const deleteBtn = document.getElementById('delete-point-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (window.mapManager) {
                    window.mapManager.deletePoint();
                }
            });
        }
    }

    setupMemberSearch() {
        const searchBtn = document.getElementById('search-member-btn');
        const memberInput = document.getElementById('member-input');

        if (searchBtn && memberInput) {
            searchBtn.addEventListener('click', () => {
                const member = memberInput.value.trim();
                if (window.mapManager && member) {
                    window.mapManager.searchMember(member).catch(console.error);
                }
            });

            memberInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const member = memberInput.value.trim(); // correction ici
                    if (window.mapManager && member) {
                        window.mapManager.searchMember(member).catch(console.error); // correction ici
                    }
                }
            });

            memberInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    setTimeout(() => {
                        memberInput.value = '';
                    }, 1000);
                }
            });
        }
    }


    // Méthodes utilitaires pour l'UI
    showNotification(message, type = 'info') {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Suppression automatique après 3 secondes
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50px;
      height: 50px;
      border: 4px solid #334155;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      z-index: 10000;
    `;

        // Ajouter l'animation CSS
        const style = document.createElement('style');
        style.textContent = `
      @keyframes spin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(spinner);

        return spinner;
    }

    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    // Gestion responsive
    handleResize() {
        const sidebar = document.querySelector('.sidebar');
        const mapContainer = document.querySelector('.map-container');

        if (window.innerWidth <= 768) {
            // Mode mobile
            if (sidebar) {
                sidebar.classList.add('mobile');
            }
        } else {
            // Mode desktop
            if (sidebar) {
                sidebar.classList.remove('mobile');
            }
        }
    }
}

// Initialisation des gestionnaires UI
const uiHandlers = new UIHandlers();

// Écouter les changements de taille d'écran
window.addEventListener('resize', () => {
    uiHandlers.handleResize();
});

// Exposer globalement pour l'utilisation dans d'autres scripts
window.uiHandlers = uiHandlers;