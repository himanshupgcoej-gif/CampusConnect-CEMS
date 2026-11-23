
// =====================================================
// CAMPUSCONNECT - STUDENT FEEDBACK
// =====================================================

const API_BASE = window.CEMS_API_BASE_URL;


// =====================================================
// AUTHENTICATION CHECK
// =====================================================

function getStoredValue(key) {
    return localStorage.getItem(key) ||
           sessionStorage.getItem(key);
}


function checkStudentLogin() {

    const token = getStoredValue("cemsToken");
    const userData = getStoredValue("cemsUser");

    if (!token || !userData) {
        alert("Please login as a Student to share your experience.");
        window.location.href = "login.html";
        return false;
    }

    try {
        const user = JSON.parse(userData);

        if (user.role !== "Student") {
            alert("Only Students can submit feedback.");
            window.location.href = "index.html";
            return false;
        }

    } catch (error) {
        alert("Please login again to continue.");
        window.location.href = "login.html";
        return false;
    }

    return true;
}


// =====================================================
// DOM ELEMENTS
// =====================================================

const feedbackForm = document.getElementById("feedback-form");
const ratingInput = document.getElementById("feedback-rating");
const experienceInput = document.getElementById("feedback-experience");
const feedbackMessage = document.getElementById("feedback-message");
const submitButton = document.getElementById("feedback-submit-btn");


// =====================================================
// DISPLAY MESSAGE
// =====================================================

function showFeedbackMessage(message, type) {

    feedbackMessage.textContent = message;
    feedbackMessage.className = "feedback-message " + type;
}


// =====================================================
// SUBMIT FEEDBACK
// =====================================================

feedbackForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (!checkStudentLogin()) {
        return;
    }

    const rating = Number(ratingInput.value);
    const experience = experienceInput.value.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        showFeedbackMessage("Please select a valid rating.", "error");
        return;
    }

    if (experience.length < 10) {
        showFeedbackMessage(
            "Experience must contain at least 10 characters.",
            "error"
        );
        return;
    }

    const token = getStoredValue("cemsToken");

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    feedbackMessage.className = "feedback-message";

    try {

        const response = await fetch(`${API_BASE}/feedback/`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({
                rating: rating,
                experience: experience
            })

        });

        const result = await response.json();

        if (response.status === 401) {
            alert("Your session has expired. Please login again.");
            window.location.href = "login.html";
            return;
        }

        if (response.status === 403) {
            showFeedbackMessage(
                "Only Students are allowed to submit feedback.",
                "error"
            );
            return;
        }

        if (!response.ok) {
            throw new Error(result.message || "Unable to submit feedback.");
        }

        showFeedbackMessage(
            "Thank you! Your feedback has been submitted successfully and is awaiting Admin approval.",
            "success"
        );

        feedbackForm.reset();

    } catch (error) {

        showFeedbackMessage(
            error.message || "Something went wrong. Please try again.",
            "error"
        );

    } finally {

        submitButton.disabled = false;
        submitButton.textContent = "Submit Feedback →";

    }

});


// =====================================================
// INITIALIZE
// =====================================================

checkStudentLogin();
