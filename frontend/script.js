const backendUrl = 'https://printmypage.onrender.com';
// const backendUrl = 'http://localhost:5001';
const orderForm = document.getElementById('orderForm');
const modal = document.getElementById('serverModal');
const serverListContainer = document.getElementById('server-list-container');
let currentFormData = null; // Used temporarily before background upload was added, might be removable now
let loggedInUser = null;
let currentOrderData = null; // To hold JSON data while choosing supplier

// --- DOM Elements for Order Form ---
const fileInput = document.getElementById('documentFile');
const uploadStatus = document.getElementById('uploadStatus');
const cloudinaryUrlInput = document.getElementById('cloudinaryUrlInput');
const originalFilenameInput = document.getElementById('originalFilenameInput');
const pageCountResultInput = document.getElementById('pageCountResultInput');
const manualPagesGroup = document.getElementById('manualPagesGroup');
const manualPagesInput = document.getElementById('orderFormPages');
const copiesInput = document.getElementById('orderFormCopies');
const duplexCheckbox = document.getElementById('orderFormDuplex');
const paperSizeSelect = document.getElementById('orderFormPaperSize');
const printTypeSelect = document.getElementById('printType');

// --- DOM Elements for Preview ---
const orderPreview = document.getElementById('orderPreview');
const previewFilename = document.getElementById('previewFilename');
const previewPages = document.getElementById('previewPages');
const previewCopies = document.getElementById('previewCopies');
const previewDuplex = document.getElementById('previewDuplex');
const previewPrice = document.getElementById('previewPrice');

// --- Frontend Price Chart (should match backend) ---
const priceChartFE = { bw: 2, color: 5, glossy: 15, a4: 1.5 };
let calculatedPages = null; // Stores auto-detected page count or null/auto

// --- Initialize Page ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); // Check login status first
    loadSuppliers(); // Load suppliers list

    // Add event listeners only if the elements exist on this page
    if (orderForm) {
        orderForm.addEventListener('submit', handleFormSubmit);
    }
    if (serverListContainer) {
        serverListContainer.addEventListener('click', handleSupplierClick);
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileChange);
    }
    if (manualPagesInput) {
        manualPagesInput.addEventListener('input', updatePreview);
    }
    if (printTypeSelect) {
        printTypeSelect.addEventListener('change', updatePreview);
    }
    if (copiesInput) {
        copiesInput.addEventListener('input', updatePreview);
    }
    if (duplexCheckbox) {
        duplexCheckbox.addEventListener('change', updatePreview);
    }

    setupInstructionButton(); // Assuming this is always present
    setupScrollAnimation(); // Assuming this is always present
});

// --- Authentication ---
async function checkUserSession() {
    const authLinks = document.getElementById('auth-links');
    if (!authLinks) return; // Exit if nav bar isn't on this page

    try {
        const response = await fetch(`${backendUrl}/api/auth/check-session`, { credentials: 'include' });
        const result = await response.json();

        if (response.ok && result.user) {
            loggedInUser = result.user;
            // Cleaned HTML for logged-in state
            authLinks.innerHTML = `
                <span style="margin-right: 1rem;">Hi, ${loggedInUser.name}</span>
                <button id="logoutBtn">Logout</button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', logoutUser);
            populateOrderForm(); // Attempt to pre-fill form if logged in
        } else {
            loggedInUser = null;
            // Cleaned HTML for logged-out state
            authLinks.innerHTML = '<a href="login.html">Login / Register</a>';
        }
    } catch (error) {
        console.error('Error checking session:', error);
        authLinks.innerHTML = '<a href="login.html">Login / Register</a>';
    }
}

async function logoutUser() {
    try {
        await fetch(`${backendUrl}/api/auth/logout`, { credentials: 'include' });
        loggedInUser = null;
        window.location.reload(); // Refresh the page after logout
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// --- Pre-fill Order Form ---
async function populateOrderForm() {
    if (!loggedInUser || !orderForm) return; // Exit if not logged in or form not present

    try {
        const response = await fetch(`${backendUrl}/api/profile`, { credentials: 'include' });
        const userProfile = await response.json();
        if (!response.ok) throw new Error('Failed to fetch profile for form');

        // Fill fields if they exist
        const nameInput = document.getElementById('orderFormName');
        const branchInput = document.getElementById('orderFormBranch');
        const sectionInput = document.getElementById('orderFormSection');
        const yearInput = document.getElementById('orderFormYear'); // Assuming this exists now? Add if needed.
        const rollInput = document.getElementById('orderFormRollNumber');
        const contactInput = document.getElementById('orderFormContactNo');

        if (nameInput) nameInput.value = userProfile.name || '';
        if (branchInput) branchInput.value = userProfile.branch || '';
        if (sectionInput) sectionInput.value = userProfile.section || '';
        // if (yearInput && userProfile.academicYear) yearInput.value = userProfile.academicYear; // Add if exists
        if (rollInput) rollInput.value = userProfile.rollNumber || '';
        if (contactInput) contactInput.value = userProfile.contactNo || '';

    } catch (error) {
        console.error("Error populating order form:", error);
    }
}

// --- Load Suppliers ---
async function loadSuppliers() {
    if (!serverListContainer) return; // Exit if supplier list isn't on this page

    const loadingText = document.getElementById('loading-suppliers');
    try {
        const response = await fetch(`${backendUrl}/api/suppliers`);
        if (!response.ok) throw new Error('Failed to fetch suppliers');

        const suppliers = await response.json();
        if (loadingText) loadingText.remove();

        if (suppliers.length === 0) {
            serverListContainer.insertAdjacentHTML('beforeend', '<p>No suppliers available right now.</p>');
            return;
        }

        suppliers.forEach(supplier => {
            const supplierElement = document.createElement('div');
            supplierElement.className = 'server-item';
            supplierElement.setAttribute('data-supplier-id', supplier._id);
            supplierElement.textContent = `${supplier.name} - ${supplier.location_code}`;
            serverListContainer.appendChild(supplierElement);
        });
        // --- ✨ ADD "ANYONE AVAILABLE" OPTION ✨ ---
        const anyoneElement = document.createElement('div');
        anyoneElement.className = 'server-item anyone-option'; // Add extra class for styling
        anyoneElement.setAttribute('data-supplier-id', 'anyone'); // Special ID
        anyoneElement.textContent = `Anyone Available (Fastest)`;
        serverListContainer.appendChild(anyoneElement);

    } catch (error) {
        console.error('Error loading suppliers:', error);
        if (loadingText) loadingText.textContent = 'Error loading suppliers.';
    }
}

// --- Background File Upload ---
async function handleFileChange() {
    if (!fileInput || !uploadStatus || !cloudinaryUrlInput || !originalFilenameInput || !pageCountResultInput || !manualPagesGroup || !manualPagesInput || !previewFilename) return;

    const file = fileInput.files[0];
    calculatedPages = null;
    cloudinaryUrlInput.value = '';
    originalFilenameInput.value = '';
    pageCountResultInput.value = '';
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';
    manualPagesGroup.style.display = 'none';
    manualPagesInput.required = false;

    if (!file) {
        previewFilename.textContent = '-';
        updatePreview();
        return;
    }

    previewFilename.textContent = file.name;
    uploadStatus.textContent = 'Uploading file...';
    uploadStatus.className = 'upload-status loading';
    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('documentFile', file);

    try {
        const response = await fetch(`${backendUrl}/api/upload-file`, {
            method: 'POST', body: formData, credentials: 'include'
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'File upload failed.');

        uploadStatus.textContent = `✅ ${result.message}`;
        uploadStatus.className = 'upload-status success';
        cloudinaryUrlInput.value = result.fileUrl;
        originalFilenameInput.value = result.originalFilename;

        if (result.requiresManualPages) {
            manualPagesGroup.style.display = 'block';
            manualPagesInput.required = true;
            manualPagesInput.value = '';
            previewPages.textContent = 'Manual Entry Required';
            pageCountResultInput.value = '';
            calculatedPages = null;
            const alertMsg = result.countErrorMessage ? `File uploaded, but page count failed: ${result.countErrorMessage}\nPlease enter page count manually.` : `File uploaded. Please enter page count manually.`;
            alert(alertMsg);
            manualPagesInput.focus();
        } else {
            manualPagesGroup.style.display = 'none';
            manualPagesInput.required = false;
            calculatedPages = result.detectedPageCount;
            pageCountResultInput.value = calculatedPages;
            previewPages.textContent = `${calculatedPages} (Auto)`;
        }
        updatePreview();

    } catch (error) {
        console.error('File upload error:', error);
        uploadStatus.textContent = `❌ Error: ${error.message}`;
        uploadStatus.className = 'upload-status error';
        cloudinaryUrlInput.value = '';
        originalFilenameInput.value = '';
        pageCountResultInput.value = '';
        calculatedPages = null;
        updatePreview();
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// --- Update Order Preview ---
function updatePreview() {
    if (!orderPreview || !previewPages || !copiesInput || !duplexCheckbox || !printTypeSelect || !previewCopies || !previewDuplex || !previewPrice || !fileInput) return;

    let pageCount = 0;
    const fileIsSelected = fileInput.files.length > 0;
    const requiresManual = (manualPagesGroup && manualPagesGroup.style.display === 'block');

    if (requiresManual) {
        pageCount = parseInt(manualPagesInput.value, 10) || 0;
        previewPages.textContent = `${pageCount} (Manual)`;
    } else if (calculatedPages === 'auto') {
         previewPages.textContent = 'Auto (PDF - Counted by Server)';
         pageCount = 0; // Can't estimate price yet
    } else {
        pageCount = calculatedPages || 0;
        previewPages.textContent = pageCount > 0 ? `${pageCount} (Auto)` : '-';
    }

    const copies = parseInt(copiesInput.value, 10) || 1;
    const isDuplex = duplexCheckbox.checked;
    const printType = printTypeSelect.value;
    const pricePerPage = priceChartFE[printType] || 0;

    let estimatedPrice = pricePerPage * pageCount * copies;
    // Add duplex pricing logic here if needed

    previewCopies.textContent = copies;
    previewDuplex.textContent = isDuplex ? 'Double-sided' : 'Single-sided';

    if (calculatedPages === 'auto' && pageCount === 0 && fileIsSelected) {
        previewPrice.textContent = 'Calculated after upload';
    } else if (!fileIsSelected){
         previewPrice.textContent = '₹0.00';
    }
     else {
        previewPrice.textContent = `₹${estimatedPrice.toFixed(2)}`;
    }

    orderPreview.style.display = fileIsSelected ? 'block' : 'none';
}

// --- Handle Final Form Submit ---
// --- Corrected handleFormSubmit ---
function handleFormSubmit(event) {
    event.preventDefault();
    if (!loggedInUser) {
        alert('You must be logged in to place an order.');
        window.location.href = 'login.html';
        return;
    }

    // --- Check if file has been successfully uploaded (check hidden input) ---
    if (!cloudinaryUrlInput.value) {
        alert('Please select a file and wait for the upload to complete successfully.');
        fileInput.focus(); // Focus the file input if upload hasn't happened
        return;
    }
    // --- Check if manual pages are needed but not entered ---
    const requiresManual = (manualPagesGroup && manualPagesGroup.style.display === 'block');
    const manualPagesValue = parseInt(manualPagesInput.value, 10);
    if (requiresManual && (isNaN(manualPagesValue) || manualPagesValue <= 0)) {
         alert('Please enter a valid number of pages for this file type.');
         manualPagesInput.focus();
         return;
    }

    // --- Collect data into a JSON object, INCLUDING hidden fields ---
    currentOrderData = { // Use the global variable directly
        printType: printTypeSelect.value,
        copies: copiesInput.value,
        duplex: duplexCheckbox.checked ? 'true' : 'false',
        paperSize: paperSizeSelect.value,
        // ✨ Read values from the hidden input fields ✨
        cloudinaryUrl: cloudinaryUrlInput.value,
        originalFilename: originalFilenameInput.value,
        detectedPageCountResult: requiresManual ? manualPagesInput.value : pageCountResultInput.value
    };
    // --------------------------------------------------------

    // Show supplier modal
    if (modal) modal.style.display = 'flex';
}

// --- Handle Supplier Selection & Final Submit ---
async function handleSupplierClick(event) {
    if (!orderForm || !modal || !cloudinaryUrlInput || !originalFilenameInput || !pageCountResultInput || !uploadStatus || !manualPagesGroup) return;
    if (event.target.classList.contains('server-item')) {
        if (!currentOrderData) return;

        const supplierId = event.target.getAttribute('data-supplier-id');
        currentOrderData.supplier_id = supplierId;
        modal.style.display = 'none';

        const submitBtn = orderForm.querySelector('button[type="submit"]');

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Placing Order...';
            }

            const response = await fetch(`${backendUrl}/api/place-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentOrderData),
                credentials: 'include'
            });
            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401) { throw new Error('Your session expired. Please login again.'); }
                throw new Error(result.message || 'Failed to place order.');
            }

            alert(`Order placed successfully! Your Order ID is: ${result.orderId}\nYou can track it in the "My Orders" page.`);
            orderForm.reset();
            cloudinaryUrlInput.value = '';
            originalFilenameInput.value = '';
            pageCountResultInput.value = '';
            uploadStatus.textContent = '';
            uploadStatus.className = 'upload-status';
            manualPagesGroup.style.display = 'none';
            calculatedPages = null;
            updatePreview(); // Reset preview

        } catch (error) {
            console.error('Error placing order:', error);
            alert(`An error occurred: ${error.message}`);
            if (error.message.includes('session expired')) { window.location.href = 'login.html'; }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Choose Supplier & Place Order';
            }
            currentOrderData = null;
        }
    }
}

// --- Helper Functions ---
function closeServerModal() {
    if (modal) modal.style.display = 'none';
    currentOrderData = null; // Clear data if modal closed without selection
}

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeServerModal();
        }
    });
}

function setupInstructionButton() {
    // Need to delegate from body since button might not exist on all pages
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.instructions-btn');
        const container = btn ? btn.closest('.instructions-container') : null;
        if (btn && container) {
            container.classList.toggle('active');
            e.stopPropagation(); // Prevent closing immediately
        } else {
            // Close any open instructions if clicking elsewhere
            document.querySelectorAll('.instructions-container.active').forEach(c => {
                 // Check if the click was outside the content area too
                 if (!e.target.closest('.instructions-content')) {
                    c.classList.remove('active');
                 }
            });
        }
    });
}

function setupScrollAnimation() {
    const welcomeSection = document.querySelector('.welcome-section');
    const mainContent = document.querySelector('.main-content');
    if (!welcomeSection || !mainContent) return; // Only run if elements exist

    window.addEventListener('scroll', () => {
        let scrollPos = window.scrollY;
        welcomeSection.style.opacity = 1 - scrollPos / 300;
        if (scrollPos > 100) {
            mainContent.classList.add('visible');
        } else {
            mainContent.classList.remove('visible');
        }
    });
}