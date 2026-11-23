
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const API_BASE_URL = window.CEMS_API_BASE_URL;

    const DASHBOARD_URLS = {
        Student: "student-dashboard.html",
        Organizer: "organizer-dashboard.html",
        Admin: "admin-dashboard.html"
    };


    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");

    const formMessage = document.getElementById("form-message");

    const authTitle = document.getElementById("auth-title");
    const authSubtitle = document.getElementById("auth-subtitle");

    const forgotPassword = document.getElementById("forgot-password");

    const accountType = document.getElementById("register-account-type");

    const studentFields = document.getElementById("student-fields");
    const organizerFields = document.getElementById("organizer-fields");

    const studentPRN = document.getElementById("register-student-id");
    const department = document.getElementById("register-department");

    const organizationName = document.getElementById("register-organization-name");
    const designation = document.getElementById("register-designation");


    // ==========================================
    // CURRENT YEAR
    // ==========================================

    const currentYear = document.getElementById("current-year");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    // ==========================================
    // MESSAGE FUNCTIONS
    // ==========================================

    function showMessage(message, type = "error") {

        if (!formMessage) return;

        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.hidden = false;
        formMessage.style.display = "block";

    }


    function clearMessage() {

        if (!formMessage) return;

        formMessage.textContent = "";
        formMessage.style.display = "none";
        formMessage.hidden = true;

    }


    // ==========================================
    // API RESPONSE HANDLER
    // ==========================================

    async function readResponse(response) {

        let data;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error("Invalid response from server.");
        }

        if (!response.ok || data.success === false) {

            throw new Error(
                data.message || "Something went wrong. Please try again."
            );

        }

        return data;

    }


    // ==========================================
    // TAB SWITCHING
    // ==========================================

    function showLoginForm() {

        clearMessage();

        loginForm.classList.add("active");
        loginForm.hidden = false;

        registerForm.classList.remove("active");
        registerForm.hidden = true;

        loginTab.classList.add("active");
        loginTab.setAttribute("aria-selected", "true");

        registerTab.classList.remove("active");
        registerTab.setAttribute("aria-selected", "false");

        authTitle.innerHTML = 'Welcome <span>Back!</span>';

        authSubtitle.textContent =
            "Login to continue exploring campus events.";

    }


    function showRegisterForm() {

        clearMessage();

        registerForm.classList.add("active");
        registerForm.hidden = false;

        loginForm.classList.remove("active");
        loginForm.hidden = true;

        registerTab.classList.add("active");
        registerTab.setAttribute("aria-selected", "true");

        loginTab.classList.remove("active");
        loginTab.setAttribute("aria-selected", "false");

        authTitle.innerHTML = 'Create Your <span>Account</span>';

        authSubtitle.textContent =
            "Register to participate in college events.";

        updateAccountTypeFields();

    }


    if (loginTab) {
        loginTab.addEventListener("click", showLoginForm);
    }

    if (registerTab) {
        registerTab.addEventListener("click", showRegisterForm);
    }


    // ==========================================
    // INLINE LOGIN / REGISTER SWITCH
    // ==========================================

    document.querySelectorAll("[data-switch]").forEach(button => {

        button.addEventListener("click", () => {

            if (button.dataset.switch === "login") {
                showLoginForm();
            }

            if (button.dataset.switch === "register") {
                showRegisterForm();
            }

        });

    });


    // ==========================================
    // ACCOUNT TYPE SWITCHING
    // ==========================================

    function updateAccountTypeFields() {

        if (!accountType) return;

        const selectedType = accountType.value;

        const isStudent = selectedType === "Student";

        studentFields.hidden = !isStudent;
        organizerFields.hidden = isStudent;

        // Student fields
        studentPRN.required = isStudent;
        department.required = isStudent;

        // Organizer fields
        organizationName.required = !isStudent;
        designation.required = !isStudent;

        clearMessage();

    }


    if (accountType) {

        accountType.addEventListener("change", () => {

            updateAccountTypeFields();

            // Clear fields and errors from the previously selected account type.
            if (studentPRN) studentPRN.value = "";
            if (department) department.value = "";

            if (organizationName) organizationName.value = "";
            if (designation) designation.value = "";

            clearFieldErrors();

        });

    }


    // ==========================================
    // FIELD ERROR FUNCTIONS
    // ==========================================

    function clearFieldErrors() {

        document.querySelectorAll(".field-error").forEach(error => {
            error.textContent = "";
        });

    }


    // ==========================================
    // PASSWORD VISIBILITY
    // ==========================================

    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const targetId = button.dataset.target;
            const passwordInput = document.getElementById(targetId);

            if (!passwordInput) return;

            const isPassword = passwordInput.type === "password";

            passwordInput.type = isPassword ? "text" : "password";

            button.textContent = isPassword ? "Hide" : "Show";

            button.setAttribute(
                "aria-label",
                isPassword ? "Hide password" : "Show password"
            );

            button.setAttribute(
                "aria-pressed",
                String(isPassword)
            );

        });

    });


    // ==========================================
    // LOGIN FUNCTIONALITY
    // ==========================================

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            clearMessage();

            const email =
                document.getElementById("login-email").value.trim();

            const password =
                document.getElementById("login-password").value;

            const rememberMe =
                document.getElementById("remember-me").checked;

            if (!email || !password) {

                showMessage("Please enter your email and password.");
                return;

            }

            if (!API_BASE_URL) {

                showMessage("API configuration is missing.");
                return;

            }

            const submitButton =
                loginForm.querySelector('button[type="submit"]');

            const originalButtonText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = "Logging in...";

            try {

                const response = await fetch(
                    `${API_BASE_URL}/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );

                const data = await readResponse(response);

                if (!data.token || !data.user) {

                    throw new Error(
                        "Login response is missing user or token information."
                    );

                }

                const role = data.user.role;

                const dashboardURL = DASHBOARD_URLS[role];

                if (!dashboardURL) {

                    throw new Error(
                        "Your account has an unsupported role."
                    );

                }

                // Clear previous login information.
                localStorage.removeItem("cemsToken");
                localStorage.removeItem("cemsUser");

                sessionStorage.removeItem("cemsToken");
                sessionStorage.removeItem("cemsUser");

                // Save login information.
                const storage = rememberMe
                    ? localStorage
                    : sessionStorage;

                storage.setItem("cemsToken", data.token);

                storage.setItem(
                    "cemsUser",
                    JSON.stringify(data.user)
                );

                showMessage(
                    "Login successful! Redirecting...",
                    "success"
                );

                window.location.replace(dashboardURL);

            } catch (error) {

                showMessage(error.message, "error");

                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;

            }

        });

    }


    // ==========================================
    // REGISTRATION FUNCTIONALITY
    // ==========================================

    if (registerForm) {

        registerForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            clearMessage();
            clearFieldErrors();

            const selectedType = accountType.value;

            const fullName =
                document.getElementById("register-name").value.trim();

            const email =
                document.getElementById("register-email").value.trim();

            const password =
                document.getElementById("register-password").value;

            const confirmPassword =
                document.getElementById("register-confirm-password").value;

            const acceptTerms =
                document.getElementById("accept-terms").checked;


            // Student information.
            const prn = studentPRN.value.trim();

            const studentDepartment = department.value;


            // Organizer information.
            const organization = organizationName.value.trim();

            const organizerDesignation = designation.value.trim();


            // ======================================
            // COMMON VALIDATION
            // ======================================

            if (!fullName || !email || !password || !confirmPassword) {

                showMessage("Please fill in all required fields.");
                return;

            }

            if (password.length < 8) {

                showMessage(
                    "Password must contain at least 8 characters."
                );

                return;

            }

            if (password !== confirmPassword) {

                showMessage("Passwords do not match.");
                return;

            }

            if (!acceptTerms) {

                showMessage(
                    "Please accept the terms and conditions."
                );

                return;

            }


            // ======================================
            // STUDENT VALIDATION
            // ======================================

            if (selectedType === "Student") {

                if (!prn || !studentDepartment) {

                    showMessage(
                        "Please enter your PRN and select your department."
                    );

                    return;

                }

            }


            // ======================================
            // ORGANIZER VALIDATION
            // ======================================

            if (selectedType === "Organizer") {

                if (!organization || !organizerDesignation) {

                    showMessage(
                        "Please enter your organization name and designation."
                    );

                    return;

                }

            }


            if (!API_BASE_URL) {

                showMessage("API configuration is missing.");
                return;

            }


            // ======================================
            // PREPARE REGISTRATION REQUEST
            // ======================================

            let endpoint;
            let requestBody;

            if (selectedType === "Student") {

                endpoint = `${API_BASE_URL}/auth/register`;

                requestBody = {
                    full_name: fullName,
                    email: email,
                    password: password,
                    prn: prn,
                    department: studentDepartment
                };

            } else if (selectedType === "Organizer") {

                endpoint = `${API_BASE_URL}/auth/organizer-register`;

                requestBody = {
                    full_name: fullName,
                    email: email,
                    password: password,
                    organization_name: organization,
                    designation: organizerDesignation
                };

            } else {

                showMessage("Please select a valid account type.");
                return;

            }


            // ======================================
            // SUBMIT REGISTRATION
            // ======================================

            const submitButton =
                registerForm.querySelector('button[type="submit"]');

            const originalButtonText = submitButton.textContent;

            submitButton.disabled = true;

            submitButton.textContent = selectedType === "Organizer"
                ? "Submitting Request..."
                : "Creating Account...";


            try {

                const response = await fetch(endpoint, {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(requestBody)

                });

                const data = await readResponse(response);


                // ==================================
                // ORGANIZER REGISTRATION SUCCESS
                // ==================================

                if (selectedType === "Organizer") {

                    registerForm.reset();

                    updateAccountTypeFields();

                    showMessage(
                        data.message ||
                        "Organizer registration submitted successfully. Your account is pending Admin approval. You can login after approval.",
                        "success"
                    );

                    return;

                }


                // ==================================
                // STUDENT REGISTRATION SUCCESS
                // ==================================

                registerForm.reset();

                updateAccountTypeFields();

                showMessage(
                    data.message ||
                    "Student account created successfully. Please login.",
                    "success"
                );

                // Switch to login after successful Student registration.
                setTimeout(() => {

                    showLoginForm();

                    const loginEmail =
                        document.getElementById("login-email");

                    if (loginEmail) {
                        loginEmail.value = email;
                    }

                    showMessage(
                        "Account created successfully. Please login.",
                        "success"
                    );

                }, 1200);


            } catch (error) {

                showMessage(error.message, "error");

            } finally {

                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;

            }

        });

    }


    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    if (forgotPassword) {

        forgotPassword.addEventListener("click", (event) => {

            event.preventDefault();

            showMessage(
                "Forgot password functionality is not available yet.",
                "error"
            );

        });

    }


    // ==========================================
    // INITIAL PAGE STATE
    // ==========================================

    updateAccountTypeFields();

    showLoginForm();

});
