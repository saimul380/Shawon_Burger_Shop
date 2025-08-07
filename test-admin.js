// Test script to verify admin.js is loading properly
console.log('Test script loaded successfully!');

// Check if loadOrders is defined
console.log('loadOrders is defined:', typeof window.loadOrders === 'function');

// Check if DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // Check if admin panel elements exist
    console.log('Login container exists:', !!document.getElementById('loginContainer'));
    console.log('Admin panel exists:', !!document.getElementById('adminPanel'));
    
    // Try to call loadOrders if it exists
    if (typeof window.loadOrders === 'function') {
        console.log('Attempting to call loadOrders...');
        window.loadOrders().catch(error => {
            console.error('Error in loadOrders:', error);
        });
    }
});
