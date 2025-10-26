document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Make sure to use the same port as your running backend
    const backendUrl = 'http://localhost:5001'; 

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop form from reloading page
        errorMessage.style.display = 'none'; // Hide old errors
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        // Get data from the form
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            // Send the data to the backend login route
            const response = await fetch(`${backendUrl}/api/supplier/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                // Show error message from the server
                throw new Error(result.message || 'Login failed.');
            }

            // --- LOGIN SUCCESSFUL ---
            
            // In a real app, the server sends a token.
            // For this app, we'll store the supplier info in localStorage
            // to "remember" who is logged in.
            localStorage.setItem('supplierInfo', JSON.stringify(result.supplier));
            
            // Redirect to the dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
});