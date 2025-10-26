document.addEventListener('DOMContentLoaded', () => {

    // const backendUrl = 'http://localhost:5001';
    const backendUrl = 'https://printmypage.onrender.com';
    let loggedInUser = null;

    // --- DOM Elements ---
    const authLinks = document.getElementById('auth-links');
    const profileImage = document.getElementById('profileImage');
    const profilePicInput = document.getElementById('profilePicInput');
    const changePicBtn = document.getElementById('changePicBtn');
    const picMessage = document.getElementById('picMessage');
    const profileForm = document.getElementById('profileForm');
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    const profileMessage = document.getElementById('profileMessage');

    // --- Initial Setup ---
    checkUserSession();

    // --- Event Listeners ---
    changePicBtn.addEventListener('click', () => {
        profilePicInput.click(); // Trigger hidden file input
    });

    profilePicInput.addEventListener('change', handlePictureUpload);
    profileForm.addEventListener('submit', handleProfileUpdate);

    // --- Functions ---
    async function checkUserSession() {
        try {
            const response = await fetch(`${backendUrl}/api/auth/check-session`, { credentials: 'include' });
            const result = await response.json();
            if (response.ok && result.user) {
                loggedInUser = result.user;
                setupNav();
                loadProfileData(); // Load data after confirming login
            } else {
                window.location.href = 'login.html'; // Redirect if not logged in
            }
        } catch (error) {
            console.error('Error checking session:', error);
            window.location.href = 'login.html';
        }
    }

    function setupNav() {
        if (!loggedInUser) return;
        authLinks.innerHTML = `
            <span style="margin-right: 1rem;">Hi, ${loggedInUser.name}</span>
            <button id="logoutBtn">Logout</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    }

    async function logoutUser() {
        await fetch(`${backendUrl}/api/auth/logout`, { credentials: 'include' });
        loggedInUser = null;
        window.location.href = 'index.html';
    }

    async function loadProfileData() {
        if (!loggedInUser) return;
        try {
            const response = await fetch(`${backendUrl}/api/profile`, { credentials: 'include' });
            const user = await response.json();
            if (!response.ok) throw new Error(user.message || 'Failed to load profile');

            // Populate form fields
            document.getElementById('rollNumber').value = user.rollNumber;
            document.getElementById('name').value = user.name;
            document.getElementById('branch').value = user.branch || '';
            document.getElementById('section').value = user.section || '';
            document.getElementById('contactNo').value = user.contactNo || '';
            document.getElementById('email').value = user.email;
            profileImage.src = user.profilePictureUrl || 'placeholder.png'; // Use placeholder if no pic

        } catch (error) {
            console.error('Error loading profile:', error);
            profileMessage.textContent = 'Error loading profile data.';
            profileMessage.className = 'message error';
        }
    }

    async function handlePictureUpload() {
        const file = profilePicInput.files[0];
        if (!file) return;

        picMessage.textContent = 'Uploading...';
        picMessage.className = 'message';
        changePicBtn.disabled = true;

        const formData = new FormData();
        formData.append('profilePic', file); // 'profilePic' must match backend upload.single()

        try {
            const response = await fetch(`${backendUrl}/api/profile/picture`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Upload failed');

            profileImage.src = result.profilePictureUrl; // Update image preview
            picMessage.textContent = 'Picture updated!';
            picMessage.className = 'message success';

        } catch (error) {
            console.error('Error uploading picture:', error);
            picMessage.textContent = `Upload error: ${error.message}`;
            picMessage.className = 'message error';
        } finally {
            changePicBtn.disabled = false;
             // Clear the file input for next time
            profilePicInput.value = null;
            setTimeout(() => { picMessage.textContent = ''; }, 3000); // Clear message after 3s
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        profileMessage.textContent = '';
        updateProfileBtn.disabled = true;
        updateProfileBtn.textContent = 'Updating...';

        // Collect data from form
        const data = {
            name: document.getElementById('name').value,
            branch: document.getElementById('branch').value,
            section: document.getElementById('section').value,
            contactNo: document.getElementById('contactNo').value,
            email: document.getElementById('email').value,
        };

        try {
            const response = await fetch(`${backendUrl}/api/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Update failed');

            profileMessage.textContent = result.message;
            profileMessage.className = 'message success';
            // Optionally update the name in the nav bar if it changed
            if(loggedInUser.name !== result.user.name) {
                loggedInUser.name = result.user.name;
                setupNav(); // Redraw nav with new name
            }


        } catch (error) {
            console.error('Error updating profile:', error);
            profileMessage.textContent = `Update error: ${error.message}`;
            profileMessage.className = 'message error';
        } finally {
            updateProfileBtn.disabled = false;
            updateProfileBtn.textContent = 'Update Profile';
             setTimeout(() => { profileMessage.textContent = ''; }, 3000); // Clear message
        }
    }
});