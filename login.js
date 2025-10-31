// Login System JavaScript

// User database (in production, this would be server-side)
let users = JSON.parse(localStorage.getItem('recipro_users')) || {
    'admin': {
        username: 'admin',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'admin@recipro.com',
        role: 'admin',
        createdAt: new Date().toISOString()
    },
    'instructor': {
        username: 'instructor',
        password: 'chef123',
        firstName: 'Chef',
        lastName: 'Noma',
        email: 'chef@recipro.com',
        role: 'instructor',
        createdAt: new Date().toISOString()
    },
    'student': {
        username: 'student',
        password: 'student123',
        firstName: 'John',
        lastName: 'Student',
        email: 'student@recipro.com',
        role: 'student',
        createdAt: new Date().toISOString()
    }
};

// Save users to localStorage
function saveUsers() {
    localStorage.setItem('recipro_users', JSON.stringify(users));
}

// Initialize default users if not exists
if (!localStorage.getItem('recipro_users')) {
    saveUsers();
}

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const signupModal = document.getElementById('signupModal');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const messageContainer = document.getElementById('messageContainer');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkExistingLogin();
    
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Signup form submission
    signupForm.addEventListener('submit', handleSignup);
    
    // Forgot password form submission
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    
    // Password strength checker
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
    
    // Confirm password validation
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});

// Check if user is already logged in
function checkExistingLogin() {
    const currentUser = localStorage.getItem('recipro_current_user');
    const rememberMe = localStorage.getItem('recipro_remember_me');
    
    if (currentUser && rememberMe === 'true') {
        const userData = JSON.parse(currentUser);
        showMessage(`Welcome back, ${userData.firstName}!`, 'success');
        setTimeout(() => {
            redirectToApp(userData);
        }, 1500);
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Show loading state
    showLoginLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validate credentials
    const user = validateCredentials(username, password);
    
    if (user) {
        // Store user session
        const userData = {
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('recipro_current_user', JSON.stringify(userData));
        localStorage.setItem('recipro_remember_me', rememberMe.toString());
        
        // Store user name for recipe system
        localStorage.setItem('recipro_user_name', `${user.firstName} ${user.lastName}`);
        
        showMessage(`Welcome, ${user.firstName}!`, 'success');
        
        // Redirect after short delay
        setTimeout(() => {
            redirectToApp(userData);
        }, 1500);
        
    } else {
        showMessage('Invalid username or password. Please try again.', 'error');
        showLoginLoading(false);
    }
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    
    const formData = new FormData(signupForm);
    const userData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        email: formData.get('email').trim(),
        username: formData.get('newUsername').trim(),
        password: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword'),
        role: formData.get('role'),
        agreeTerms: formData.get('agreeTerms')
    };
    
    // Validate signup data
    const validation = validateSignupData(userData);
    if (!validation.isValid) {
        showMessage(validation.message, 'error');
        return;
    }
    
    // Check if username already exists
    if (users[userData.username.toLowerCase()]) {
        showMessage('Username already exists. Please choose a different one.', 'error');
        return;
    }
    
    // Check if email already exists
    const emailExists = Object.values(users).some(user => user.email.toLowerCase() === userData.email.toLowerCase());
    if (emailExists) {
        showMessage('Email already registered. Please use a different email.', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        username: userData.username.toLowerCase(),
        password: userData.password, // In production, this should be hashed
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        role: userData.role,
        createdAt: new Date().toISOString()
    };
    
    users[userData.username.toLowerCase()] = newUser;
    saveUsers();
    
    showMessage('Account created successfully! You can now sign in.', 'success');
    closeSignupModal();
    signupForm.reset();
    
    // Pre-fill login form
    document.getElementById('username').value = userData.username;
}

// Handle forgot password form submission
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const identifier = document.getElementById('resetIdentifier').value.trim();
    
    // Find user by username or email
    const user = Object.values(users).find(u => 
        u.username.toLowerCase() === identifier.toLowerCase() || 
        u.email.toLowerCase() === identifier.toLowerCase()
    );
    
    if (user) {
        // In production, this would send an actual email
        showMessage(`Password reset instructions sent to ${user.email}`, 'success');
        
        // For demo purposes, show the password
        setTimeout(() => {
            showMessage(`Demo: Your password is "${user.password}"`, 'info');
        }, 2000);
        
    } else {
        showMessage('No account found with that username or email.', 'error');
    }
    
    closeForgotPasswordModal();
    forgotPasswordForm.reset();
}

// Validate login credentials
function validateCredentials(username, password) {
    const user = users[username.toLowerCase()];
    if (user && user.password === password) {
        return user;
    }
    return null;
}

// Validate signup data
function validateSignupData(data) {
    if (!data.firstName || !data.lastName) {
        return { isValid: false, message: 'First name and last name are required.' };
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        return { isValid: false, message: 'Please enter a valid email address.' };
    }
    
    if (!data.username || data.username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters long.' };
    }
    
    if (!data.password || data.password.length < 6) {
        return { isValid: false, message: 'Password must be at least 6 characters long.' };
    }
    
    if (data.password !== data.confirmPassword) {
        return { isValid: false, message: 'Passwords do not match.' };
    }
    
    if (!data.role) {
        return { isValid: false, message: 'Please select your role.' };
    }
    
    if (!data.agreeTerms) {
        return { isValid: false, message: 'You must agree to the Terms of Service.' };
    }
    
    return { isValid: true };
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Check password strength
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    let strength = 0;
    let strengthLabel = 'Very Weak';
    let color = '#dc3545';
    
    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    
    if (strength >= 80) {
        strengthLabel = 'Very Strong';
        color = '#28a745';
    } else if (strength >= 60) {
        strengthLabel = 'Strong';
        color = '#ffc107';
    } else if (strength >= 40) {
        strengthLabel = 'Medium';
        color = '#fd7e14';
    } else if (strength >= 20) {
        strengthLabel = 'Weak';
        color = '#dc3545';
    }
    
    strengthBar.style.width = `${strength}%`;
    strengthBar.style.background = color;
    strengthText.textContent = `Password strength: ${strengthLabel}`;
    strengthText.style.color = color;
}

// Validate password match
function validatePasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#dc3545';
        confirmInput.style.background = '#fff5f5';
    } else {
        confirmInput.style.borderColor = '#e9ecef';
        confirmInput.style.background = '#f8f9fa';
    }
}

// Show/hide password
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// Show login loading state
function showLoginLoading(show) {
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const loginBtn = document.querySelector('.login-btn');
    
    if (show) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        loginBtn.disabled = true;
    } else {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
        loginBtn.disabled = false;
    }
}

// Login as guest
function loginAsGuest() {
    const guestData = {
        username: 'guest',
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@recipro.com',
        role: 'guest',
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('recipro_current_user', JSON.stringify(guestData));
    localStorage.setItem('recipro_user_name', 'Guest User');
    localStorage.setItem('recipro_remember_me', 'false');
    
    showMessage('Welcome, Guest User!', 'success');
    
    setTimeout(() => {
        redirectToApp(guestData);
    }, 1000);
}

// Redirect to main application
function redirectToApp(userData) {
    // Store user role for app permissions
    localStorage.setItem('recipro_user_role', userData.role);
    
    // Redirect to main app
    window.location.href = 'index.html';
}

// Modal functions
function showSignup() {
    signupModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
    signupModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    signupForm.reset();
    
    // Reset password strength indicator
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    if (strengthBar && strengthText) {
        strengthBar.style.width = '0%';
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#7f8c8d';
    }
}

function showForgotPassword() {
    forgotPasswordModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeForgotPasswordModal() {
    forgotPasswordModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    forgotPasswordForm.reset();
}

// Message system
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'messageSlideOut 0.3s ease-out forwards';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }
    }, 5000);
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes messageSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Demo functions for terms and privacy (placeholder)
function showTerms() {
    showMessage('Terms of Service would be displayed here in a real application.', 'info');
}

function showPrivacy() {
    showMessage('Privacy Policy would be displayed here in a real application.', 'info');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Close modals with Escape key
    if (event.key === 'Escape') {
        if (signupModal.style.display === 'block') {
            closeSignupModal();
        }
        if (forgotPasswordModal.style.display === 'block') {
            closeForgotPasswordModal();
        }
    }
});

// Demo credentials helper
console.log('Demo Credentials:');
console.log('Admin: admin / admin123');
console.log('Instructor: instructor / chef123');
console.log('Student: student / student123');
console.log('Or click "Continue as Guest"');