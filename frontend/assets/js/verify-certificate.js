
const API_BASE = window.CEMS_API_BASE_URL;

const resultBox = document.getElementById("verification-result");
const detailsBox = document.getElementById("certificate-details");

function showStatus(type, icon, heading, message) {
    resultBox.className = "status " + type;
    resultBox.replaceChildren();

    const iconElement = document.createElement("div");
    iconElement.className = "status-icon";
    iconElement.textContent = icon;

    const headingElement = document.createElement("h3");
    headingElement.textContent = heading;

    const messageElement = document.createElement("p");
    messageElement.textContent = message;

    resultBox.append(
        iconElement,
        headingElement,
        messageElement
    );
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function setText(id, value) {
    document.getElementById(id).textContent =
        value || "Not available";
}

async function verifyCertificate() {
    const params = new URLSearchParams(window.location.search);
    const certificateNumber = params.get("certificate");

    if (!certificateNumber || !certificateNumber.trim()) {
        showStatus(
            "not-found",
            "!",
            "Certificate Number Missing",
            "No certificate number was provided in the verification link."
        );
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/certificates/verify/${encodeURIComponent(certificateNumber)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            showStatus(
                "error",
                "!",
                "Verification Failed",
                data.message || "The verification server could not process this request."
            );
            return;
        }

        if (!data.verified || !data.certificate) {
            showStatus(
                "not-found",
                "✕",
                "Certificate Not Found",
                "No certificate matching this number exists in our records."
            );
            return;
        }

        const cert = data.certificate;

        const statusConfig = {
            "Active": {
                type: "active",
                icon: "✓",
                heading: "Certificate Verified",
                message: "This certificate exists in the official records and is currently active."
            },

            "Under Review": {
                type: "under-review",
                icon: "⚠",
                heading: "Certificate Under Review",
                message: "This certificate exists, but its validity is currently under review."
            },

            "Revoked": {
                type: "revoked",
                icon: "✕",
                heading: "Certificate Revoked",
                message: "This certificate has been revoked and is no longer valid."
            }
        };

        const config = statusConfig[cert.status];

        if (config) {
            showStatus(
                config.type,
                config.icon,
                config.heading,
                config.message
            );
        } else {
            showStatus(
                "not-found",
                "!",
                "Unknown Certificate Status",
                "The certificate was found, but its status is not recognized."
            );
        }

        setText("certificate-number", cert.certificate_number);
        setText("certificate-status", cert.status);
        setText("student-name", cert.student_name);
        setText("event-title", cert.event_title);
        setText("venue", cert.venue);
        setText("event-date", formatDate(cert.event_date));
        setText("issued-at", formatDate(cert.issued_at));

        detailsBox.style.display = "block";

    } catch (error) {
        console.error("Certificate Verification Error:", error);

        showStatus(
            "error",
            "!",
            "Server Connection Failed",
            "Unable to connect to the verification server. Please try again later."
        );
    }
}

verifyCertificate();
