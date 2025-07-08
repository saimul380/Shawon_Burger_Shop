document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageContainer = document.getElementById('messageContainer');
    const authTabs = document.querySelectorAll('.auth-tab');

    // Check if user is already logged in
    if (localStorage.getItem('userToken')) {
        window.location.href = 'index.html';
    }

    // Tab switching functionality
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.form).classList.add('active');
            hideMessage();
        });
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            return showMessage('Please enter both email and password', 'error');
        }

        await handleAuth(loginForm, '/api/auth/login', { email, password }, 'Login successful!');
    });

    // Registration form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const phone = document.getElementById('registerPhone').value.trim();
        const address = document.getElementById('registerAddress').value.trim();

        if (!name || !email || !password || !phone || !address) {
            return showMessage('Please fill out all fields', 'error');
        }

        await handleAuth(registerForm, '/api/auth/register', { name, email, password, phone, address }, 'Registration successful!');
    });

    // Generic function to handle both login and registration
    async function handleAuth(form, url, body, successMessage) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An error occurred');
            }

            // Store token and user data
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Show success and redirect
            showMessage(successMessage, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

    // Helper functions to show/hide messages
    function showMessage(message, type = 'info') {
        messageContainer.textContent = message;
        messageContainer.className = `alert alert-${type === 'error' ? 'danger' : type}`;
        messageContainer.style.display = 'block';
    }

    function hideMessage() {
        messageContainer.style.display = 'none';
    }
});
