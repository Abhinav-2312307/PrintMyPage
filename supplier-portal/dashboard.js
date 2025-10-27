document.addEventListener('DOMContentLoaded', () => {
    // Make sure to use the same port as your running backend
    // const backendUrl = 'http://localhost:5001'; 
    const backendUrl = 'https://printmypage.onrender.com';
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const orderList = document.getElementById('orderList');
    
    // 1. Check if user is logged in
    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo'));

    if (!supplierInfo) {
        window.location.href = 'login.html';
        return; 
    }

    // 2. User is logged in, set up the page
    welcomeMessage.textContent = `Welcome, ${supplierInfo.name}`;
    
    // 3. Setup Logout Button
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('supplierInfo');
        window.location.href = 'login.html';
    });

    // 4. Fetch and display orders
    async function loadOrders() {
        try {
            const response = await fetch(`${backendUrl}/api/supplier/orders/${supplierInfo._id}`);
            if (!response.ok) throw new Error('Failed to fetch orders.');

            const orders = await response.json();

            if (orders.length === 0) {
                orderList.innerHTML = '<h2>You have no new orders.</h2>';
                return;
            }

            orderList.innerHTML = '<h2>Your New Orders</h2>';

            // Loop through orders and create HTML
            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = `order-card-item ${order.isBroadcast ? 'broadcast-order' : ''}`;
                orderCard.setAttribute('data-order-id', order._id);

                const orderDate = new Date(order.orderDate).toLocaleDateString();

                // --- Define Actions based on type ---
                let orderActionsHtml = '';
                if (order.isBroadcast) {
                    // --- Actions for BROADCAST orders ---
                    orderActionsHtml = `
                        <p style="color: #ffb74d; text-align: center; margin-bottom: 1rem;">This is a broadcast order available for acceptance.</p>
                        <button class="portal-btn accept-broadcast-btn" data-order-db-id="${order._id}">Accept This Order</button>
                        <a href="${order.fileDetails.storedPath}" class="download-btn secondary-download" target="_blank" rel="noopener noreferrer">View File (Before Accepting)</a>
                     `;
                } else {
                    // --- Actions for ASSIGNED orders (FIXED DROPDOWN) ---
                     orderActionsHtml = `
                        <a href="${order.fileDetails.storedPath}" class="download-btn" target="_blank" rel="noopener noreferrer">Download File</a>
                        

                        <div>
                            <label><strong>Set Status:</strong></label> 
                            <select class="status-select" data-order-id="${order._id}">

                                <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="accepted" ${order.orderStatus === 'awaiting-payment' ? 'selected' : ''}>Accepted (Awaiting Payment)</option>
                                <option value="printing" ${order.orderStatus === 'printing' ? 'selected' : ''}>Printing (Paid)</option>
                                <option value="completed" ${order.orderStatus === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="rejected" ${order.orderStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                        </div>
                    `;
                }
                // --- End Action Definition ---

                // --- Build Card HTML ---
                orderCard.innerHTML = `
                    <h3>Order ID: ${order.orderId} ${order.isBroadcast ? '<span class="broadcast-tag">(Broadcast)</span>' : ''}</h3>
                    <div class="order-details supplier-view">
                        <div class="customer-info-block">
                            <img src="${order.customerDetails.profilePictureUrl || '../frontend/placeholder.png'}" alt="Cust DP" class="customer-dp-small">
                            <div>
                                <p><strong>Customer:</strong> ${order.customerDetails.name}</p>
                                <p><strong>Contact:</strong> ${order.customerDetails.contactNo}</p>
                                <p><strong>Email:</strong> ${order.customerDetails.email}</p>
                                <p><strong>Roll No:</strong> ${order.customerDetails.rollNumber}</p>
                                <p><strong>Branch:</strong> ${order.customerDetails.branch}</p>
                                <p><strong>Section:</strong> ${order.customerDetails.section}</p>
                                <p><strong>Date:</strong> ${orderDate}</p>
                            </div>
                        </div>
                        <div>
                            <p><strong>Print Type:</strong> ${order.printDetails.printType}</p>
                            <p><strong>Pages:</strong> ${order.printDetails.pageCount}</p>
                            <p><strong>Copies:</strong> ${order.printDetails.copies}</p>
                            <p><strong>Printing:</strong> ${order.printDetails.duplex ? 'Double-sided' : 'Single-sided'}</p>
                            <p><strong>Paper Size:</strong> ${order.printDetails.paperSize}</p>
                            <p><strong>Price:</strong> ₹${order.printDetails.totalPrice}</p>
                            <p><strong>Payment:</strong> <span class="payment-${order.paymentStatus}">${order.paymentStatus}</span></p>
                        </div>
                    </div>
                    <div class="order-actions">
                        ${orderActionsHtml}
                    </div>
                    ${!order.isBroadcast ? `
                        <div class="supplier-remark-section">
                            <label><strong>Supplier Remark (optional):</strong></label>
                            <textarea class="supplier-remark-input" placeholder="e.g., Ready for pickup at 4 PM">${order.supplierRemark || ''}</textarea>
                        </div>
                    ` : ''}
                `;
                orderList.appendChild(orderCard);
            }); // End of orders.forEach

        } catch (error) {
            console.error('Error loading orders:', error); // Added more specific error log
            orderList.innerHTML = '<h2>Error loading orders.</h2>';
        }
    } // End of loadOrders function
    
    // 5. Add event listener for status changes
    // --- UPDATED event listener for status changes ---
    orderList.addEventListener('change', async (e) => {
        // Log 1: Event triggered
        console.log('[DEBUG] Change event triggered on order list.');

        // Check if the changed element is the status dropdown
        if (e.target.classList.contains('status-select')) {
            const statusSelectElement = e.target; // Keep reference to the select element
            const newStatus = statusSelectElement.value;

            // Log 2: Status changed
            console.log('[DEBUG] Status select changed to:', newStatus);

            // Get the MongoDB _id from the data attribute
            const orderDbId = statusSelectElement.dataset.orderId; // Use orderId as defined in dataset

            // Find the parent order-card to get the remark text
            // Ensure the class name matches your HTML structure
            const orderCard = statusSelectElement.closest('.order-card-item');
            const supplierRemarkInput = orderCard ? orderCard.querySelector('.supplier-remark-input') : null;
            const supplierRemark = supplierRemarkInput ? supplierRemarkInput.value : '';

            // Log 3: Prepare update
            console.log(`[DEBUG] Preparing to update Order DB ID: ${orderDbId} to status: ${newStatus} with remark: "${supplierRemark}"`);

            // Disable dropdown during update
            statusSelectElement.disabled = true;

            try {
                // Log 4: Sending request
                console.log(`[DEBUG] Sending PUT request to: ${backendUrl}/api/supplier/orders/${orderDbId}`);

                const response = await fetch(`${backendUrl}/api/supplier/orders/${orderDbId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        newStatus: newStatus,
                        supplierRemark: supplierRemark
                    }),
                    credentials: 'include' // Important for future cookie-based auth
                });

                // Log 5: Response received
                console.log('[DEBUG] Received response Status:', response.status);
                const result = await response.json(); // Always try to parse JSON
                console.log('[DEBUG] Received response Body:', result);

                if (!response.ok) {
                    // Throw error using message from backend if available
                    throw new Error(result.message || `HTTP error! status: ${response.status}`);
                }

                // Success! Refresh orders to show the change.
                // loadOrders() will implicitly re-enable the dropdown when it redraws the list.
                console.log('[DEBUG] Update successful, reloading orders...');
                loadOrders();

            } catch (error) {
                console.error('[DEBUG] Error updating status:', error);
                alert('Error updating status: ' + error.message);
                // Re-enable dropdown only on error
                statusSelectElement.disabled = false;
                // Optionally reload orders here too, to reset the dropdown visually if needed,
                // but usually better to let the user retry without full reload.
                // loadOrders();
            }
        } else {
            // Optional Log 6: Change event wasn't on the target element
            // console.log('[DEBUG] Change event target was not a status-select element.');
        }
    }); // End of change event listener
    // --- ✨ NEW: Add event listener for ACCEPT BROADCAST button clicks ---
    orderList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('accept-broadcast-btn')) {
            const orderDbId = e.target.dataset.orderDbId; // Get MongoDB _id
            const acceptButton = e.target;

            acceptButton.disabled = true;
            acceptButton.textContent = 'Accepting...';

            try {
                // We need the supplier's ID (who is logged in)
                const loggedInSupplierId = supplierInfo._id; 

                const response = await fetch(`${backendUrl}/api/supplier/accept-broadcast/${orderDbId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ supplierId: loggedInSupplierId })
                    // Add credentials: 'include' if you implement proper supplier login later
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to accept order.');
                }

                // Success! Refresh the list
                alert('Order accepted successfully!');
                loadOrders();

            } catch (error) {
                console.error('Error accepting broadcast order:', error);
                alert(`Error: ${error.message}`);
                // Re-enable button on error, maybe after a delay
                acceptButton.disabled = false; 
                acceptButton.textContent = 'Accept This Order';
            }
        }
    });
    // --- END OF NEW LISTENER ---
    // Initial load
    loadOrders();
});