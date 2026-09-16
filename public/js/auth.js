// Shared enterprise auth and session utility
const Auth = {
  getToken() {
    return localStorage.getItem('portal_token');
  },

  setToken(token) {
    localStorage.setItem('portal_token', token);
  },

  getUser() {
    const u = localStorage.getItem('portal_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    localStorage.setItem('portal_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
  },

  async apiRequest(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { credentials: 'omit', credentials: 'include', ...options, headers });
    
    if (response.status === 401) {
      this.clearSession();
      if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.href = '/index.html';
      }
    }
    return response;
  },

  async checkAuthStatus() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await this.apiRequest('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.setUser(data.user);
        return data.user;
      } else {
        this.clearSession();
        return null;
      }
    } catch (e) {
      return null;
    }
  },

  hasPermission(permission) {
    const user = this.getUser();
    if (!user || !user.role || !user.role.permissions) return false;
    if (user.role.permissions.includes('*')) return true;
    return user.role.permissions.includes(permission);
  },

  async logout() {
    try {
      await this.apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.clearSession();
    window.location.href = '/index.html';
  },

  renderUserNav() {
    const user = this.getUser();
    if (!user) return;
    
    const nameEl = document.getElementById('topbar-user-name');
    const roleEl = document.getElementById('topbar-user-role');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role ? user.role.name : 'User';

    // Hide or show administration nav items based on permissions
    const adminNavSection = document.getElementById('admin-nav-section');
    if (adminNavSection) {
      const canManageUsers = this.hasPermission('users.view');
      const canManageRoles = this.hasPermission('roles.manage');
      const canManageSystems = this.hasPermission('systems.manage');
      const canViewAudit = this.hasPermission('audit.view');

      if (!canManageUsers && !canManageRoles && !canManageSystems && !canViewAudit) {
        adminNavSection.style.display = 'none';
      }
    }
  }
};
