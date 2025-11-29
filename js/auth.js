// Google OAuth Authentication
// Usage: Include this file in your HTML pages

class Auth {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = null;
        this.apiUrl = window.CONFIG?.API_URL || 'http://localhost:8787';
        this.init();
    }

    async init() {
        // Check for token in URL (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (error) {
            console.error('OAuth error:', error);
            this.showError('Đăng nhập thất bại. Vui lòng thử lại.');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (token) {
            this.token = token;
            localStorage.setItem('auth_token', token);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            this.showSuccess('Đăng nhập thành công!');
        }

        if (this.token) {
            await this.loadUser();
        }

        this.updateUI();
    }

    async loadUser() {
        try {
            const response = await fetch(`${this.apiUrl}/api/auth/me`, {
                headers: { Authorization: `Bearer ${this.token}` },
            });

            if (response.ok) {
                const result = await response.json();
                this.user = result.data;
                console.log('User loaded:', this.user);
            } else {
                console.warn('Failed to load user, logging out');
                this.logout();
            }
        } catch (error) {
            console.error('Load user error:', error);
            this.logout();
        }
    }

    login() {
        // Redirect to Google OAuth
        window.location.href = `${this.apiUrl}/api/auth/google`;
    }

    async logout() {
        if (this.token) {
            try {
                await fetch(`${this.apiUrl}/api/auth/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${this.token}` },
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        this.updateUI();
        this.showSuccess('Đã đăng xuất');
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');

        if (this.user) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';

            if (userProfile) {
                userProfile.style.display = 'flex';
                userProfile.style.alignItems = 'center';
                userProfile.style.gap = '12px';
            }

            if (userAvatar) {
                userAvatar.src = this.user.avatar || 'https://i.pravatar.cc/40';
                userAvatar.alt = this.user.name || 'User';
                userAvatar.style.width = '40px';
                userAvatar.style.height = '40px';
                userAvatar.style.borderRadius = '50%';
                userAvatar.style.border = '2px solid var(--brand)';
            }

            if (userName) {
                userName.textContent = this.user.name || this.user.email;
                userName.style.fontWeight = '500';
            }

            // Add logout button if not exists
            let logoutBtn = document.getElementById('logoutBtn');
            if (!logoutBtn && userProfile) {
                logoutBtn = document.createElement('button');
                logoutBtn.id = 'logoutBtn';
                logoutBtn.className = 'btn';
                logoutBtn.textContent = 'Đăng xuất';
                logoutBtn.onclick = () => this.logout();
                userProfile.appendChild(logoutBtn);
            }
        } else {
            // User is not logged in
            if (loginBtn) {
                loginBtn.style.display = 'inline-block';
                loginBtn.onclick = () => this.login();
            }

            if (userProfile) {
                userProfile.style.display = 'none';
            }
        }
    }

    getToken() {
        return this.token;
    }

    isLoggedIn() {
        return !!this.user;
    }

    /**
     * Get authorization header for API requests
     * Usage: fetch(url, { headers: { ...auth.getAuthHeader() } })
     */
    getAuthHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    /**
     * Require authentication for an action
     * Returns true if authenticated, false otherwise (and redirects to login)
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            this.showError('Vui lòng đăng nhập để tiếp tục');
            this.login();
            return false;
        }
        return true;
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Try to use existing toast element
        let toast = document.getElementById('toast');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Create global instance
window.auth = new Auth();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
