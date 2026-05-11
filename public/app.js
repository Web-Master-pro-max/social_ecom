const API_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

function saveAuth(data) {
    if (data.token) {
        token = data.token;
        localStorage.setItem('token', token);
    }
    if (data.user) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
    }
}

function ensureAuth(redirect = 'login.html') {
    if (!token || !currentUser) {
        window.location.href = redirect;
        return false;
    }
    return true;
}

function setUserUI() {
    const userNameEl = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutButton');
    const profileLink = document.getElementById('navProfile') || document.getElementById('nav-profile');
    const sellerLink = document.getElementById('navSeller');
    const bottomPostBtn = document.getElementById('navBottomCreatePost');
    const adminLink = document.getElementById('navAdmin') || document.getElementById('nav-admin');
    const loginLink = document.getElementById('navLogin') || document.getElementById('nav-login');
    const sellerTools = document.getElementById('sellerTools');
    if (currentUser) {
        if (userNameEl) {
            userNameEl.innerText = currentUser.name;
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-flex';
        }
        if (profileLink) {
            profileLink.style.display = 'inline-flex';
        }
        if (bottomPostBtn) {
            bottomPostBtn.style.display = currentUser.role === 'seller' ? 'flex' : 'none';
        }
        if (sellerTools) {
            sellerTools.style.display = currentUser.role === 'seller' ? 'block' : 'none';
        }
        if (sellerLink) {
            sellerLink.style.display = currentUser.role === 'seller' ? 'inline-flex' : 'none';
        }
        if (adminLink) {
            adminLink.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
        }
        if (loginLink) {
            loginLink.style.display = 'none';
        }
    } else {
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        if (profileLink) {
            profileLink.style.display = 'none';
        }
        if (adminLink) {
            adminLink.style.display = 'none';
        }
        if (loginLink) {
            loginLink.style.display = 'inline-flex';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    window.location.href = 'login.html';
}

function highlightNav(page) {
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    const json = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error((json && json.message) || response.statusText || 'Request failed');
    }
    return json;
}

document.addEventListener('DOMContentLoaded', () => {
    setUserUI();
});
