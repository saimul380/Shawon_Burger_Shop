document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const adminPanel = document.getElementById('adminPanel');
    const loginContainer = document.getElementById('loginContainer');
    const logoutBtn = document.getElementById('logoutBtn');
    const token = localStorage.getItem('adminToken');

    if (token) {
        showAdminPanel();
    } else {
        showLoginForm();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            return showMessage('Please enter both email and password', 'danger');
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');
            if (data.user.role !== 'admin') throw new Error('Access denied. Admin privileges required.');

            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            showAdminPanel();
        } catch (error) {
            showMessage(error.message, 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        showLoginForm();
    });
});

function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('logoutBtnContainer').style.display = 'block';
    const user = JSON.parse(localStorage.getItem('adminUser'));
    if (user && user.name) {
        document.getElementById('adminName').textContent = user.name;
    }
    loadDashboardData();
}

function showLoginForm() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('logoutBtnContainer').style.display = 'none';
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    container.textContent = message;
    container.className = `alert alert-${type}`;
    container.style.display = 'block';
    setTimeout(() => container.style.display = 'none', 5000);
}

async function loadDashboardData() {
    try {
        await Promise.all([loadOrders(), loadMenuItems(), updateDashboardStats()]);
    } catch (error) {
        showMessage('Failed to load dashboard data.', 'danger');
    }
}

async function fetchAdminData(url) {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`);
    }
    return response.json();
}

async function loadOrders() {
    try {
        const orders = await fetchAdminData('/api/admin/orders');
        const container = document.getElementById('ordersContainer');
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p>No recent orders found.</p>';
            return;
        }
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr><th>ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>#${order.id}</td>
                                <td>${order.customer_name || 'N/A'}</td>
                                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                <td>৳${parseFloat(order.total_amount).toFixed(2)}</td>
                                <td><span class="badge bg-${getStatusColor(order.status)}">${formatStatus(order.status)}</span></td>
                                <td><button class="btn btn-sm btn-info" onclick="alert('Viewing order #${order.id}')">View</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showMessage('Failed to load orders.', 'danger');
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('recentOrdersList');
    if (!ordersList) return;
    
    ordersList.innerHTML = orders.map(order => `
        <tr>
            <td>${order._id}</td>
            <td>
                <div>${order.user.name}</div>
                <small class="text-muted">${order.user.phone}</small>
            </td>
            <td>${formatOrderItems(order.items)}</td>
            <td>৳${order.totalAmount}</td>
            <td>
                <span class="badge bg-${getStatusColor(order.orderStatus)}">
                    ${formatStatus(order.orderStatus)}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="updateOrderStatus('${order._id}', 'completed')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="updateOrderStatus('${order._id}', 'cancelled')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderStatus: status })
        });

        if (!response.ok) throw new Error('Failed to update order status');

        await loadOrders();
        await updateDashboardStats();
        showSuccess('Order status updated successfully');
    } catch (error) {
        console.error('Error updating order status:', error);
        showError('Failed to update order status');
    }
}

// Menu Management
async function loadMenuItems() {
    try {
        const response = await fetch('/api/admin/menu', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch menu items');
        
        const { items } = await response.json();
        displayMenuItems(items);
    } catch (error) {
        console.error('Error loading menu items:', error);
        showError('Failed to load menu items');
    }
}

function displayMenuItems(items) {
    const menuList = document.getElementById('menuItemsList');
    if (!menuList) return;

    menuList.innerHTML = items.map(item => `
        <tr>
            <td>
                <img src="${item.image}" alt="${item.name}" class="menu-item-thumb" width="50">
                ${item.name}
            </td>
            <td>${item.category}</td>
            <td>৳${item.price}</td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" 
                           ${item.inStock ? 'checked' : ''} 
                           onchange="updateStock('${item._id}', this.checked)">
                </div>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="showEditMenuItemModal('${item._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMenuItem('${item._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function saveMenuItem(event) {
    event.preventDefault();
    const form = document.getElementById('menuItemForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/admin/menu', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        
        if (!response.ok) throw new Error('Failed to save menu item');
        
        await loadMenuItems();
        closeModal('menuItemModal');
        showSuccess('Menu item saved successfully');
    } catch (error) {
        console.error('Error saving menu item:', error);
        showError('Failed to save menu item');
    }
}

async function updateStock(itemId, inStock) {
    try {
        const response = await fetch(`/api/admin/menu/${itemId}/stock`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inStock })
        });
        
        if (!response.ok) throw new Error('Failed to update stock status');
        
        showSuccess('Stock status updated successfully');
    } catch (error) {
        console.error('Error updating stock:', error);
        showError('Failed to update stock status');
    }
}

async function updatePrice(itemId, price) {
    try {
        const response = await fetch(`/api/admin/menu/${itemId}/price`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ price })
        });
        
        if (!response.ok) throw new Error('Failed to update price');
        
        await loadMenuItems();
        showSuccess('Price updated successfully');
    } catch (error) {
        console.error('Error updating price:', error);
        showError('Failed to update price');
    }
}

// Combo Deals Management
async function loadComboDeals() {
    try {
        const response = await fetch('/api/admin/combos', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch combo deals');
        
        const { combos } = await response.json();
        displayComboDeals(combos);
    } catch (error) {
        console.error('Error loading combo deals:', error);
        showError('Failed to load combo deals');
    }
}

function displayComboDeals(combos) {
    const comboList = document.getElementById('comboDealsTable').querySelector('tbody');
    if (!comboList) return;

    comboList.innerHTML = combos.map(combo => `
        <tr>
            <td>${combo.name}</td>
            <td>
                <ul class="list-unstyled mb-0">
                    ${combo.items.map(item => `
                        <li>${item.quantity}x ${item.menuItem.name}</li>
                    `).join('')}
                </ul>
            </td>
            <td>৳${combo.totalPrice}</td>
            <td>৳${combo.discountedPrice}</td>
            <td>${new Date(combo.validUntil).toLocaleDateString()}</td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" 
                           ${combo.isActive ? 'checked' : ''} 
                           onchange="updateComboStatus('${combo._id}', this.checked)">
                </div>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="showEditComboModal('${combo._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCombo('${combo._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function saveCombo(event) {
    event.preventDefault();
    const form = document.getElementById('comboForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/admin/combos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        
        if (!response.ok) throw new Error('Failed to save combo deal');
        
        await loadComboDeals();
        closeModal('comboModal');
        showSuccess('Combo deal saved successfully');
    } catch (error) {
        console.error('Error saving combo deal:', error);
        showError('Failed to save combo deal');
    }
}

// Review Management
async function loadReviews() {
    try {
        const rating = document.getElementById('reviewFilter')?.value;
        const response = await fetch(`/api/admin/reviews${rating !== 'all' ? `?rating=${rating}` : ''}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch reviews');
        
        const { reviews } = await response.json();
        displayReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        showError('Failed to load reviews');
    }
}

function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div>
                    <h6>${review.user.name}</h6>
                    <small class="text-muted">${new Date(review.createdAt).toLocaleDateString()}</small>
                </div>
                <div class="rating">
                    ${Array(5).fill(0).map((_, i) => `
                        <i class="fas fa-star ${i < review.rating ? 'text-warning' : 'text-muted'}"></i>
                    `).join('')}
                </div>
            </div>
            <p class="review-text">${review.comment}</p>
            <div class="review-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="respondToReview('${review._id}')">
                    <i class="fas fa-reply"></i> Respond
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${review._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function exportReviews() {
    try {
        const response = await fetch('/api/admin/reviews/export', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to export reviews');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reviews-export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting reviews:', error);
        showError('Failed to export reviews');
    }
}

// Charts Initialization
function initializeCharts() {
    initializeSalesChart();
    initializePopularItemsChart();
}

// Helper Functions
function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'preparing': 'info',
        'ready': 'primary',
        'delivered': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

function formatOrderItems(items) {
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
}

function showError(message) {
    // Implement toast or alert for error messages
    alert(message);
}

function showSuccess(message) {
    // Implement toast or alert for success messages
    alert(message);
}

function closeModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) modal.hide();
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
