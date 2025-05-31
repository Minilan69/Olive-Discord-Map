class AuthManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            const response = await fetch("/me");
            const data = await response.json();
            this.updateAuthUI(data);
        } catch (error) {
            console.error(
                "Erreur lors de la vérification de l'authentification:",
                error
            );
        }
    }

    updateAuthUI(data) {
        const loginBtn = document.getElementById("login-logout-point-btn");

        if (!loginBtn) return;

        if (data.loggedIn) {
            loginBtn.innerHTML = `<i data-lucide="log-out" class="btn-icon"></i> Se déconnecter`;
            loginBtn.onclick = () => {
                this.logout();
            };
        } else {
            loginBtn.innerHTML = `<i data-lucide="log-in" class="btn-icon"></i> Connexion avec Discord`;
            loginBtn.onclick = () => {
                this.login();
            };
        }
    }

    login() {
        const redirectUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirectUrl}`;
    }

    logout() {
        const redirectUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/logout?redirect=${redirectUrl}`;
    }
}

// Initialisation automatique
document.addEventListener("DOMContentLoaded", () => {
    new AuthManager();
});
