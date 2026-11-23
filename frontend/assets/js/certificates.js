
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = window.CEMS_API_BASE_URL;
    const LOGIN_URL = "login.html"; // Change if your login page has another filename.

    const certificateList = document.getElementById("certificate-list");
    const certificateCount = document.getElementById("certificate-count");
    const loadingState = document.getElementById("loading-state");
    const emptyState = document.getElementById("empty-state");
    const pageMessage = document.getElementById("page-message");
    const refreshBtn = document.getElementById("refresh-btn");
    const logoutBtn = document.getElementById("logout-btn");

    document.getElementById("current-year").textContent =
        new Date().getFullYear();

    // Read authentication data from either storage location.
    function getAuthData() {
        const token =
            localStorage.getItem("cemsToken") ||
            sessionStorage.getItem("cemsToken");

        const userData =
            localStorage.getItem("cemsUser") ||
            sessionStorage.getItem("cemsUser");

        let user = null;

        try {
            user = userData ? JSON.parse(userData) : null;
        } catch {
            user = null;
        }

        return { token, user };
    }

    const auth = getAuthData();

    if (!auth.token) {
        window.location.href = LOGIN_URL;
        return;
    }

    // This page is intended for students only.
    if (
        auth.user &&
        auth.user.role &&
        auth.user.role.toLowerCase() !== "student"
    ) {
        showMessage(
            "This page is available only to student accounts.",
            "error"
        );

        loadingState.hidden = true;
        return;
    }

    function showMessage(message, type = "success") {
        pageMessage.textContent = message;
        pageMessage.className = `page-message ${type}`;
        pageMessage.hidden = false;
    }

    function hideMessage() {
        pageMessage.textContent = "";
        pageMessage.hidden = true;
    }

    function formatDate(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Not available";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function createDetail(label, value) {
        const row = document.createElement("div");
        row.className = "detail-row";

        const labelElement = document.createElement("span");
        labelElement.className = "detail-label";
        labelElement.textContent = label;

        const valueElement = document.createElement("span");
        valueElement.className = "detail-value";
        valueElement.textContent = value || "Not available";

        row.append(labelElement, valueElement);
        return row;
    }

    function createCertificateCard(certificate) {
        const card = document.createElement("article");
        card.className = "certificate-card";

        const top = document.createElement("div");
        top.className = "card-top";

        const tag = document.createElement("span");
        tag.className = "certificate-tag";
        tag.textContent = "✓ Certificate Issued";

        top.appendChild(tag);

        const title = document.createElement("h3");
        title.textContent =
            certificate.event?.event_title || "Event Certificate";

        const details = document.createElement("div");
        details.className = "certificate-details";

        details.append(
            createDetail("Venue", certificate.event?.venue),
            createDetail(
                "Event Date",
                formatDate(certificate.event?.start_at)
            ),
            createDetail(
                "Certificate Number",
                certificate.certificate_number
            ),
            createDetail(
                "Issue Date",
                formatDate(certificate.issued_at)
            )
        );

        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "download-btn";
        downloadButton.textContent = "⬇ Download Certificate (PDF)";

        downloadButton.addEventListener("click", () => {
            downloadCertificate(certificate.certificate_id, downloadButton);
        });

        card.append(top, title, details, downloadButton);

        return card;
    }

    async function loadCertificates() {
        hideMessage();

        loadingState.hidden = false;
        emptyState.hidden = true;
        certificateList.replaceChildren();

        refreshBtn.disabled = true;

        try {
            const response = await fetch(
                `${API_BASE_URL}/certificates/my`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${auth.token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                throw new Error("Your session has expired. Please log in again.");
            }

            if (response.status === 403) {
                throw new Error(
                    data.message || "You do not have permission to view certificates."
                );
            }

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message || "Unable to load certificates."
                );
            }

            const certificates = Array.isArray(data.certificates)
                ? data.certificates
                : [];

            certificateCount.textContent = certificates.length;

            if (certificates.length === 0) {
                emptyState.hidden = false;
                return;
            }

            certificates.forEach((certificate) => {
                certificateList.appendChild(
                    createCertificateCard(certificate)
                );
            });

        } catch (error) {
            showMessage(error.message, "error");

            if (error.message.includes("session has expired")) {
                setTimeout(() => {
                    window.location.href = LOGIN_URL;
                }, 1500);
            }

        } finally {
            loadingState.hidden = true;
            refreshBtn.disabled = false;
        }
    }

    async function downloadCertificate(certificateId, button) {
        hideMessage();

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Preparing PDF...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/certificates/${certificateId}/download`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${auth.token}`
                    }
                }
            );

            if (response.status === 401) {
                throw new Error("Your session has expired. Please log in again.");
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || "Certificate download failed."
                );
            }

            const contentType = response.headers.get("content-type") || "";

            if (!contentType.includes("application/pdf")) {
                throw new Error("The server did not return a PDF file.");
            }

            const blob = await response.blob();
            const fileURL = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = fileURL;
            link.download = `CEMS-Certificate-${certificateId}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(fileURL), 1000);

            showMessage("Certificate downloaded successfully.", "success");

        } catch (error) {
            showMessage(error.message, "error");

            if (error.message.includes("session has expired")) {
                setTimeout(() => {
                    window.location.href = LOGIN_URL;
                }, 1500);
            }

        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    refreshBtn.addEventListener("click", loadCertificates);

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("cemsToken");
        localStorage.removeItem("cemsUser");

        sessionStorage.removeItem("cemsToken");
        sessionStorage.removeItem("cemsUser");

        window.location.href = LOGIN_URL;
    });

    loadCertificates();
});
