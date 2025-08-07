document.addEventListener('DOMContentLoaded', () => {
    // Check user authentication state
    checkAuthState();
    
    // Logout button event listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Also check auth state when the page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAuthState();
        }
    });
    
    // Function to check if user is logged in
    function checkAuthState() {
        const token = localStorage.getItem('userToken');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // Get auth section elements
        const loggedInButtons = document.getElementById('loggedInButtons');
        const loggedOutButtons = document.getElementById('loggedOutButtons');
        const userGreeting = document.getElementById('userGreeting');
        
        if (token && userData.name) {
            // User is logged in: show logged-in buttons, hide logged-out buttons
            if (loggedInButtons) {
                loggedInButtons.classList.remove('d-none');
                loggedInButtons.classList.add('d-flex');
            }
            if (loggedOutButtons) {
                loggedOutButtons.classList.add('d-none');
                loggedOutButtons.classList.remove('d-flex');
            }
            if (userGreeting) userGreeting.textContent = `Hello, ${userData.name}`;

            // Make authenticated API calls possible
            setupAuthenticatedAxios(token);
        } else {
            // User is logged out: hide logged-in buttons, show logged-out buttons
            if (loggedInButtons) {
                loggedInButtons.classList.add('d-none');
                loggedInButtons.classList.remove('d-flex');
            }
            if (loggedOutButtons) {
                loggedOutButtons.classList.remove('d-none');
                loggedOutButtons.classList.add('d-flex');
            }
        }
    }
    
    // Function to handle logout
    function handleLogout() {
        // Clear local storage
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');

        // Reload the page to ensure a clean state and UI update
        window.location.reload();
    }
    
    // Setup axios with authentication token (if using axios)
    function setupAuthenticatedAxios(token) {
        // If using axios, you would configure it here
        if (window.axios) {
            window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }
});
