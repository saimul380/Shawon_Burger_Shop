// Main admin panel functionality
document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const loginForm = document.getElementById('adminLoginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Check if user is already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
        try {
            // Verify token is still valid
            const response = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const userData = JSON.parse(localStorage.getItem('adminUser') || '{}');
                if (userData.role === 'admin') {
                    showAdminPanel();
                    return;
                }
            }
            // If token is invalid or user is not admin, clear storage
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
        }
    }

    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Initialize WebSocket for real-time updates
    initWebSocket();

    // Helper Functions
    function showAdminPanel() {
        console.log('Showing admin panel');
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('logoutBtnContainer').style.display = 'block';
        
        const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
        if (user && user.name) {
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl) {
                adminNameEl.textContent = user.name;
            }
        }
        
        // Load initial data
        loadDashboardData();
        loadOrders();
        loadMenuItems();
        loadComboDeals();
        loadReviews();
    }

    function showLoginForm() {
        console.log('Showing login form');
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('logoutBtnContainer').style.display = 'none';
    }

    function showMessage(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `alert alert-${type}`;
            messageDiv.style.display = 'block';
            
            // Hide message after 5 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        } else {
            // Fallback to alert if message div not found
            window.alert(`[${type}] ${message}`);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        
        if (!email || !password) {
            showMessage('Please enter both email and password', 'danger');
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            console.log('Sending login request to /api/auth/login');
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            console.log('Login response status:', response.status);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed. Please check your credentials.');
            }
            
            if (!data.user || data.user.role !== 'admin') {
                throw new Error('Access denied. Admin privileges required.');
            }

            console.log('Login successful, storing token and user data');
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            
            // Show admin panel
            showAdminPanel();
            showMessage('Login successful!', 'success');
            
            // Clear the form
            loginForm.reset();
            
        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'Login failed. Please try again.', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

    function handleLogout() {
        console.log('Logging out');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        showLoginForm();
        showMessage('You have been logged out.', 'info');
    }

    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
        @media print {
            .no-print {
                display: none !important;
            }
            .print-only {
                display: block !important;
            }
            .dashboard-card {
                break-inside: avoid;
            }
            canvas {
                max-width: 100% !important;
                height: auto !important;
            }
        }
    `;
    document.head.appendChild(style);
});

// Functions that need to be called from HTML (must be in global scope)
function showError(message) {
    console.error(message);
    alert(message);
}

function showSuccess(message) {
    console.log(message);
    alert(message);
}

function closeModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) modal.hide();
}
