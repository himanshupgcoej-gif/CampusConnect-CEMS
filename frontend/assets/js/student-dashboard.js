
document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = window.CEMS_API_BASE_URL;

    // Read saved login information.
    const token =
        localStorage.getItem("cemsToken") ||
        sessionStorage.getItem("cemsToken");

    const userData =
        localStorage.getItem("cemsUser") ||
        sessionStorage.getItem("cemsUser");

    let user = null;

    try {
        user = userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error("Invalid user information:", error);
    }

    // Require a valid saved Student login.
    if (!token || !user) {
        window.location.replace("login.html");
        return;
    }

    if (user.role !== "Student") {
        if (user.role === "Organizer") {
            window.location.replace("organizer-dashboard.html");
        } else if (user.role === "Admin") {
            window.location.replace("admin-dashboard.html");
        } else {
            window.location.replace("login.html");
        }
        return;
    }

    // Display student information.
    const fullName = user.full_name || "Student";

    document.getElementById("welcome-name").textContent = fullName;
    document.getElementById("sidebar-user-name").textContent = fullName;
    document.getElementById("header-user-name").textContent = fullName;
    document.getElementById("user-avatar").textContent =
        fullName.charAt(0).toUpperCase();

    document.getElementById("footer-year").textContent =
        new Date().getFullYear();


    // API helper.
    async function apiRequest(endpoint, options = {}) {

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            logout();
            throw new Error("Your session has expired. Please login again.");
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Unable to load information.");
        }

        return data;
    }


    // Formatting helpers.
    function formatDate(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Not available";

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function statusClass(value) {
        const status = String(value || "").toLowerCase();

        if (status === "pending") return "pending";
        if (status === "approved" || status === "present") return "approved";
        if (status === "rejected" || status === "absent") return "rejected";

        return "neutral";
    }

    function showMessage(elementId, message, type = "") {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `message ${type}`;
    }


    // Load published events.
    async function loadEvents() {

        const container = document.getElementById("events-container");

        container.innerHTML = '<p class="loading">Loading events...</p>';

        try {

            const data = await apiRequest("/events");

            const events = data.events || [];

            if (events.length === 0) {
                container.innerHTML =
                    '<p class="empty-state">No published events are available right now.</p>';
                return;
            }

            container.innerHTML = events.map(event => {

                const title = escapeHTML(event.event_title);
                const category = escapeHTML(event.category_name || "General");
                const venue = escapeHTML(event.venue);
                const description = escapeHTML(
                    event.description || "Discover this exciting campus event."
                );

                const deadlinePassed =
                    event.registration_deadline &&
                    new Date(event.registration_deadline) < new Date();

                const canRegister =
                    event.status === "Published" && !deadlinePassed;

                return `
                    <article class="event-card">

                        <span class="event-category">${category}</span>

                        <h3>${title}</h3>

                        <p>📍 ${venue}</p>

                        <p>${description}</p>

                        <p><strong>Starts:</strong> ${formatDate(event.start_at)}</p>

                        <p><strong>Registration deadline:</strong>
                            ${formatDate(event.registration_deadline)}
                        </p>

                        <button
                            class="primary-btn register-btn"
                            data-event-id="${Number(event.event_id)}"
                            ${canRegister ? "" : "disabled"}
                        >
                            ${canRegister ? "Register Now →" : "Registration Closed"}
                        </button>

                    </article>
                `;

            }).join("");

            container.querySelectorAll(".register-btn").forEach(button => {

                button.addEventListener("click", async () => {

                    const eventId = button.dataset.eventId;

                    const confirmed = window.confirm(
                        "Do you want to register for this event?"
                    );

                    if (!confirmed) return;

                    button.disabled = true;
                    button.textContent = "Registering...";

                    try {

                        const result = await apiRequest(
                            `/registrations/events/${eventId}`,
                            { method: "POST" }
                        );

                        showMessage(
                            "events-message",
                            result.message || "Registration successful.",
                            "success"
                        );

                        await Promise.all([
                            loadRegistrations(),
                            loadEvents()
                        ]);

                    } catch (error) {

                        showMessage(
                            "events-message",
                            error.message,
                            "error"
                        );

                        button.disabled = false;
                        button.textContent = "Register Now →";

                    }

                });

            });

        } catch (error) {

            container.innerHTML = "";
            showMessage("events-message", error.message, "error");

        }
    }


    // Load the student's registrations.
    async function loadRegistrations() {

        const table = document.getElementById("registrations-table");

        table.innerHTML =
            '<tr><td colspan="5">Loading registrations...</td></tr>';

        try {

            const data = await apiRequest("/registrations/my");

            const registrations = data.registrations || [];

            const pending = registrations.filter(
                item => item.approval_status === "Pending"
            ).length;

            const approved = registrations.filter(
                item => item.approval_status === "Approved"
            ).length;

            document.getElementById("total-registrations").textContent =
                registrations.length;

            document.getElementById("pending-registrations").textContent =
                pending;

            document.getElementById("approved-registrations").textContent =
                approved;

            if (registrations.length === 0) {

                table.innerHTML =
                    '<tr><td colspan="5">You have not registered for any events yet.</td></tr>';

                return;
            }

            table.innerHTML = registrations.map(item => {

                const event = item.event || {};

                return `
                    <tr>
                        <td>${escapeHTML(event.event_title)}</td>
                        <td>${escapeHTML(event.category_name || "General")}</td>
                        <td>${formatDate(item.registration_date)}</td>
                        <td>
                            <span class="status ${statusClass(item.approval_status)}">
                                ${escapeHTML(item.approval_status)}
                            </span>
                        </td>
                        <td>
                            <span class="status ${statusClass(item.attendance_status)}">
                                ${escapeHTML(item.attendance_status)}
                            </span>
                        </td>
                    </tr>
                `;

            }).join("");

        } catch (error) {

            table.innerHTML =
                '<tr><td colspan="5">Unable to load registrations.</td></tr>';

            showMessage(
                "registrations-message",
                error.message,
                "error"
            );

        }
    }


    // Load certificates.
    async function loadCertificates() {

        const container =
            document.getElementById("certificates-container");

        container.innerHTML =
            '<p class="loading">Loading certificates...</p>';

        try {

            const data = await apiRequest("/certificates/my");

            const certificates = data.certificates || [];

            document.getElementById("total-certificates").textContent =
                certificates.length;

            if (certificates.length === 0) {

                container.innerHTML =
                    '<p class="empty-state">No certificates have been issued to you yet.</p>';

                return;
            }

            container.innerHTML = certificates.map(certificate => {

                const eventTitle =
                    certificate.event?.event_title || "College Event";

                return `
                    <article class="certificate-card">

                        <span class="event-category">CERTIFICATE</span>

                        <h3>${escapeHTML(eventTitle)}</h3>

                        <p>
                            <strong>Certificate No:</strong><br>
                            ${escapeHTML(certificate.certificate_number)}
                        </p>

                        <p>
                            <strong>Issued:</strong>
                            ${formatDate(certificate.issued_at)}
                        </p>

                        <button
                            class="download-btn"
                            data-certificate-id="${Number(certificate.certificate_id)}"
                        >
                            Download Certificate ↓
                        </button>

                    </article>
                `;

            }).join("");

            container.querySelectorAll(".download-btn").forEach(button => {

                button.addEventListener("click", async () => {

                    const certificateId = button.dataset.certificateId;

                    button.disabled = true;
                    button.textContent = "Preparing PDF...";

                    try {

                        const response = await fetch(
                            `${API_BASE_URL}/certificates/${certificateId}/download`,
                            {
                                headers: {
                                    "Authorization": `Bearer ${token}`
                                }
                            }
                        );

                        if (response.status === 401) {
                            logout();
                            return;
                        }

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(
                                errorData.message || "Certificate download failed."
                            );
                        }

                        const blob = await response.blob();

                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");

                        link.href = url;
                        link.download = `CEMS-Certificate-${certificateId}.pdf`;

                        document.body.appendChild(link);
                        link.click();
                        link.remove();

                        URL.revokeObjectURL(url);

                    } catch (error) {

                        showMessage(
                            "certificates-message",
                            error.message,
                            "error"
                        );

                    } finally {

                        button.disabled = false;
                        button.textContent = "Download Certificate ↓";

                    }

                });

            });

        } catch (error) {

            container.innerHTML = "";

            showMessage(
                "certificates-message",
                error.message,
                "error"
            );

        }
    }


    // Logout.
    function logout() {

        localStorage.removeItem("cemsToken");
        localStorage.removeItem("cemsUser");

        sessionStorage.removeItem("cemsToken");
        sessionStorage.removeItem("cemsUser");

        window.location.replace("login.html");
    }

    document.getElementById("logout-btn").addEventListener("click", logout);

    document.getElementById("sidebar-logout-btn")
        .addEventListener("click", logout);


    // Refresh buttons.
    document.getElementById("refresh-events")
        .addEventListener("click", loadEvents);

    document.getElementById("refresh-registrations")
        .addEventListener("click", loadRegistrations);

    document.getElementById("refresh-certificates")
        .addEventListener("click", loadCertificates);


    // Highlight selected navigation section.
    document.querySelectorAll(".nav-link[href^='#']").forEach(link => {

        link.addEventListener("click", () => {

            document.querySelectorAll(".nav-link").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");

        });

    });


    // Load dashboard data.
    loadEvents();
    loadRegistrations();
    loadCertificates();

});
