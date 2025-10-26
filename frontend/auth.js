// const backendUrl = 'http://localhost:5001';
const backendUrl = 'https://printmypage.onrender.com/';
const errorMessage = document.getElementById('errorMessage');

// --- Register Logic ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const registerBtn = document.getElementById('registerBtn');
        errorMessage.style.display = 'none';
        registerBtn.disabled = true;
        registerBtn.textContent = 'Registering...';

        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                // credentials: 'include' // Not needed for register
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert('Registration successful! Please login.');
            window.location.href = 'login.html';

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register';
        }
    });
}

// --- Login Logic ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('loginBtn');
        errorMessage.style.display = 'none';
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${backendUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include' // <-- ADDED
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            window.location.href = 'index.html';

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
}