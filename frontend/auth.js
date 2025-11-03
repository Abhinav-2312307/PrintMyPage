// frontend/auth.js

// This script assumes firebase-config.js is loaded first
const backendUrl = 'https://printmypage.onrender.com'; // Your live backend

// --- Shared Elements ---
const errorMessage = document.getElementById('errorMessage');

// --- Register Logic ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const registerBtn = document.getElementById('registerBtn');
    if (errorMessage) errorMessage.style.display = 'none';
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Registering...';
    }

    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());

    try {
      // 1. Create user in Firebase Auth with Email/Password
      const userCredential = await auth.createUserWithEmailAndPassword(data.email, data.password);
      const user = userCredential.user;
      console.log('Firebase user created:', user.uid);

      // 2. Get the user's ID Token (proof of identity)
      const idToken = await user.getIdToken();

      // 3. Send profile data to our backend to create profile in MongoDB
      const profileData = {
        name: data.name,
        rollNumber: data.rollNumber,
        branch: data.branch,
        section: data.section,
        contactNo: data.contactNo
      };

      const response = await fetch(`${backendUrl}/api/auth/create-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Send the token
        },
        body: JSON.stringify(profileData)
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      // 4. Send Firebase verification email
      await auth.sendEmailVerification(user);

      alert('Registration successful! Please check your email (and spam folder) to verify your account before logging in.');
      window.location.href = 'login.html';

    } catch (error) {
      if (errorMessage) {
          errorMessage.textContent = error.message;
          errorMessage.style.display = 'block';
      }
      if (registerBtn) {
          registerBtn.disabled = false;
          registerBtn.textContent = 'Register';
      }
    }
  });
}

// --- Login Logic ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginBtn = document.getElementById('loginBtn');
    if (errorMessage) errorMessage.style.display = 'none';
    if(loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      // 1. Sign in with Firebase
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      // 2. Check if email is verified
      if (!userCredential.user.emailVerified) {
        await auth.signOut(); // Log them out
        throw new Error('Please verify your email first. Check your inbox (or register again to get a new link).');
      }
      
      // 3. Success! Redirect to main page.
      window.location.href = 'index.html';

    } catch (error) {
      if (errorMessage) {
          errorMessage.textContent = error.message;
          errorMessage.style.display = 'block';
      }
      if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Login';
      }
    }
  });
}

// --- Google Login Logic ---
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider(); // Use v8 syntax
        try {
            // This will open the Google popup
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            // Check if this is a new Google user
            // We'll check our backend if a profile exists
            const idToken = await user.getIdToken();
            const profileResponse = await fetch(`${backendUrl}/api/profile`, {
                 headers: { 'Authorization': `Bearer ${idToken}` }
            });
            
            if (profileResponse.status === 404) {
                 // Profile not found, this is a new user
                 alert('Welcome! Please go to the Register page to fill in your profile details.');
                 // Redirect them to register, but they are already "logged in"
                 // A better flow: redirect to profile page to force update
                 window.location.href = 'profile.html';
            } else if (profileResponse.ok) {
                // Profile exists, log them in
                 window.location.href = 'index.html';
            } else {
                 // Another error
                 const errorData = await profileResponse.json();
                 throw new Error(errorData.message || 'Could not verify profile.');
            }

        } catch (error) {
            if (errorMessage) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        }
    });
}