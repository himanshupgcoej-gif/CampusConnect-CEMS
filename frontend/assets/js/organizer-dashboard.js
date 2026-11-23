
// =====================================================
// CAMPUSCONNECT - ORGANIZER DASHBOARD
// =====================================================

const API_BASE = String(window.CEMS_API_BASE_URL || "").replace(/\/$/, "");

let organizerUser = null;
let authToken = null;
let myEvents = [];
let selectedRegistrations = [];
let selectedCertificates = [];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function element(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function showMessage(id, message, type = "success") {
    const box = element(id);
    if (!box) return;

    box.textContent = message;
    box.className = `message ${type}`;
    box.style.display = "block";
}

function clearMessage(id) {
    const box = element(id);
    if (!box) return;

    box.textContent = "";
    box.style.display = "none";
}

function showTableMessage(id, message, colspan = 5) {
    const tbody = element(id);
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}">${escapeHTML(message)}</td>
        </tr>
    `;
}

function getAuthData() {
    const token =
        sessionStorage.getItem("cemsToken") ||
        localStorage.getItem("cemsToken");

    const storedUser =
        sessionStorage.getItem("cemsUser") ||
        localStorage.getItem("cemsUser");

    if (!token || !storedUser) return null;

    try {
        return {
            token,
            user: JSON.parse(storedUser)
        };
    } catch (error) {
        console.error("Authentication data error:", error);
        return null;
    }
}

// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(endpoint, options = {}) {
    if (!API_BASE) {
        throw new Error("API configuration is missing.");
    }

    const headers = {
        Authorization: `Bearer ${authToken}`,
        ...(options.headers || {})
    };

    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status}).`
        );
    }

    return data;
}

// =====================================================
// AUTHENTICATION
// =====================================================

function initializeAuthentication() {
    const auth = getAuthData();

    if (!auth) {
        alert("Please login to access the Organizer Dashboard.");
        window.location.href = "login.html";
        return false;
    }

    organizerUser = auth.user;
    authToken = auth.token;

    if (organizerUser.role !== "Organizer") {
        alert("Access denied. Organizer account required.");
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function logout() {
    sessionStorage.removeItem("cemsToken");
    sessionStorage.removeItem("cemsUser");

    localStorage.removeItem("cemsToken");
    localStorage.removeItem("cemsUser");

    window.location.href = "login.html";
}

function loadOrganizerProfile() {
    const name =
        organizerUser.full_name ||
        organizerUser.name ||
        "Organizer";

    if (element("header-user-name")) {
        element("header-user-name").textContent = name;
    }

    if (element("sidebar-user-name")) {
        element("sidebar-user-name").textContent = name;
    }

    if (element("welcome-name")) {
        element("welcome-name").textContent = name;
    }

    if (element("user-avatar")) {
        element("user-avatar").textContent =
            name.trim().charAt(0).toUpperCase();
    }

    if (element("footer-year")) {
        element("footer-year").textContent = new Date().getFullYear();
    }
}

// =====================================================
// EVENT CATEGORIES
// =====================================================

async function loadEventCategories() {
    const select = element("event-category");
    if (!select) return;

    try {
        const data = await apiRequest("/events/categories");

        select.innerHTML = `
            <option value="">Select Category</option>
        `;

        (data.categories || []).forEach(category => {
            const option = document.createElement("option");

            option.value = category.category_id;
            option.textContent = category.category_name;

            select.appendChild(option);
        });

    } catch (error) {
        console.error("Category loading error:", error);
        showMessage("create-event-message", error.message, "error");
    }
}

// =====================================================
// DASHBOARD STATISTICS
// =====================================================

async function loadDashboardStats() {
    try {
        const data = await apiRequest("/events/my");

        myEvents = data.events || [];

        const totalEvents = myEvents.length;

        const draftEvents = myEvents.filter(event =>
            String(event.status).toLowerCase() === "draft"
        ).length;

        let totalRegistrations = 0;
        let totalCertificates = 0;

        const certificateResults = await Promise.allSettled(
            myEvents.map(event =>
                apiRequest(`/certificates/events/${event.event_id}`)
            )
        );

        certificateResults.forEach(result => {
            if (result.status !== "fulfilled") return;

            const records = result.value.certificates || [];

            totalRegistrations += records.length;

            totalCertificates += records.filter(record =>
                record.certificate_issued === true
            ).length;
        });

        element("total-events").textContent = totalEvents;
        element("draft-events").textContent = draftEvents;
        element("total-registrations").textContent = totalRegistrations;
        element("total-certificates").textContent = totalCertificates;

    } catch (error) {
        console.error("Dashboard statistics error:", error);
    }
}

// =====================================================
// MY EVENTS
// =====================================================

async function loadMyEvents() {
    clearMessage("events-message");

    const container = element("events-container");

    if (container) {
        container.innerHTML = `<p class="loading">Loading your events...</p>`;
    }

    try {
        const data = await apiRequest("/events/my");

        myEvents = data.events || [];

        renderMyEvents();
        populateEventFilters();

    } catch (error) {
        console.error("Load events error:", error);

        if (container) {
            container.innerHTML = `
                <p class="loading">Unable to load events.</p>
            `;
        }

        showMessage("events-message", error.message, "error");
    }
}

function renderMyEvents() {
    const container = element("events-container");
    if (!container) return;

    if (myEvents.length === 0) {
        container.innerHTML = `
            <p class="loading">You have not created any events yet.</p>
        `;
        return;
    }

    container.innerHTML = myEvents.map(event => {
        const status = String(event.status || "Draft");
        const isDraft = status.toLowerCase() === "draft";

        return `
            <article class="event-card">

                ${
                    event.image_url
                        ? `<img
                            src="${escapeHTML(event.image_url)}"
                            alt="${escapeHTML(event.event_title)}"
                            class="event-image"
                            onerror="this.style.display='none'"
                        >`
                        : ""
                }

                <div class="event-card-content">

                    <span class="event-status">
                        ${escapeHTML(status)}
                    </span>

                    <h3>${escapeHTML(event.event_title)}</h3>

                    <p>${escapeHTML(event.description || "")}</p>

                    <p>
                        <strong>Category:</strong>
                        ${escapeHTML(event.category_name || "N/A")}
                    </p>

                    <p>
                        <strong>Venue:</strong>
                        ${escapeHTML(event.venue || "N/A")}
                    </p>

                    <p>
                        <strong>Start:</strong>
                        ${escapeHTML(formatDate(event.start_at))}
                    </p>

                    <p>
                        <strong>Capacity:</strong>
                        ${escapeHTML(event.capacity)}
                    </p>

                    <div class="event-card-actions">

                        ${
                            isDraft
                                ? `<button
                                    type="button"
                                    class="primary-btn"
                                    data-action="publish"
                                    data-event-id="${Number(event.event_id)}"
                                >
                                    Publish Event
                                </button>`
                                : ""
                        }

                        <button
                            type="button"
                            class="secondary-btn"
                            data-action="registrations"
                            data-event-id="${Number(event.event_id)}"
                        >
                            View Registrations
                        </button>

                    </div>

                </div>

            </article>
        `;
    }).join("");
}

function populateEventFilters() {
    const filterIds = [
        "registration-event-filter",
        "attendance-event-filter",
        "certificate-event-filter"
    ];

    filterIds.forEach(id => {
        const select = element(id);
        if (!select) return;

        const previousValue = select.value;

        select.innerHTML = `
            <option value="">Select an event</option>
        `;

        myEvents.forEach(event => {
            const option = document.createElement("option");

            option.value = event.event_id;
            option.textContent = event.event_title;

            select.appendChild(option);
        });

        if (myEvents.some(event =>
            String(event.event_id) === previousValue
        )) {
            select.value = previousValue;
        }
    });
}

// =====================================================
// PUBLISH EVENT
// =====================================================

async function publishEvent(eventId) {
    if (!confirm("Are you sure you want to publish this event?")) {
        return;
    }

    try {
        const data = await apiRequest(
            `/events/${eventId}/publish`,
            { method: "PATCH" }
        );

        showMessage(
            "events-message",
            data.message || "Event published successfully.",
            "success"
        );

        await loadMyEvents();
        await loadDashboardStats();

    } catch (error) {
        console.error("Publish event error:", error);
        showMessage("events-message", error.message, "error");
    }
}

// =====================================================
// CREATE EVENT
// =====================================================

function toISOStringOrNull(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Please enter a valid date and time.");
    }

    return date.toISOString();
}

async function createEvent(event) {
    event.preventDefault();

    clearMessage("create-event-message");

    const form = element("create-event-form");
    const button = element("create-event-btn");

    const startValue = element("event-start").value;
    const endValue = element("event-end").value;
    const deadlineValue = element("event-deadline").value;

    if (!startValue || !endValue) {
        showMessage(
            "create-event-message",
            "Please enter the event start and end dates.",
            "error"
        );
        return;
    }

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (endDate <= startDate) {
        showMessage(
            "create-event-message",
            "Event end date must be after the start date.",
            "error"
        );
        return;
    }

    if (
        deadlineValue &&
        new Date(deadlineValue) > startDate
    ) {
        showMessage(
            "create-event-message",
            "Registration deadline cannot be after the event start.",
            "error"
        );
        return;
    }

    const payload = {
        event_title: element("event-title").value.trim(),
        description: element("event-description").value.trim(),
        venue: element("event-venue").value.trim(),
        category_id: Number(element("event-category").value),
        start_at: toISOStringOrNull(startValue),
        end_at: toISOStringOrNull(endValue),
        registration_deadline: toISOStringOrNull(deadlineValue),
        capacity: Number(element("event-capacity").value),
        image_url: element("event-image").value.trim() || null
    };

    if (
        !payload.event_title ||
        !payload.description ||
        !payload.venue ||
        !payload.category_id ||
        !payload.capacity ||
        payload.capacity < 1
    ) {
        showMessage(
            "create-event-message",
            "Please complete all required fields correctly.",
            "error"
        );
        return;
    }

    try {
        button.disabled = true;
        button.textContent = "Creating...";

        const data = await apiRequest("/events", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        showMessage(
            "create-event-message",
            data.message || "Event created successfully as Draft.",
            "success"
        );

        form.reset();

        await loadMyEvents();
        await loadDashboardStats();

    } catch (error) {
        console.error("Create event error:", error);

        showMessage(
            "create-event-message",
            error.message,
            "error"
        );

    } finally {
        button.disabled = false;
        button.textContent = "Create Event";
    }
}

// =====================================================
// EVENT REGISTRATIONS
// =====================================================

async function loadRegistrations() {
    clearMessage("registrations-message");

    const eventId = element("registration-event-filter").value;

    if (!eventId) {
        showTableMessage(
            "registrations-table",
            "Select an event to view registrations."
        );
        return;
    }

    showTableMessage(
        "registrations-table",
        "Loading registrations..."
    );

    try {
        const data = await apiRequest(
            `/registrations/events/${eventId}`
        );

        selectedRegistrations = data.registrations || [];

        renderRegistrations();

    } catch (error) {
        console.error("Load registrations error:", error);

        showTableMessage(
            "registrations-table",
            "Unable to load registrations."
        );

        showMessage(
            "registrations-message",
            error.message,
            "error"
        );
    }
}

function renderRegistrations() {
    const tbody = element("registrations-table");
    if (!tbody) return;

    if (selectedRegistrations.length === 0) {
        showTableMessage(
            "registrations-table",
            "No students have registered for this event."
        );
        return;
    }

    tbody.innerHTML = selectedRegistrations.map(registration => {
        const status = registration.approval_status || "Pending";
        const pending = status === "Pending";

        return `
            <tr>

                <td>
                    ${escapeHTML(registration.student?.full_name)}
                </td>

                <td>
                    ${escapeHTML(registration.student?.email)}
                </td>

                <td>
                    ${escapeHTML(formatDate(registration.registration_date))}
                </td>

                <td>
                    ${escapeHTML(status)}
                </td>

                <td>
                    ${
                        pending
                            ? `
                                <button
                                    type="button"
                                    class="primary-btn"
                                    data-registration-action="Approved"
                                    data-registration-id="${Number(registration.registration_id)}"
                                >
                                    Approve
                                </button>

                                <button
                                    type="button"
                                    class="secondary-btn"
                                    data-registration-action="Rejected"
                                    data-registration-id="${Number(registration.registration_id)}"
                                >
                                    Reject
                                </button>
                            `
                            : escapeHTML(status)
                    }
                </td>

            </tr>
        `;
    }).join("");
}

async function updateRegistrationStatus(registrationId, status) {
    const action = status === "Approved" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${action} this registration?`)) {
        return;
    }

    try {
        const data = await apiRequest(
            `/registrations/${registrationId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    approval_status: status
                })
            }
        );

        showMessage(
            "registrations-message",
            data.message || `Registration ${action}d successfully.`,
            "success"
        );

        await loadRegistrations();
        await loadDashboardStats();

    } catch (error) {
        console.error("Registration update error:", error);

        showMessage(
            "registrations-message",
            error.message,
            "error"
        );
    }
}

// =====================================================
// ATTENDANCE MANAGEMENT
// =====================================================

async function loadAttendance() {
    clearMessage("attendance-message");

    const eventId = element("attendance-event-filter").value;

    if (!eventId) {
        showTableMessage(
            "attendance-table",
            "Select an event to manage attendance."
        );
        return;
    }

    showTableMessage("attendance-table", "Loading attendance...");

    try {
        const data = await apiRequest(
            `/registrations/events/${eventId}`
        );

        selectedRegistrations = data.registrations || [];

        renderAttendance();

    } catch (error) {
        console.error("Load attendance error:", error);

        showTableMessage(
            "attendance-table",
            "Unable to load attendance."
        );

        showMessage(
            "attendance-message",
            error.message,
            "error"
        );
    }
}

function renderAttendance() {
    const tbody = element("attendance-table");
    if (!tbody) return;

    const approved = selectedRegistrations.filter(
        registration => registration.approval_status === "Approved"
    );

    if (approved.length === 0) {
        showTableMessage(
            "attendance-table",
            "No approved registrations found."
        );
        return;
    }

    tbody.innerHTML = approved.map(registration => {
        const attendance = registration.attendance_status || "Not Marked";

        return `
            <tr>

                <td>
                    ${escapeHTML(registration.student?.full_name)}
                </td>

                <td>
                    ${escapeHTML(registration.student?.email)}
                </td>

                <td>Approved</td>

                <td>${escapeHTML(attendance)}</td>

                <td>
                    <button
                        type="button"
                        class="primary-btn"
                        data-attendance-action="Present"
                        data-registration-id="${Number(registration.registration_id)}"
                    >
                        Present
                    </button>

                    <button
                        type="button"
                        class="secondary-btn"
                        data-attendance-action="Absent"
                        data-registration-id="${Number(registration.registration_id)}"
                    >
                        Absent
                    </button>
                </td>

            </tr>
        `;
    }).join("");
}

async function updateAttendance(registrationId, status) {
    if (!confirm(`Mark this student as ${status}?`)) return;

    try {
        const data = await apiRequest(
            `/registrations/${registrationId}/attendance`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    attendance_status: status
                })
            }
        );

        showMessage(
            "attendance-message",
            data.message || `Attendance marked ${status}.`,
            "success"
        );

        await loadAttendance();
        await loadCertificatesForSelectedEvent();
        await loadDashboardStats();

    } catch (error) {
        console.error("Attendance update error:", error);

        showMessage(
            "attendance-message",
            error.message,
            "error"
        );
    }
}

// =====================================================
// CERTIFICATE MANAGEMENT
// =====================================================

async function loadCertificatesForSelectedEvent() {
    clearMessage("certificates-message");

    const eventId = element("certificate-event-filter").value;

    if (!eventId) {
        showTableMessage(
            "certificates-table",
            "Select an event to manage certificates."
        );
        return;
    }

    showTableMessage("certificates-table", "Loading certificates...");

    try {
        const data = await apiRequest(
            `/certificates/events/${eventId}`
        );

        selectedCertificates = data.certificates || [];

        renderCertificates();

    } catch (error) {
        console.error("Load certificates error:", error);

        showTableMessage(
            "certificates-table",
            "Unable to load certificate records."
        );

        showMessage(
            "certificates-message",
            error.message,
            "error"
        );
    }
}

function renderCertificates() {
    const tbody = element("certificates-table");
    if (!tbody) return;

    if (selectedCertificates.length === 0) {
        showTableMessage(
            "certificates-table",
            "No registrations found for this event."
        );
        return;
    }

    tbody.innerHTML = selectedCertificates.map(record => {
        const issued = record.certificate_issued === true;
        const certificateStatus = record.certificate_status || "Not Issued";

        let action = "";

        if (
            record.approval_status === "Approved" &&
            record.attendance_status === "Present" &&
            !issued
        ) {
            action = `
                <button
                    type="button"
                    class="primary-btn"
                    data-certificate-action="issue"
                    data-registration-id="${Number(record.registration_id)}"
                >
                    Issue Certificate
                </button>
            `;
        } else if (
            issued &&
            certificateStatus === "Active"
        ) {
            action = `
                <button
                    type="button"
                    class="primary-btn"
                    data-certificate-action="download"
                    data-certificate-id="${Number(record.certificate_id)}"
                >
                    Download
                </button>
            `;
        } else if (issued) {
            action = escapeHTML(certificateStatus);
        } else if (record.attendance_status !== "Present") {
            action = "Attendance required";
        } else {
            action = "Approval required";
        }

        return `
            <tr>

                <td>${escapeHTML(record.student_name)}</td>

                <td>${escapeHTML(record.email)}</td>

                <td>${escapeHTML(record.attendance_status || "Not Marked")}</td>

                <td>${escapeHTML(certificateStatus)}</td>

                <td>${action}</td>

            </tr>
        `;
    }).join("");
}

async function issueCertificate(registrationId) {
    if (!confirm("Issue a certificate to this student?")) return;

    try {
        const data = await apiRequest(
            `/certificates/registrations/${registrationId}/issue`,
            { method: "POST" }
        );

        showMessage(
            "certificates-message",
            data.message || "Certificate issued successfully.",
            "success"
        );

        await loadCertificatesForSelectedEvent();
        await loadDashboardStats();

    } catch (error) {
        console.error("Issue certificate error:", error);

        showMessage(
            "certificates-message",
            error.message,
            "error"
        );
    }
}

// =====================================================
// DOWNLOAD CERTIFICATE PDF
// =====================================================

async function downloadCertificate(certificateId) {
    try {
        const response = await fetch(
            `${API_BASE}/certificates/${certificateId}/download`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(
                errorData.message ||
                errorData.error ||
                "Certificate download failed."
            );
        }

        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `Certificate-${certificateId}.pdf`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Certificate download error:", error);

        showMessage(
            "certificates-message",
            error.message,
            "error"
        );
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {

    // Logout
    element("logout-btn")?.addEventListener("click", logout);
    element("sidebar-logout-btn")?.addEventListener("click", logout);

    // Create event
    element("create-event-form")?.addEventListener(
        "submit",
        createEvent
    );

    // Refresh events
    element("refresh-events")?.addEventListener(
        "click",
        loadMyEvents
    );

    // Event card actions
    element("events-container")?.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const eventId = Number(button.dataset.eventId);

        if (button.dataset.action === "publish") {
            publishEvent(eventId);
        }

        if (button.dataset.action === "registrations") {
            element("registration-event-filter").value = eventId;

            document.getElementById("registrations")
                ?.scrollIntoView({ behavior: "smooth" });

            loadRegistrations();
        }
    });

    // Registrations
    element("registration-event-filter")?.addEventListener(
        "change",
        loadRegistrations
    );

    element("refresh-registrations")?.addEventListener(
        "click",
        loadRegistrations
    );

    element("registrations-table")?.addEventListener("click", event => {
        const button = event.target.closest(
            "button[data-registration-action]"
        );

        if (!button) return;

        updateRegistrationStatus(
            Number(button.dataset.registrationId),
            button.dataset.registrationAction
        );
    });

    // Attendance
    element("attendance-event-filter")?.addEventListener(
        "change",
        loadAttendance
    );

    element("refresh-attendance")?.addEventListener(
        "click",
        loadAttendance
    );

    element("attendance-table")?.addEventListener("click", event => {
        const button = event.target.closest(
            "button[data-attendance-action]"
        );

        if (!button) return;

        updateAttendance(
            Number(button.dataset.registrationId),
            button.dataset.attendanceAction
        );
    });

    // Certificates
    element("certificate-event-filter")?.addEventListener(
        "change",
        loadCertificatesForSelectedEvent
    );

    element("certificates-table")?.addEventListener("click", event => {
        const button = event.target.closest(
            "button[data-certificate-action]"
        );

        if (!button) return;

        const action = button.dataset.certificateAction;

        if (action === "issue") {
            issueCertificate(
                Number(button.dataset.registrationId)
            );
        }

        if (action === "download") {
            downloadCertificate(
                Number(button.dataset.certificateId)
            );
        }
    });

    // Sidebar navigation
    document.querySelectorAll(".nav-link[href^='#']").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });
    });
}

// =====================================================
// INITIALIZE ORGANIZER DASHBOARD
// =====================================================

async function initializeDashboard() {
    if (!initializeAuthentication()) return;

    loadOrganizerProfile();
    setupEventListeners();

    await Promise.all([
        loadEventCategories(),
        loadMyEvents()
    ]);

    await loadDashboardStats();
}

// Start dashboard
document.addEventListener("DOMContentLoaded", initializeDashboard);
