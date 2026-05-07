// public/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');

    // Tab Switching Logic
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginContainer.classList.remove('hidden');
        registerContainer.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerContainer.classList.remove('hidden');
        loginContainer.classList.add('hidden');
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        
        const email = document.getElementById('login-email').value;
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
        
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;

        try {
            const { ok, data } = await API.post('/auth/register', { email, password, role });

            if (ok && data.success) {
                registerSuccess.textContent = 'Registration successful! Please check your email to verify.';
                registerSuccess.style.display = 'block';
                registerForm.reset();
            } else {
                registerError.textContent = data.message || 'Registration failed.';
                registerError.style.display = 'block';
            }
        } catch (err) {
            registerError.textContent = 'Server connection error.';
            registerError.style.display = 'block';
        }
    });
});
