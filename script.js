// State and Initialization
let cart = [];
let stripe, elements, cardElement;

// These functions are called by inline HTML onclick attributes, so they need to be in the global scope.
function updateQuantity(index, change) {
    const item = cart[index];
    if (!item) return;
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
        item.quantity = newQuantity;
    } else {
        cart.splice(index, 1);
    }
    updateOrderItems();
    updateCartTotal();
}

function removeItem(index) {
    cart.splice(index, 1);
    updateOrderItems();
    updateCartTotal();
}

// --- CORE FUNCTIONS (Scoped to the script, not global) ---

function addToCart(name, price, quantity = 1, description = '') {
    const token = localStorage.getItem('userToken');
    if (!token) {
        alert('Please log in to place an order.');
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        if (loginModal) loginModal.show();
        return;
    }
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ name, price, quantity, description });
    }
    updateOrderItems();
    updateCartTotal();
}

function updateOrderItems() {
    const orderItems = document.getElementById('orderItems');
    if (!orderItems) return;
    orderItems.innerHTML = '';
    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'list-group-item d-flex justify-content-between align-items-center';
        itemElement.innerHTML = `
            <div>
                <h6 class="mb-0">${item.name}</h6>
                <small class="text-muted">Price: ${formatPrice(item.price)} x ${item.quantity}</small>
            </div>
            <div class="d-flex align-items-center">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="updateQuantity(${index}, -1)">-</button>
                <span class="mx-2">${item.quantity}</span>
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="updateQuantity(${index}, 1)">+</button>
                <button class="btn btn-sm btn-danger ms-3" onclick="removeItem(${index})">×</button>
            </div>
        `;
        orderItems.appendChild(itemElement);
    });
}

function formatPrice(price) {
    return '৳' + parseFloat(price).toFixed(2);
}

function calculateDeliveryFee(subtotal) {
    if (subtotal >= 1000) return 0;
    const addressInput = document.getElementById('deliveryAddress');
    const address = addressInput ? addressInput.value.toLowerCase() : '';
    if (address.includes('gec') || address.includes('agrabad')) return 30;
    if (address.includes('nasirabad')) return 50;
    if (address.includes('halishahar')) return 70;
    return 100;
}

function updateCartTotal() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = calculateDeliveryFee(subtotal);
    const total = subtotal + deliveryFee;

    const subtotalEl = document.getElementById('subtotal');
    const deliveryFeeEl = document.getElementById('deliveryFee');
    const totalAmountEl = document.getElementById('totalAmount');
    const cartBadge = document.getElementById('cart-badge');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (deliveryFeeEl) deliveryFeeEl.textContent = formatPrice(deliveryFee);
    if (totalAmountEl) totalAmountEl.textContent = formatPrice(total);

    if (cartBadge) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

function togglePaymentForms(paymentMethod) {
    const cardPayment = document.getElementById('cardPayment');
    if (cardPayment) {
        cardPayment.style.display = (paymentMethod === 'card') ? 'block' : 'none';
        if (paymentMethod === 'card' && cardElement) {
            cardElement.mount('#card-element');
        }
    }
}

// --- SCRIPT EXECUTION AFTER DOM LOADS ---

document.addEventListener('DOMContentLoaded', () => {

    // Initialize Stripe
    try {
        stripe = Stripe('pk_test_51PZT5sRxBfCj0yEd1ADqGvjO9j23L4tZ5J8fJ6kX8gZ0y7c8V9p8n9V9h7Y6t5U4w3X2e1a0b9c8d7e'); // Replace with your actual key
        elements = stripe.elements();
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    '::placeholder': { color: '#aab7c4' }
                },
                invalid: { color: '#fa755a', iconColor: '#fa755a' }
            }
        });
    } catch (error) {
        console.error('Stripe initialization failed:', error);
    }

    // Attach event listener to the order form for submission
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!orderForm.checkValidity()) {
                orderForm.classList.add('was-validated');
                return;
            }
            if (cart.length === 0) {
                alert('Please add items to your cart before placing an order.');
                return;
            }

            const orderDetails = {
                items: cart,
                totalAmount: parseFloat(document.getElementById('totalAmount').textContent.replace(/[^0-9.-]+/g, '')),
                deliveryAddress: document.getElementById('deliveryAddress').value,
                paymentMethod: document.getElementById('paymentMethod').value,
                customerName: document.getElementById('customerName').value,
                customerPhone: document.getElementById('customerPhone').value,
                specialInstructions: document.getElementById('specialInstructions').value
            };

            try {
                const token = localStorage.getItem('userToken');
                if (!token) {
                    alert('You must be logged in to place an order.');
                    return;
                }

                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(orderDetails)
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.message || 'Failed to place order.');
                }

                alert('Thank you for your order! It has been placed and will be delivered soon.');

                cart = [];
                orderForm.reset();
                orderForm.classList.remove('was-validated');
                const orderModalInstance = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
                if(orderModalInstance) orderModalInstance.hide();
                updateOrderItems();
                updateCartTotal();

            } catch (error) {
                console.error('Order Error:', error);
                alert('Order Error: ' + error.message);
            }
        });
    }

    // Attach other event listeners
    const deliveryAddressInput = document.getElementById('deliveryAddress');
    if (deliveryAddressInput) {
        deliveryAddressInput.addEventListener('input', updateCartTotal);
    }

    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', (e) => togglePaymentForms(e.target.value));
    }

    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.card');
            const itemName = card.querySelector('.card-title').textContent;
            
            // Correctly find the price, looking for a deal price first.
            const dealPriceEl = card.querySelector('.deal-price');
            const priceEl = card.querySelector('.price');
            let priceText = '';

            if (dealPriceEl) {
                priceText = dealPriceEl.textContent;
            } else if (priceEl) {
                priceText = priceEl.textContent;
            }

            const itemPrice = parseFloat(priceText.replace(/[^0-9.-]+/g, ''));

            if (itemName && !isNaN(itemPrice)) {
                addToCart(itemName, itemPrice);
            } else {
                console.error('Could not add item to cart. Name or Price is invalid.', { itemName, itemPrice });
            }
        });
    });

    // Initial UI update
    updateCartTotal();
});


