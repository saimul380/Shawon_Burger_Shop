// Admin Panel Functions
console.log('Admin script loaded!');

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.message, 'in', e.filename, 'line', e.lineno);
    showMessage('An error occurred: ' + e.message, 'danger');
});

// Show message to user
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `alert alert-${type} mt-3`;
        messageDiv.style.display = 'block';
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// Load orders from API
window.loadOrders = async function() {
    console.log('Loading orders...');
    const token = localStorage.getItem('adminToken');
    const ordersContainer = document.getElementById('ordersContainer');
    
    if (!token) {
        showMessage('Please log in to view orders', 'warning');
        return;
    }

    if (!ordersContainer) {
        console.error('Orders container not found');
        return;
    }

    // Show loading state
    ordersContainer.innerHTML = `
        <div class="text-center my-4">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading orders...</span>
            </div>
            <p class="mt-2">Loading orders...</p>
        </div>`;

    try {
        const response = await fetch('/api/admin/orders', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load orders: ${response.status}`);
        }

        const orders = await response.json();
        console.log('Orders loaded:', orders);
        
        if (!Array.isArray(orders)) {
            throw new Error('Invalid orders data received');
        }

        if (orders.length === 0) {
            ordersContainer.innerHTML = '<div class="alert alert-info">No orders found.</div>';
            return;
        }

        // Create table for orders
        let tableHtml = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add each order to the table
        orders.forEach(order => {
            const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const statusClass = {
                'pending': 'warning',
                'processing': 'info',
                'completed': 'success',
                'cancelled': 'danger'
            }[order.status?.toLowerCase()] || 'secondary';

            // Format items list
            const itemsList = order.items?.map(item => 
                `${item.quantity}x ${item.name} (৳${parseFloat(item.price).toFixed(2)})`
            ).join('<br>') || 'No items';

            // Status options based on current status
            let statusOptions = '';
            const currentStatus = order.status?.toLowerCase() || 'pending';
            
            // Define all possible statuses in order of progression
            const statuses = [
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirm Order' },
                { value: 'out_for_delivery', label: 'Out for Delivery' },
                { value: 'delivered', label: 'Mark as Delivered' },
                { value: 'cancelled', label: 'Cancel Order' }
            ];
            
            // Generate options based on current status
            statusOptions = statuses.map(status => {
                const selected = status.value === currentStatus ? 'selected' : '';
                // Disable statuses that are not valid transitions
                const disabled = !isValidStatusTransition(currentStatus, status.value) ? 'disabled' : '';
                return `<option value="${status.value}" ${selected} ${disabled}>${status.label}</option>`;
            }).join('\n');
            
            // Helper function to validate status transitions
            function isValidStatusTransition(current, next) {
                const validTransitions = {
                    'pending': ['confirmed', 'cancelled'],
                    'confirmed': ['out_for_delivery', 'cancelled'],
                    'out_for_delivery': ['delivered'],
                    'delivered': [],
                    'cancelled': []
                };
                
                // Allow staying in the same status
                if (current === next) return true;
                
                // Check if the transition is valid
                return validTransitions[current]?.includes(next) || false;
            }

            tableHtml += `
                <tr data-order-id="${order.id}">
                    <td>#${order.id}</td>
                    <td>${order.customer_name || 'N/A'}</td>
                    <td>${order.customer_phone || 'N/A'}</td>
                    <td>${itemsList}</td>
                    <td>৳${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                    <td>
                        <select class="form-select form-select-sm status-select" 
                                data-order-id="${order.id}" 
                                ${order.status.toLowerCase() === 'delivered' || order.status.toLowerCase() === 'cancelled' ? 'disabled' : ''}>
                            ${statusOptions}
                        </select>
                    </td>
                    <td>${orderDate}</td>
                    <td>
                        ${order.payment_method === 'cash' ? 'Cash on Delivery' : 
                          order.payment_method === 'nagad' ? 'Nagad' : 
                          order.payment_method === 'rocket' ? 'Rocket' : 
                          order.payment_method?.toUpperCase() || 'N/A'}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-order" data-order-id="${order.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

        ordersContainer.innerHTML = tableHtml;
        
        // Add event listeners to view buttons and status selects
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.target.closest('button').dataset.orderId;
                viewOrderDetails(orderId);
            });
        });

        // Add event listeners for status changes
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', handleStatusChange);
        });

    } catch (error) {
        console.error('Error loading orders:', error);
        showMessage('Failed to load orders: ' + error.message, 'danger');
        
        // Show error state
        ordersContainer.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error loading orders</h5>
                <p>${error.message}</p>
                <button class="btn btn-sm btn-warning" onclick="window.loadOrders()">
                    <i class="fas fa-sync"></i> Try Again
                </button>
            </div>`;
    }
};

// Handle status change
async function handleStatusChange(e) {
    const select = e.target;
    const orderId = select.dataset.orderId;
    const newStatus = select.value;
    
    // Show loading state
    const originalValue = select.innerHTML;
    select.disabled = true;
    select.innerHTML = '<option>Updating...</option>';
    
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        // If changing to delivered, confirm payment
        let paymentCompleted = false;
        if (newStatus === 'delivered') {
            paymentCompleted = confirm('Has the payment been completed?');
        }
        
        console.log('Updating order status to:', newStatus);
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                status: newStatus.toLowerCase(),
                payment_completed: paymentCompleted || false
            })
        });
        
        console.log('Status update response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to update order status');
        }
        
        const result = await response.json();
        showMessage(`Order #${orderId} status updated to ${newStatus}`, 'success');
        
        // Reload orders to reflect changes
        await loadOrders();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showMessage('Failed to update order status: ' + error.message, 'danger');
        // Reset the select to original value
        select.value = select.dataset.originalValue;
    } finally {
        select.disabled = false;
    }
}

// Load dashboard statistics
async function loadDashboardStatistics() {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        
        const response = await fetch('/api/admin/statistics', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load statistics');
        }

        const stats = await response.json();
        
        // Update the statistics cards
        document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = `৳${(stats.totalRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('pendingOrders').textContent = stats.pendingOrders || 0;
        document.getElementById('deliveredOrders').textContent = stats.deliveredOrders || 0;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Don't show error to user as it's not critical
    }
}

// View order details
function viewOrderDetails(orderId) {
    console.log('Viewing order details for:', orderId);
    // For now, just show a message. Can be expanded to show a modal with order details.
    showMessage(`Viewing details for order #${orderId}`, 'info');
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const submitBtn = document.querySelector('#adminLoginForm button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    if (!email || !password) {
        showMessage('Please enter both email and password', 'warning');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
    
    // Make login request
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Login failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            // Store token and user data
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            
            // Show admin panel
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('logoutBtnContainer').style.display = 'block';
            
            // Update admin name
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl && data.user && data.user.name) {
                adminNameEl.textContent = data.user.name;
            }
            
            // Load dashboard data in the background
            Promise.all([
                window.loadOrders(),
                loadDashboardStatistics()
            ]).catch(error => {
                console.error('Error loading dashboard data:', error);
                showMessage('Error loading dashboard data', 'warning');
            });
            
            showMessage('Login successful!', 'success');
        } else {
            throw new Error(data.error || 'Invalid credentials');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showMessage('Login failed: ' + (error.message || 'Invalid credentials'), 'danger');
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Show login form
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('logoutBtnContainer').style.display = 'none';
    
    // Clear form
    document.getElementById('adminLoginForm').reset();
    
    showMessage('You have been logged out.', 'info');
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing admin panel...');
    
    // Set up event listeners first
    const loginForm = document.getElementById('adminLoginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Make sure the login form exists before adding event listener
    if (loginForm) {
        console.log('Login form found, adding submit handler');
        loginForm.addEventListener('submit', function(e) {
            console.log('Login form submitted');
            handleLogin(e);
        });
    } else {
        console.error('Login form not found!');
    }
    
    if (logoutBtn) {
        console.log('Logout button found, adding click handler');
        logoutBtn.addEventListener('click', handleLogout);
    } else {
        console.error('Logout button not found!');
    }
    
    // Check if user is already logged in
    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    
    // If user is logged in, show admin panel
    if (token && user.role === 'admin') {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('logoutBtnContainer').style.display = 'block';
        
        // Set admin name if element exists
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl && user.name) {
            adminNameEl.textContent = user.name;
        }
        
        // Load dashboard data in the background
        Promise.all([
            window.loadOrders(),
            loadDashboardStatistics()
        ]).catch(error => {
            console.error('Error loading dashboard data:', error);
            showMessage('Error loading dashboard data', 'danger');
        });
    } else {
        // Show login form
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('logoutBtnContainer').style.display = 'none';
    }
});
