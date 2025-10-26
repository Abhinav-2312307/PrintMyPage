document.addEventListener('DOMContentLoaded', () => {

    // const backendUrl = 'http://localhost:5001';
    const backendUrl = 'https://printmypage.onrender.com';
    let loggedInUser = null;

    async function checkUserSession() {
        const authLinks = document.getElementById('auth-links');
        try {
            const response = await fetch(`${backendUrl}/api/auth/check-session`, {
                credentials: 'include' // <-- ADDED
            });
            const result = await response.json();
            
            if (response.ok && result.user) {
                loggedInUser = result.user;
                authLinks.innerHTML = `
                    <span style="margin-right: 1rem;">Hi, ${loggedInUser.name}</span>
                    <button id="logoutBtn">Logout</button>
                `;
                document.getElementById('logoutBtn').addEventListener('click', logoutUser);
                loadMyOrders();
            } else {
                loggedInUser = null;
                authLinks.innerHTML = '<a href="login.html">Login / Register</a>';
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error checking session:', error);
            window.location.href = 'login.html';
        }
    }

    async function logoutUser() {
        await fetch(`${backendUrl}/api/auth/logout`, {
            credentials: 'include' // <-- ADDED
        });
        loggedInUser = null;
        window.location.href = 'index.html'; 
    }

    async function loadMyOrders() {
        const contentBox = document.getElementById('order-list-content');
        if (!loggedInUser) return;

        try {
            const response = await fetch(`${backendUrl}/api/my-orders`, {
                credentials: 'include' // <-- ADDED
            }); 
            const orders = await response.json();

            if (!response.ok) {
                throw new Error(orders.message || 'Failed to fetch orders');
            }
            if (orders.length === 0) {
                contentBox.innerHTML = '<p>You have not placed any orders yet.</p>';
                return;
            }
            contentBox.innerHTML = ''; 

            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card-item';
                const orderDate = new Date(order.orderDate).toLocaleDateString();
                let actionsHtml = '';

                if (order.orderStatus === 'awaiting-payment') {
                    actionsHtml = `
                        <p style="color: #ffb74d;">Your order is accepted. Please complete payment.</p>
                        <button class="order-btn" id="payNowBtn" data-order-id="${order.orderId}">Pay Now (₹${order.printDetails.totalPrice})</button>
                        <p style="font-size: 0.8rem; margin-top: 1rem;">(This is a simulation.)</p>
                    `;
                }
                
                if (order.orderStatus === 'completed' && !order.customerRemark) {
                    actionsHtml = `
                        <form class="remark-form" id="remarkForm" data-order-id="${order.orderId}">
                            <label>Add Your Remark:</label>
                            <textarea class="customerRemarkText" placeholder="Great service!"></textarea>
                            <button type="submit" class="order-btn">Submit Remark</button>
                        </form>
                    `;
                }

                // ... inside frontend/my-orders.js loadMyOrders() ...

                orderCard.innerHTML = `
                    <div class="order-card-header">
                        <h3>Order: ${order.orderId} <span>(${orderDate})</span></h3>
                        <span class="order-status-badge status-${order.orderStatus}">${order.orderStatus.replace('-', ' ')}</span>
                    </div>
                    <div class="order-card-body">
                        <div>

                            ${order.supplier ? `
                                <p><strong>Supplier:</strong> ${order.supplier.name} (${order.supplier.location_code})</p>
                                ${order.supplier.contact_number ? `<p><strong>Supplier Contact:</strong> ${order.supplier.contact_number}</p>` : ''} 
                            ` : `
                                <p><strong>Supplier:</strong> Searching...</p>
                            `}
                            <p><strong>Print Type:</strong> ${order.printDetails.printType}</p>

                        </div>
                        <div>

                        </div>
                    </div>
                    <div class="order-actions">
                        ${actionsHtml}
                    </div>
                `;
                // ...
                contentBox.appendChild(orderCard);
            });

        } catch (error) {
            console.error(error);
            contentBox.innerHTML = `<p style="color: #e57373;">${error.message}</p>`;
        }
    }

    // document.getElementById('order-list-content').addEventListener('click', async (e) => {
    //     e.preventDefault();
        
    //     if (e.target.id === 'payNowBtn') {
    //         const orderId = e.target.dataset.orderId;
    //         e.target.disabled = true;
    //         e.target.textContent = 'Processing...';

    //         try {
    //             const response = await fetch(`${backendUrl}/api/order/payment-success/${orderId}`, {
    //                 method: 'POST',
    //                 credentials: 'include' // <-- ADDED
    //             });
    //             const data = await response.json();
    //             if (!response.ok) throw new Error(data.message);
    //             loadMyOrders(); 
    //         } catch (error) {
    //             alert('Payment failed: ' + error.message);
    //             e.target.disabled = false;
    //             e.target.textContent = `Pay Now (₹...)`;
    //         }
    //     }
    // });
    // --- NEW CLICK HANDLER FOR "PAY NOW" ---
document.getElementById('order-list-content').addEventListener('click', async (e) => {
  if (e.target.id === 'payNowBtn') {
    e.preventDefault();
    const orderId = e.target.dataset.orderId; // Our DB's orderId

    try {
      // 1. Create the Razorpay Order
      const response = await fetch(`${backendUrl}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create order');

      // 2. Open the Razorpay Payment Window
      const options = {
        key: data.key_id, // Your Key ID from backend
        amount: data.amount, // Amount in paise
        currency: "INR",
        name: "PrintMyPage",
        description: `Payment for Order ${orderId}`,
        order_id: data.orderId, // Razorpay's order_id

        // This 'handler' function runs after payment
        handler: function (response) {
          // In production, we rely *only* on the webhook
          // But for testing, it's nice to give instant feedback
          alert('Payment successful! Your order is being processed.');
          loadMyOrders(); // Refresh the order list
        },
        prefill: {
          name: loggedInUser.name,
          email: "customer@example.com", // You'd get this from user data
          contact: "9999999999"      // You'd get this from user data
        },
        theme: {
          color: "#00ff88"
        }
      };

      const rzp1 = new Razorpay(options);

      rzp1.on('payment.failed', function (response) {
        alert(response.error.description);
      });

      rzp1.open(); // This opens the payment window

    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    }
  }
});

// --- Handle "Submit Remark" ---
// (This code is separate now)
document.getElementById('order-list-content').addEventListener('submit', async (e) => {
  if (e.target.id === 'remarkForm') {
    e.preventDefault();
    // ... (all your existing remark code) ...
  }
});

    document.getElementById('order-list-content').addEventListener('submit', async (e) => {
        if (e.target.id === 'remarkForm') {
            e.preventDefault();
            const orderId = e.target.dataset.orderId;
            const remarkText = e.target.querySelector('.customerRemarkText').value;
            const submitBtn = e.target.querySelector('button[type="submit"]');

            if (!remarkText) {
                alert('Please enter a remark.');
                return;
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                const response = await fetch(`${backendUrl}/api/order/remark/${orderId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerRemark: remarkText }),
                    credentials: 'include' // <-- ADDED
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                loadMyOrders(); 
            } catch (error) {
                alert('Failed to add remark: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Remark';
            }
        }
    });

    checkUserSession();
});