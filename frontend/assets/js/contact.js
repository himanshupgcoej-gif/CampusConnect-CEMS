
/* ========================================
   CEMS CONTACT PAGE JAVASCRIPT
======================================== */


/* 1. MOBILE NAVIGATION */

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

function closeMenu() {
    if (!menuToggle || !navLinks) return;

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
}

function openMenu() {
    if (!menuToggle || !navLinks) return;

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation menu");
    navLinks.classList.add("open");
    document.body.classList.add("menu-open");
}

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        const isOpen =
            menuToggle.getAttribute("aria-expanded") === "true";

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    document.addEventListener("click", event => {
        if (
            menuToggle.getAttribute("aria-expanded") === "true" &&
            !navLinks.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeMenu();
        }
    });
}


/* 2. FOOTER YEAR */

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


/* 3. CONTACT FORM ELEMENTS */

const contactForm = document.getElementById("contactForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const subjectInput = document.getElementById("subject");
const messageInput = document.getElementById("message");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const subjectError = document.getElementById("subjectError");
const messageError = document.getElementById("messageError");

const formFeedback = document.getElementById("formFeedback");
const charCount = document.getElementById("charCount");


/* 4. ERROR HELPERS */

function showFieldError(input, errorElement, message) {
    if (!input || !errorElement) return;

    errorElement.textContent = message;
    input.classList.toggle("invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearFieldError(input, errorElement) {
    showFieldError(input, errorElement, "");
}

function showFormFeedback(message, type) {
    if (!formFeedback) return;

    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.hidden = false;
}

function hideFormFeedback() {
    if (!formFeedback) return;

    formFeedback.hidden = true;
    formFeedback.textContent = "";
    formFeedback.className = "form-feedback";
}


/* 5. INDIVIDUAL FIELD VALIDATION */

function validateName() {
    const value = fullNameInput.value.trim();

    if (!value) {
        showFieldError(
            fullNameInput,
            nameError,
            "Please enter your name."
        );
        return false;
    }

    if (value.length < 2) {
        showFieldError(
            fullNameInput,
            nameError,
            "Name must contain at least 2 characters."
        );
        return false;
    }

    if (value.length > 80) {
        showFieldError(
            fullNameInput,
            nameError,
            "Name cannot exceed 80 characters."
        );
        return false;
    }

    if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(value)) {
        showFieldError(
            fullNameInput,
            nameError,
            "Please enter a valid name."
        );
        return false;
    }

    clearFieldError(fullNameInput, nameError);
    return true;
}


function validateEmail() {
    const value = emailInput.value.trim();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
        showFieldError(
            emailInput,
            emailError,
            "Please enter your email address."
        );
        return false;
    }

    if (value.length > 254 || !emailPattern.test(value)) {
        showFieldError(
            emailInput,
            emailError,
            "Please enter a valid email address."
        );
        return false;
    }

    clearFieldError(emailInput, emailError);
    return true;
}


function validateSubject() {
    if (!subjectInput.value) {
        showFieldError(
            subjectInput,
            subjectError,
            "Please select a subject."
        );
        return false;
    }

    clearFieldError(subjectInput, subjectError);
    return true;
}


function validateMessage() {
    const value = messageInput.value.trim();

    if (!value) {
        showFieldError(
            messageInput,
            messageError,
            "Please enter your message."
        );
        return false;
    }

    if (value.length < 10) {
        showFieldError(
            messageInput,
            messageError,
            "Message must contain at least 10 characters."
        );
        return false;
    }

    if (value.length > 2000) {
        showFieldError(
            messageInput,
            messageError,
            "Message cannot exceed 2000 characters."
        );
        return false;
    }

    clearFieldError(messageInput, messageError);
    return true;
}


/* 6. LIVE CHARACTER COUNTER */

if (messageInput && charCount) {
    const updateCharacterCount = () => {
        charCount.textContent = messageInput.value.length;
    };

    messageInput.addEventListener("input", () => {
        updateCharacterCount();
        hideFormFeedback();

        if (messageInput.classList.contains("invalid")) {
            validateMessage();
        }
    });

    updateCharacterCount();
}


/* 7. VALIDATE FIELDS AS THE USER TYPES */

if (fullNameInput) {
    fullNameInput.addEventListener("input", () => {
        hideFormFeedback();

        if (fullNameInput.classList.contains("invalid")) {
            validateName();
        }
    });

    fullNameInput.addEventListener("blur", () => {
        if (fullNameInput.value.trim()) {
            validateName();
        }
    });
}

if (emailInput) {
    emailInput.addEventListener("input", () => {
        hideFormFeedback();

        if (emailInput.classList.contains("invalid")) {
            validateEmail();
        }
    });

    emailInput.addEventListener("blur", () => {
        if (emailInput.value.trim()) {
            validateEmail();
        }
    });
}

if (subjectInput) {
    subjectInput.addEventListener("change", () => {
        hideFormFeedback();

        if (subjectInput.classList.contains("invalid")) {
            validateSubject();
        }
    });
}


/* 8. CONTACT FORM SUBMISSION */

if (contactForm) {
    contactForm.addEventListener("submit", event => {
        event.preventDefault();

        hideFormFeedback();

        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const isSubjectValid = validateSubject();
        const isMessageValid = validateMessage();

        const isFormValid =
            isNameValid &&
            isEmailValid &&
            isSubjectValid &&
            isMessageValid;

        if (!isFormValid) {
            showFormFeedback(
                "Please correct the highlighted fields and try again.",
                "error"
            );

            const firstInvalidField =
                contactForm.querySelector(".invalid");

            if (firstInvalidField) {
                firstInvalidField.focus();
            }

            return;
        }

        /*
          FRONTEND DEMO ONLY

          This validates the form but does not send or save
          the message. Connect a backend or form service later
          to deliver messages to the CEMS team.
        */

        showFormFeedback(
            "Validation successful! Your message is ready. " +
            "It has NOT been sent because this is a frontend-only demo.",
            "success"
        );
    });
}


/* 9. FAQ ACCORDION */

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    if (!question || !answer) return;

    question.addEventListener("click", () => {
        const isExpanded =
            question.getAttribute("aria-expanded") === "true";

        // Close the other FAQ answers
        faqItems.forEach(otherItem => {
            const otherQuestion =
                otherItem.querySelector(".faq-question");
            const otherAnswer =
                otherItem.querySelector(".faq-answer");

            if (otherQuestion && otherAnswer) {
                otherQuestion.setAttribute("aria-expanded", "false");
                otherAnswer.hidden = true;
            }
        });

        // Toggle the selected answer
        if (!isExpanded) {
            question.setAttribute("aria-expanded", "true");
            answer.hidden = false;
        }
    });
});


/* 10. SCROLL REVEAL ANIMATIONS */

const revealElements = document.querySelectorAll(".reveal");

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

if (
    prefersReducedMotion ||
    !("IntersectionObserver" in window)
) {
    revealElements.forEach(element => {
        element.classList.add("visible");
    });
} else {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -30px 0px"
        }
    );

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
}


/* 11. BACK TO TOP */

const backToTop = document.getElementById("backToTop");

if (backToTop) {
    backToTop.addEventListener("click", event => {
        event.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? "auto" : "smooth"
        });
    });
}
