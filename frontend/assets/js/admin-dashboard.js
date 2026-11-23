
// =====================================================
// CAMPUSCONNECT - ADMIN DASHBOARD
// =====================================================

const API_BASE = window.CEMS_API_BASE_URL;


// =====================================================
// HELPER FUNCTIONS
// =====================================================

function element(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}


function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString();
}


// =====================================================
// AUTHENTICATION
// =====================================================

function getAuthData() {

    const storages = [localStorage, sessionStorage];

    for (const storage of storages) {

        const token = storage.getItem("cemsToken");
        const userData = storage.getItem("cemsUser");

        if (token && userData) {

            try {
                return {
                    token,
                    user: JSON.parse(userData)
                };
            } catch (error) {
                console.error("Invalid user data:", error);
            }
        }
    }

    return null;
}


const authData = getAuthData();


if (!authData) {
    window.location.href = "login.html";
    throw new Error("Authentication required.");
}


if (authData.user.role !== "Admin") {

    if (authData.user.role === "Student") {
        window.location.href = "student-dashboard.html";
    } else if (authData.user.role === "Organizer") {
        window.location.href = "organizer-dashboard.html";
    } else {
        window.location.href = "login.html";
    }

    throw new Error("Admin access required.");
}


const adminUser = authData.user;
const token = authData.token;


// =====================================================
// API REQUEST HELPER
// =====================================================

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(`${API_BASE}${endpoint}`, {

        ...options,

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options.headers
        }

    });


    const contentType = response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : null;


    if (!response.ok) {

        throw new Error(
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}


// =====================================================
// MESSAGE DISPLAY
// =====================================================

function showMessage(id, message, type = "success") {

    const box = element(id);

    if (!box) return;

    box.textContent = message;
    box.className = `message-box ${type}`;
}


function clearMessage(id) {

    const box = element(id);

    if (!box) return;

    box.textContent = "";
    box.className = "message-box";
}


// =====================================================
// ADMIN PROFILE
// =====================================================

function loadAdminProfile() {

    const name = adminUser.full_name || "Administrator";

    if (element("header-admin-name")) {
        element("header-admin-name").textContent = name;
    }

    if (element("sidebar-admin-name")) {
        element("sidebar-admin-name").textContent = name;
    }

    if (element("welcome-admin-name")) {
        element("welcome-admin-name").textContent = name;
    }

    if (element("admin-avatar")) {
        element("admin-avatar").textContent =
            name.charAt(0).toUpperCase();
    }

    if (element("footer-year")) {
        element("footer-year").textContent =
            new Date().getFullYear();
    }
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    localStorage.removeItem("cemsToken");
    localStorage.removeItem("cemsUser");

    sessionStorage.removeItem("cemsToken");
    sessionStorage.removeItem("cemsUser");

    window.location.href = "login.html";
}


element("logout-btn")?.addEventListener("click", logout);

element("sidebar-logout-btn")?.addEventListener(
    "click",
    logout
);


// =====================================================
// MOBILE SIDEBAR
// =====================================================

const menuToggle = element("menu-toggle");
const adminSidebar = element("admin-sidebar");


menuToggle?.addEventListener("click", () => {
    adminSidebar?.classList.toggle("active");
});


document.querySelectorAll(".sidebar-nav a").forEach(link => {

    link.addEventListener("click", function () {

        document.querySelectorAll(".sidebar-nav a")
            .forEach(item => item.classList.remove("active"));

        this.classList.add("active");

        adminSidebar?.classList.remove("active");
    });

});


// =====================================================
// DASHBOARD STATISTICS
// =====================================================

async function loadDashboardStats() {

    try {

        const data = await apiRequest("/admin/dashboard");

        const stats = data.dashboard || {};


        if (element("total-users")) {
            element("total-users").textContent =
                stats.total_users ?? 0;
        }

        if (element("total-students")) {
            element("total-students").textContent =
                stats.students ?? 0;
        }

        if (element("total-organizers")) {
            element("total-organizers").textContent =
                stats.organizers ?? 0;
        }

        if (element("total-events")) {
            element("total-events").textContent =
                stats.total_events ?? 0;
        }

        if (element("active-users")) {
            element("active-users").textContent =
                stats.active_users ?? 0;
        }

        if (element("inactive-users")) {

            const inactiveUsers =
                Number(stats.total_users || 0) -
                Number(stats.active_users || 0);

            element("inactive-users").textContent =
                Math.max(0, inactiveUsers);
        }

    } catch (error) {

        console.error("Dashboard statistics error:", error);

        showMessage(
            "users-message",
            "Unable to load dashboard statistics: " + error.message,
            "error"
        );
    }
}


// =====================================================
// USER MANAGEMENT
// =====================================================

let allUsers = [];


async function loadUsers() {

    clearMessage("users-message");

    const tbody = element("users-table-body");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">Loading users...</td>
            </tr>
        `;
    }


    try {

        const data = await apiRequest(
            "/admin/users?page=1&per_page=100"
        );

        allUsers = data.users || [];

        renderUsers();

    } catch (error) {

        console.error("Load users error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">Unable to load users.</td>
                </tr>
            `;
        }

        showMessage(
            "users-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// RENDER USERS TABLE
// =====================================================

function renderUsers() {

    const tbody = element("users-table-body");

    if (!tbody) return;


    const searchValue =
        (element("user-search")?.value || "")
            .trim()
            .toLowerCase();

    const roleValue =
        element("user-role-filter")?.value || "all";

    const statusValue =
        element("user-status-filter")?.value || "all";


    const filteredUsers = allUsers.filter(user => {

        const matchesSearch =
            String(user.full_name || "")
                .toLowerCase()
                .includes(searchValue) ||

            String(user.email || "")
                .toLowerCase()
                .includes(searchValue);


        const matchesRole =
            roleValue === "all" ||
            user.role === roleValue;


        const matchesStatus =
            statusValue === "all" ||
            (statusValue === "active" && user.is_active === true) ||
            (statusValue === "inactive" && user.is_active === false);


        return matchesSearch && matchesRole && matchesStatus;
    });


    if (element("users-count")) {
        element("users-count").textContent =
            `${filteredUsers.length} Users`;
    }


    if (filteredUsers.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">No users found.</td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = filteredUsers.map(user => {

        const isActive = user.is_active === true;

        const statusClass = isActive
            ? "status-active"
            : "status-inactive";

        const statusText = isActive
            ? "Active"
            : "Inactive";


        const actionButton = user.role === "Admin"
            ? `<span>Protected</span>`
            : `
                <button
                    class="user-status-btn"
                    data-user-id="${Number(user.user_id)}"
                    data-active="${isActive}"
                    type="button"
                >
                    ${isActive ? "Deactivate" : "Activate"}
                </button>
            `;


        return `
            <tr>

                <td>${escapeHTML(user.user_id)}</td>

                <td>${escapeHTML(user.full_name)}</td>

                <td>${escapeHTML(user.email)}</td>

                <td>${escapeHTML(user.role)}</td>

                <td>
                    <span class="${statusClass}">
                        ${statusText}
                    </span>
                </td>

                <td>

                    <button
                        class="view-user-btn"
                        data-user-id="${Number(user.user_id)}"
                        type="button"
                    >
                        View
                    </button>

                    ${actionButton}

                </td>

            </tr>
        `;

    }).join("");


    tbody.querySelectorAll(".view-user-btn")
        .forEach(button => {

            button.addEventListener("click", () => {
                viewUser(Number(button.dataset.userId));
            });

        });


    tbody.querySelectorAll(".user-status-btn")
        .forEach(button => {

            button.addEventListener("click", async () => {

                const userId = Number(button.dataset.userId);

                const isActive = button.dataset.active === "true";

                await updateUserStatus(userId, !isActive);

            });

        });

}


// =====================================================
// VIEW INDIVIDUAL USER
// =====================================================

async function viewUser(userId) {

    try {

        const data = await apiRequest(
            `/admin/users/${userId}`
        );

        const user = data.user;

        if (!user) {
            throw new Error("User details not found.");
        }


        alert(
            `USER DETAILS\n\n` +
            `User ID: ${user.user_id}\n` +
            `Name: ${user.full_name}\n` +
            `Email: ${user.email}\n` +
            `Phone: ${user.phone || "Not available"}\n` +
            `Role: ${user.role}\n` +
            `PRN: ${user.prn || "N/A"}\n` +
            `Department: ${user.department || "N/A"}\n` +
            `Organization: ${user.organization_name || "N/A"}\n` +
            `Designation: ${user.designation || "N/A"}\n` +
            `Approval Status: ${user.approval_status || "N/A"}\n` +
            `Rejection Reason: ${user.rejection_reason || "N/A"}\n` +
            `Status: ${user.is_active ? "Active" : "Inactive"}\n` +
            `Created: ${formatDate(user.created_at)}`
        );

    } catch (error) {

        showMessage(
            "users-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// ACTIVATE / DEACTIVATE USER
// =====================================================

async function updateUserStatus(userId, newStatus) {

    const action = newStatus ? "activate" : "deactivate";

    const confirmed = confirm(
        `Are you sure you want to ${action} this user?`
    );

    if (!confirmed) return;


    try {

        await apiRequest(
            `/admin/users/${userId}/status`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    is_active: newStatus
                })
            }
        );


        await loadUsers();

        await loadDashboardStats();


        showMessage(
            "users-message",
            `User ${action}d successfully.`,
            "success"
        );

    } catch (error) {

        console.error("User status update error:", error);

        showMessage(
            "users-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// USER FILTER EVENTS
// =====================================================

element("user-search")?.addEventListener(
    "input",
    renderUsers
);

element("user-role-filter")?.addEventListener(
    "change",
    renderUsers
);

element("user-status-filter")?.addEventListener(
    "change",
    renderUsers
);

element("refresh-users")?.addEventListener(
    "click",
    async () => {
        await loadUsers();
        await loadDashboardStats();
    }
);


// =====================================================
// ORGANIZER APPROVAL MANAGEMENT
// =====================================================

let pendingOrganizers = [];


// =====================================================
// LOAD PENDING ORGANIZERS
// =====================================================

async function loadPendingOrganizers() {

    clearMessage("organizers-message");

    const tbody = element("organizers-table-body");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">Loading organizer applications...</td>
            </tr>
        `;
    }


    try {

        const data = await apiRequest(
            "/admin/organizers/pending"
        );

        pendingOrganizers = data.organizers || [];

        renderPendingOrganizers();


    } catch (error) {

        console.error("Load pending organizers error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">Unable to load organizer applications.</td>
                </tr>
            `;
        }

        if (element("pending-organizers-count")) {
            element("pending-organizers-count").textContent = "--";
        }

        if (element("organizers-count")) {
            element("organizers-count").textContent = "0 Applications";
        }

        showMessage(
            "organizers-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// RENDER PENDING ORGANIZERS TABLE
// =====================================================

function renderPendingOrganizers() {

    const tbody = element("organizers-table-body");

    if (!tbody) return;


    const total = pendingOrganizers.length;


    if (element("pending-organizers-count")) {
        element("pending-organizers-count").textContent = total;
    }

    if (element("organizers-count")) {
        element("organizers-count").textContent =
            `${total} Applications`;
    }


    if (total === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No pending organizer applications.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = pendingOrganizers.map(organizer => {

        const userId = Number(organizer.user_id);

        return `
            <tr>

                <td>${escapeHTML(organizer.user_id)}</td>

                <td>${escapeHTML(organizer.full_name)}</td>

                <td>${escapeHTML(organizer.email)}</td>

                <td>${escapeHTML(organizer.organization_name || "N/A")}</td>

                <td>${escapeHTML(organizer.designation || "N/A")}</td>

                <td>${escapeHTML(formatDate(organizer.created_at))}</td>

                <td>

                    <button
                        class="organizer-approve-btn"
                        data-user-id="${userId}"
                        type="button"
                    >
                        Approve
                    </button>

                    <button
                        class="organizer-reject-btn"
                        data-user-id="${userId}"
                        type="button"
                    >
                        Reject
                    </button>

                </td>

            </tr>
        `;

    }).join("");


    // APPROVE BUTTON EVENTS

    tbody.querySelectorAll(".organizer-approve-btn")
        .forEach(button => {

            button.addEventListener("click", async () => {

                const userId = Number(button.dataset.userId);

                await updateOrganizerApproval(userId, "Approve");

            });

        });


    // REJECT BUTTON EVENTS

    tbody.querySelectorAll(".organizer-reject-btn")
        .forEach(button => {

            button.addEventListener("click", async () => {

                const userId = Number(button.dataset.userId);

                await updateOrganizerApproval(userId, "Reject");

            });

        });

}


// =====================================================
// APPROVE / REJECT ORGANIZER
// =====================================================

async function updateOrganizerApproval(userId, action) {

    let rejectionReason = "";


    // Ask for rejection reason.

    if (action === "Reject") {

        const reason = prompt(
            "Enter the reason for rejecting this organizer registration:"
        );

        if (reason === null) return;

        rejectionReason = reason.trim();

        if (!rejectionReason) {

            alert("Rejection reason is required.");

            return;
        }
    }


    const confirmed = confirm(
        `Are you sure you want to ${action.toLowerCase()} this organizer application?`
    );

    if (!confirmed) return;


    try {

        const requestBody = {
            action: action
        };


        if (action === "Reject") {
            requestBody.rejection_reason = rejectionReason;
        }


        await apiRequest(
            `/admin/organizers/${userId}/approval`,
            {
                method: "PATCH",

                body: JSON.stringify(requestBody)
            }
        );


        // Refresh pending applications.

        await loadPendingOrganizers();


        // Refresh dashboard statistics.

        await loadDashboardStats();

        // Refresh registered users list.

        await loadUsers();


        showMessage(
            "organizers-message",
            `Organizer application ${action.toLowerCase()}d successfully.`,
            "success"
        );


    } catch (error) {

        console.error("Organizer approval error:", error);

        showMessage(
            "organizers-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// REFRESH ORGANIZER APPLICATIONS
// =====================================================

element("refresh-organizers")?.addEventListener(
    "click",
    async () => {

        await loadPendingOrganizers();

        await loadDashboardStats();

    }
);


// =====================================================
// EVENT MANAGEMENT
// =====================================================

let allEvents = [];


async function loadEvents() {

    clearMessage("events-message");

    const tbody = element("events-table-body");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">Loading events...</td>
            </tr>
        `;
    }


    try {

        const data = await apiRequest("/admin/events");

        allEvents = data.events || [];

        renderEvents();

    } catch (error) {

        console.error("Load events error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">Unable to load events.</td>
                </tr>
            `;
        }

        showMessage(
            "events-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// RENDER EVENTS TABLE
// =====================================================

function renderEvents() {

    const tbody = element("events-table-body");

    if (!tbody) return;


    const searchValue =
        (element("event-search")?.value || "")
            .trim()
            .toLowerCase();

    const statusValue =
        element("event-status-filter")?.value || "all";


    const filteredEvents = allEvents.filter(event => {

        const matchesSearch =
            String(event.event_title || "")
                .toLowerCase()
                .includes(searchValue);

        const matchesStatus =
            statusValue === "all" ||
            event.status === statusValue;

        return matchesSearch && matchesStatus;
    });


    if (element("events-count")) {
        element("events-count").textContent =
            `${filteredEvents.length} Events`;
    }


    if (filteredEvents.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">No events found.</td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = filteredEvents.map(event => {

        const statusClass =
            event.status === "Published"
                ? "status-published"
                : "status-draft";


        return `
            <tr>

                <td>${escapeHTML(event.event_id)}</td>

                <td>${escapeHTML(event.event_title)}</td>

                <td>${escapeHTML(event.organizer_name || "N/A")}</td>

                <td>${escapeHTML(event.category_name || "N/A")}</td>

                <td>${escapeHTML(event.venue || "N/A")}</td>

                <td>${escapeHTML(formatDate(event.start_at))}</td>

                <td>
                    <span class="${statusClass}">
                        ${escapeHTML(event.status)}
                    </span>
                </td>

            </tr>
        `;

    }).join("");

}


// =====================================================
// EVENT FILTER EVENTS
// =====================================================

element("event-search")?.addEventListener(
    "input",
    renderEvents
);

element("event-status-filter")?.addEventListener(
    "change",
    renderEvents
);

element("refresh-events")?.addEventListener(
    "click",
    loadEvents
);


// =====================================================
// CERTIFICATE MANAGEMENT
// =====================================================

let allCertificates = [];


// =====================================================
// LOAD CERTIFICATES
// =====================================================

async function loadCertificates() {

    clearMessage("certificates-message");

    const tbody = element("certificates-table-body");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10">Loading certificates...</td>
            </tr>
        `;
    }


    try {

        if (allEvents.length === 0) {
            await loadEvents();
        }


        const results = await Promise.all(

            allEvents.map(async event => {

                const data = await apiRequest(
                    `/certificates/events/${event.event_id}`
                );

                return (data.certificates || [])
                    .filter(cert => cert.certificate_id !== null)
                    .map(cert => ({

                        ...cert,

                        event_title: event.event_title,
                        event_id: event.event_id

                    }));

            })

        );


        allCertificates = results.flat();

        renderCertificates();

    } catch (error) {

        console.error("Load certificates error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10">Unable to load certificates.</td>
                </tr>
            `;
        }

        showMessage(
            "certificates-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// RENDER CERTIFICATES TABLE
// =====================================================

function renderCertificates() {

    const tbody = element("certificates-table-body");

    if (!tbody) return;


    const searchValue =
        (element("certificate-search")?.value || "")
            .trim()
            .toLowerCase();

    const statusValue =
        element("certificate-status-filter")?.value || "";


    const filteredCertificates = allCertificates.filter(cert => {

        const matchesSearch =

            String(cert.certificate_number || "")
                .toLowerCase()
                .includes(searchValue) ||

            String(cert.student_name || "")
                .toLowerCase()
                .includes(searchValue) ||

            String(cert.email || "")
                .toLowerCase()
                .includes(searchValue) ||

            String(cert.event_title || "")
                .toLowerCase()
                .includes(searchValue);


        const matchesStatus =
            statusValue === "" ||
            cert.certificate_status === statusValue;


        return matchesSearch && matchesStatus;
    });


    if (element("certificates-count")) {
        element("certificates-count").textContent =
            `${filteredCertificates.length} Certificates`;
    }


    if (filteredCertificates.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="10">No certificates found.</td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = filteredCertificates.map(cert => {

        const status = cert.certificate_status || "Active";

        const statusClass =
            status === "Active"
                ? "status-active"
                : status === "Revoked"
                    ? "status-inactive"
                    : "status-pending";


        const actionButton = `

            <button
                class="download-certificate-btn"
                data-certificate-id="${Number(cert.certificate_id)}"
                type="button"
            >
                Download
            </button>

            ${
                status !== "Revoked"
                    ? `
                        <button
                            class="revoke-certificate-btn"
                            data-certificate-id="${Number(cert.certificate_id)}"
                            type="button"
                        >
                            Revoke
                        </button>
                    `
                    : `<span>Revoked</span>`
            }

        `;


        return `
            <tr>

                <td>${escapeHTML(cert.certificate_number)}</td>

                <td>${escapeHTML(cert.student_name)}</td>

                <td>${escapeHTML(cert.email)}</td>

                <td>${escapeHTML(cert.event_title)}</td>

                <td>${escapeHTML(cert.attendance_status || "N/A")}</td>

                <td>
                    <span class="${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>${escapeHTML(formatDate(cert.issued_at))}</td>

                <td>${escapeHTML(formatDate(cert.revoked_at))}</td>

                <td>${escapeHTML(cert.revocation_reason || "N/A")}</td>

                <td>${actionButton}</td>

            </tr>
        `;

    }).join("");


    tbody.querySelectorAll(".download-certificate-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                downloadCertificate(
                    Number(button.dataset.certificateId)
                );

            });

        });


    tbody.querySelectorAll(".revoke-certificate-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                revokeCertificate(
                    Number(button.dataset.certificateId)
                );

            });

        });

}


// =====================================================
// REVOKE CERTIFICATE
// =====================================================

async function revokeCertificate(certificateId) {

    const reason = prompt(
        "Enter the reason for revoking this certificate:"
    );

    if (reason === null) return;

    if (!reason.trim()) {
        alert("Revocation reason is required.");
        return;
    }


    const confirmed = confirm(
        "Are you sure you want to revoke this certificate?"
    );

    if (!confirmed) return;


    try {

        await apiRequest(
            `/certificates/${certificateId}/revoke`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    reason: reason.trim()
                })
            }
        );


        await loadCertificates();


        showMessage(
            "certificates-message",
            "Certificate revoked successfully.",
            "success"
        );

    } catch (error) {

        console.error("Certificate revocation error:", error);

        showMessage(
            "certificates-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// DOWNLOAD CERTIFICATE
// =====================================================

async function downloadCertificate(certificateId) {

    try {

        const response = await fetch(
            `${API_BASE}/certificates/${certificateId}/download`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {

            const contentType =
                response.headers.get("content-type") || "";

            const data = contentType.includes("application/json")
                ? await response.json()
                : null;

            throw new Error(
                data?.message ||
                data?.error ||
                `Download failed with status ${response.status}`
            );
        }


        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = `Certificate_${certificateId}.pdf`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(url);

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
// CERTIFICATE FILTER EVENTS
// =====================================================

element("certificate-search")?.addEventListener(
    "input",
    renderCertificates
);

element("certificate-status-filter")?.addEventListener(
    "change",
    renderCertificates
);

element("refresh-certificates")?.addEventListener(
    "click",
    loadCertificates
);


// =====================================================
// FEEDBACK MANAGEMENT
// =====================================================

let allFeedback = [];


// =====================================================
// LOAD FEEDBACK
// =====================================================

async function loadFeedback() {

    clearMessage("feedback-message");

    const tbody = element("feedback-table-body");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">Loading feedback...</td>
            </tr>
        `;
    }


    try {

        const data = await apiRequest("/feedback/");

        allFeedback = data.feedback || [];

        updateFeedbackStats();

        renderFeedback();

    } catch (error) {

        console.error("Load feedback error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">Unable to load feedback.</td>
                </tr>
            `;
        }

        showMessage(
            "feedback-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// UPDATE FEEDBACK STATISTICS
// =====================================================

function updateFeedbackStats() {

    const total = allFeedback.length;

    const pending = allFeedback.filter(
        item => item.status === "Pending"
    ).length;

    const approved = allFeedback.filter(
        item => item.status === "Approved"
    ).length;

    const rejected = allFeedback.filter(
        item => item.status === "Rejected"
    ).length;


    if (element("total-feedback")) {
        element("total-feedback").textContent = total;
    }

    if (element("pending-feedback")) {
        element("pending-feedback").textContent = pending;
    }

    if (element("approved-feedback")) {
        element("approved-feedback").textContent = approved;
    }

    if (element("rejected-feedback")) {
        element("rejected-feedback").textContent = rejected;
    }
}


// =====================================================
// RENDER FEEDBACK TABLE
// =====================================================

function renderFeedback() {

    const tbody = element("feedback-table-body");

    if (!tbody) return;


    const searchValue =
        (element("feedback-search")?.value || "")
            .trim()
            .toLowerCase();

    const statusValue =
        element("feedback-status-filter")?.value || "all";


    const filteredFeedback = allFeedback.filter(item => {

        const studentName =
            item.student_name ||
            item.name ||
            item.full_name ||
            "";


        const matchesSearch =

            String(studentName)
                .toLowerCase()
                .includes(searchValue) ||

            String(item.email || "")
                .toLowerCase()
                .includes(searchValue) ||

            String(item.experience || "")
                .toLowerCase()
                .includes(searchValue);


        const matchesStatus =
            statusValue === "all" ||
            item.status === statusValue;


        return matchesSearch && matchesStatus;
    });


    if (element("feedback-count")) {
        element("feedback-count").textContent =
            `${filteredFeedback.length} Feedback`;
    }


    if (filteredFeedback.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8">No feedback found.</td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = filteredFeedback.map(item => {

        const studentName =
            item.student_name ||
            item.name ||
            item.full_name ||
            "Unknown Student";

        const status = item.status || "Pending";

        const statusClass =
            status === "Approved"
                ? "status-active"
                : status === "Rejected"
                    ? "status-inactive"
                    : "status-pending";


        const rating = Number(item.rating);

        const validRating =
            Number.isInteger(rating) &&
            rating >= 1 &&
            rating <= 5;

        const ratingDisplay = validRating
            ? "★".repeat(rating) + "☆".repeat(5 - rating)
            : "N/A";


        const actionButtons = status === "Pending"
            ? `
                <button
                    class="feedback-approve-btn"
                    data-feedback-id="${Number(item.feedback_id)}"
                    type="button"
                >
                    Approve
                </button>

                <button
                    class="feedback-reject-btn"
                    data-feedback-id="${Number(item.feedback_id)}"
                    type="button"
                >
                    Reject
                </button>
            `
            : `<span>${escapeHTML(status)}</span>`;


        return `
            <tr>

                <td>${escapeHTML(item.feedback_id)}</td>

                <td>${escapeHTML(studentName)}</td>

                <td>${escapeHTML(item.email || "N/A")}</td>

                <td>
                    <span class="feedback-rating">
                        ${ratingDisplay}
                    </span>
                    (${validRating ? rating : "N/A"})
                </td>

                <td class="feedback-experience">
                    ${escapeHTML(item.experience)}
                </td>

                <td>
                    ${escapeHTML(formatDate(item.created_at))}
                </td>

                <td>
                    <span class="${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>
                    ${actionButtons}
                </td>

            </tr>
        `;

    }).join("");


    tbody.querySelectorAll(".feedback-approve-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                updateFeedbackStatus(
                    Number(button.dataset.feedbackId),
                    "Approved"
                );

            });

        });


    tbody.querySelectorAll(".feedback-reject-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                updateFeedbackStatus(
                    Number(button.dataset.feedbackId),
                    "Rejected"
                );

            });

        });

}


// =====================================================
// APPROVE / REJECT FEEDBACK
// =====================================================

async function updateFeedbackStatus(feedbackId, newStatus) {

    const confirmed = confirm(
        `Are you sure you want to ${newStatus.toLowerCase()} this feedback?`
    );

    if (!confirmed) return;


    try {

        await apiRequest(
            `/feedback/${feedbackId}/status`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    status: newStatus
                })
            }
        );


        await loadFeedback();


        showMessage(
            "feedback-message",
            `Feedback ${newStatus.toLowerCase()} successfully.`,
            "success"
        );

    } catch (error) {

        console.error("Feedback status update error:", error);

        showMessage(
            "feedback-message",
            error.message,
            "error"
        );
    }
}


// =====================================================
// FEEDBACK FILTER EVENTS
// =====================================================

element("feedback-search")?.addEventListener(
    "input",
    renderFeedback
);

element("feedback-status-filter")?.addEventListener(
    "change",
    renderFeedback
);


element("refresh-feedback")?.addEventListener(
    "click",
    loadFeedback
);


// =====================================================
// INITIALIZE ADMIN DASHBOARD
// =====================================================

async function initializeDashboard() {

    loadAdminProfile();

    await Promise.all([

        loadDashboardStats(),

        loadUsers(),

        loadPendingOrganizers(),

        loadEvents(),

        loadFeedback()

    ]);

    await loadCertificates();
}


initializeDashboard();
