// public/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer  = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const forgotContainer = document.getElementById('forgot-form-container');

    const tabLogin    = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm   = document.getElementById('forgot-form');

    const loginError      = document.getElementById('login-error');
    const registerError   = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');
    const forgotError     = document.getElementById('forgot-error');
    const forgotSuccess   = document.getElementById('forgot-success');

    // Helper to show only one panel at a time
    function showPanel(panel) {
        loginContainer.classList.add('hidden');
        registerContainer.classList.add('hidden');
        forgotContainer.classList.add('hidden');
        panel.classList.remove('hidden');
    }

    // Tab Switching Logic
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        showPanel(loginContainer);
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        showPanel(registerContainer);
    });

    // Forgot Password link — show forgot panel, deactivate tabs
    document.getElementById('forgot-password-link').addEventListener('click', (e) => {
        e.preventDefault();
        tabLogin.classList.remove('active');
        tabRegister.classList.remove('active');
        showPanel(forgotContainer);
        forgotError.style.display = 'none';
        forgotSuccess.style.display = 'none';
    });

    // Back to Login link inside forgot panel
    document.getElementById('back-to-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        showPanel(loginContainer);
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';

        const email    = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const { ok, data } = await API.post('/auth/login', { email, password });

            if (ok && data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                loginError.textContent = data.message || 'Login failed.';
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.textContent = 'Server connection error.';
            loginError.style.display = 'block';
        }
    });

    // Handle Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.style.display = 'none';
        registerSuccess.style.display = 'none';

        const email    = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role     = document.getElementById('reg-role').value;

        try {
            const { ok, data } = await API.post('/auth/register', { email, password, role });

            if (ok && data.success) {
                registerSuccess.textContent = 'Registration successful! Please check your email to verify your account.';
                registerSuccess.style.display = 'block';
                registerForm.reset();
            } else {
                let msg = data.message || 'Registration failed.';
                if (data.errors && data.errors.length > 0) {
                    msg = data.errors.map(e => e.msg).join(' ');
                }
                registerError.textContent = msg;
                registerError.style.display = 'block';
            }
        } catch (err) {
            registerError.textContent = 'Server connection error.';
            registerError.style.display = 'block';
        }
    });

    // Handle Forgot Password
    // We tell the backend our own origin so the reset link email points back to CW2.
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        forgotError.style.display = 'none';
        forgotSuccess.style.display = 'none';

        const email = document.getElementById('forgot-email').value;
        const btn = forgotForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Sending...';

        try {
            const { ok, data } = await API.post('/auth/forgot-password', { email });

            // The API always returns success even if email not found (prevents enumeration)
            forgotSuccess.textContent = 'If that email is registered, a password reset link has been sent to your inbox.';
            forgotSuccess.style.display = 'block';
            forgotForm.reset();
        } catch (err) {
            forgotError.textContent = 'Server connection error. Please try again.';
            forgotError.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
        }
    });
});


