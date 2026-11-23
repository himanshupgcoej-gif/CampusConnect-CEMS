
/* =========================
   1. GET HTML ELEMENTS
========================= */

const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const menuOverlay = document.getElementById("menuOverlay");
const menuClose = document.getElementById("menuClose");


/* =========================
   2. OPEN NAVIGATION MENU
========================= */

function openMenu() {
    if (!mobileMenu || !menuOverlay || !menuToggle) return;

    mobileMenu.classList.add("open");
    menuOverlay.classList.add("visible");
    menuToggle.classList.add("active");

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation menu");

    mobileMenu.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}


/* =========================
   3. CLOSE NAVIGATION MENU
========================= */

function closeMenu() {
    if (!mobileMenu || !menuOverlay || !menuToggle) return;

    mobileMenu.classList.remove("open");
    menuOverlay.classList.remove("visible");
    menuToggle.classList.remove("active");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");

    mobileMenu.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
}


/* =========================
   4. HAMBURGER BUTTON
========================= */

if (menuToggle) {
    menuToggle.addEventListener("click", function () {

        if (mobileMenu && mobileMenu.classList.contains("open")) {
            closeMenu();
        } else {
            openMenu();
        }

    });
}


/* =========================
   5. CLOSE BUTTON
========================= */

if (menuClose) {
    menuClose.addEventListener("click", closeMenu);
}


/* =========================
   6. CLICK OUTSIDE MENU
========================= */

if (menuOverlay) {
    menuOverlay.addEventListener("click", closeMenu);
}


/* =========================
   7. CLOSE USING ESCAPE
========================= */

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        closeMenu();
    }

});


/* =========================
   8. CLOSE AFTER NAVIGATION
========================= */

if (mobileMenu) {
    mobileMenu
        .querySelectorAll(".menu-links a, .account-links a, .menu-cta")
        .forEach(function (link) {

            link.addEventListener("click", closeMenu);

        });
}


/* =========================================
   9. UPCOMING EVENTS FUNCTIONALITY
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const section = document.querySelector("#upcoming-events");

    if (!section) return;

    const filterButtons = section.querySelectorAll(".filter-btn");
    const eventCards = section.querySelectorAll(".event-card");
    const noEventsMessage = section.querySelector(".no-events");

    // Category filtering
    filterButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const selectedCategory = button.dataset.filter;

            filterButtons.forEach((filterButton) => {

                const isActive = filterButton === button;

                filterButton.classList.toggle("active", isActive);

                filterButton.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );

            });

            let visibleCount = 0;

            eventCards.forEach((card) => {

                const matchesCategory =
                    selectedCategory === "all" ||
                    card.dataset.category === selectedCategory;

                card.hidden = !matchesCategory;

                if (matchesCategory) visibleCount++;

            });

            if (noEventsMessage) {
                noEventsMessage.hidden = visibleCount !== 0;
            }

        });

    });


    // Expand or collapse event details
    section.querySelectorAll(".details-btn").forEach((button) => {

        button.addEventListener("click", () => {

            const card = button.closest(".event-card");
            const details = card.querySelector(".event-extra");
            const label = button.querySelector(".details-label");

            const isExpanded =
                button.getAttribute("aria-expanded") === "true";

            details.hidden = isExpanded;

            button.setAttribute(
                "aria-expanded",
                String(!isExpanded)
            );

            label.textContent = isExpanded
                ? "View Details"
                : "Hide Details";

        });

    });

});


/* =========================================
   10. EVENT CATEGORIES SECTION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const categoryCards = document.querySelectorAll(
        "#event-categories .category-card"
    );

    categoryCards.forEach((card) => {

        card.addEventListener("click", () => {

            const category = card.dataset.category;

            console.log("Selected event category:", category);

        });

    });

});


/* =========================================
   11. LIVE STUDENT TESTIMONIALS
   Fetch approved feedback from Flask API
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = window.CEMS_API_BASE_URL;

    const avatar = document.getElementById("student-avatar");
    const name = document.getElementById("student-name");
    const course = document.getElementById("student-course");
    const stars = document.getElementById("testimonial-stars");
    const feedback = document.getElementById("testimonial-text");
    const eventName = document.getElementById("testimonial-event-name");
    const card = document.getElementById("testimonial-card");
    const dotsContainer = document.getElementById("testimonial-dots");
    const counter = document.getElementById("testimonial-counter");
    const previousButton = document.getElementById("testimonial-prev");
    const nextButton = document.getElementById("testimonial-next");

    // Stop if testimonial section is not present.
    if (
        !avatar ||
        !name ||
        !course ||
        !stars ||
        !feedback ||
        !eventName ||
        !card ||
        !dotsContainer ||
        !counter ||
        !previousButton ||
        !nextButton
    ) {
        return;
    }

    let testimonials = [];
    let currentIndex = 0;


    // Generate initials from student name.
    function getInitials(studentName) {

        return String(studentName || "Student")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join("");

    }


    // Show a testimonial.
    function showTestimonial(index) {

        if (testimonials.length === 0) return;

        currentIndex =
            (index + testimonials.length) % testimonials.length;

        const student = testimonials[currentIndex];

        avatar.textContent = getInitials(student.student_name);

        name.textContent = student.student_name;

        course.textContent = "CampusConnect Student";

        stars.textContent =
            "★".repeat(student.rating) +
            "☆".repeat(5 - student.rating);

        stars.setAttribute(
            "aria-label",
            `${student.rating} out of 5 stars`
        );

        feedback.textContent = student.experience;

        eventName.textContent = "Student Experience";

        counter.textContent =
            `${currentIndex + 1} / ${testimonials.length}`;

        // Update navigation dots.
        const dots = dotsContainer.querySelectorAll(".testimonial-dot");

        dots.forEach((dot, dotIndex) => {

            const isActive = dotIndex === currentIndex;

            dot.classList.toggle("active", isActive);

            if (isActive) {
                dot.setAttribute("aria-current", "true");
            } else {
                dot.removeAttribute("aria-current");
            }

        });

        // Replay card entrance animation.
        card.style.animation = "none";

        void card.offsetWidth;

        card.style.animation = "";

    }


    // Create navigation dots.
    function createTestimonialDots() {

        dotsContainer.replaceChildren();

        testimonials.forEach((student, index) => {

            const dot = document.createElement("button");

            dot.type = "button";
            dot.className = "testimonial-dot";

            dot.setAttribute(
                "aria-label",
                `Show testimonial ${index + 1}: ${student.student_name}`
            );

            dot.addEventListener("click", () => {
                showTestimonial(index);
            });

            dotsContainer.appendChild(dot);

        });

    }


    // Show message when no approved testimonials exist.
    function showEmptyTestimonials() {

        avatar.textContent = "CC";
        name.textContent = "Be the First to Share";
        course.textContent = "Your experience matters";

        stars.textContent = "☆☆☆☆☆";
        stars.setAttribute("aria-label", "No ratings yet");

        feedback.textContent =
            "No approved student experiences are available yet. Share your experience and inspire others!";

        eventName.textContent = "Student Experiences";

        counter.textContent = "0 / 0";

        dotsContainer.replaceChildren();

        previousButton.disabled = true;
        nextButton.disabled = true;

    }


    // Fetch approved testimonials from backend.
    async function loadTestimonials() {

        try {

            const response = await fetch(
                `${API_BASE}/feedback/approved`
            );

            if (!response.ok) {
                throw new Error("Unable to load student testimonials.");
            }

            const result = await response.json();

            if (!result.success || !Array.isArray(result.testimonials)) {
                throw new Error("Invalid testimonials response.");
            }

            // Use only valid approved testimonial data.
            testimonials = result.testimonials.filter(student => {

                return (
                    typeof student.student_name === "string" &&
                    typeof student.experience === "string" &&
                    Number.isInteger(student.rating) &&
                    student.rating >= 1 &&
                    student.rating <= 5
                );

            });

            if (testimonials.length === 0) {

                showEmptyTestimonials();

                return;

            }

            previousButton.disabled = false;
            nextButton.disabled = false;

            createTestimonialDots();

            showTestimonial(0);

        } catch (error) {

            console.error("Testimonial loading error:", error);

            avatar.textContent = "CC";
            name.textContent = "Student Experiences";
            course.textContent = "CampusConnect";

            stars.textContent = "☆☆☆☆☆";
            stars.setAttribute("aria-label", "Testimonials unavailable");

            feedback.textContent =
                "Student experiences are temporarily unavailable. Please try again later.";

            eventName.textContent = "CampusConnect";

            counter.textContent = "—";

            dotsContainer.replaceChildren();

            previousButton.disabled = true;
            nextButton.disabled = true;

        }

    }


    // Previous testimonial.
    previousButton.addEventListener("click", () => {

        showTestimonial(currentIndex - 1);

    });


    // Next testimonial.
    nextButton.addEventListener("click", () => {

        showTestimonial(currentIndex + 1);

    });


    // Load testimonials when homepage opens.
    loadTestimonials();

});


/* =========================================
   12. WEBSITE FOOTER JAVASCRIPT
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    // Automatically update copyright year.
    const footerYear = document.getElementById("footer-year");

    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }


    // Back-to-top button.
    const backToTopButton = document.getElementById("back-to-top");

    if (backToTopButton) {

        backToTopButton.addEventListener("click", () => {

            const prefersReducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? "auto" : "smooth"
            });

        });

    }

});


/* =========================================
   13. STUDENT ACCOUNT / LOGIN STATUS
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const mobileMenu = document.getElementById("mobileMenu");

    if (!mobileMenu) return;

    // Read saved authentication details.
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

        console.error("Invalid saved user data:", error);

    }

    const accountLinks = mobileMenu.querySelector(".account-links");

    // Use existing account-links section, or create one.
    const accountSection = accountLinks || document.createElement("div");

    if (!accountLinks) {

        accountSection.className = "account-links";

        mobileMenu.appendChild(accountSection);

    }

    // Preserve existing Login page URL.
    const existingLoginLink = accountSection.querySelector("a");

    const loginURL = existingLoginLink
        ? existingLoginLink.getAttribute("href")
        : "login.html";

    accountSection.replaceChildren();

    if (token && user) {

        // Student's name.
        const welcome = document.createElement("p");

        welcome.className = "account-welcome";

        welcome.textContent =
            `Welcome, ${user.full_name || "Student"}!`;

        accountSection.appendChild(welcome);


        // My Certificates link (students only).
        if ((user.role || "").toLowerCase() === "student") {

            const certificatesLink = document.createElement("a");

            certificatesLink.href = "my-certificates.html";
            certificatesLink.textContent = "My Certificates";
            certificatesLink.className = "menu-cta";

            accountSection.appendChild(certificatesLink);

        }


        // Logout button.
        const logoutButton = document.createElement("button");

        logoutButton.type = "button";
        logoutButton.className = "menu-cta";
        logoutButton.textContent = "Logout";

        logoutButton.addEventListener("click", () => {

            localStorage.removeItem("cemsToken");
            localStorage.removeItem("cemsUser");

            sessionStorage.removeItem("cemsToken");
            sessionStorage.removeItem("cemsUser");

            window.location.reload();

        });

        accountSection.appendChild(logoutButton);

    } else {

        // Login link for visitors.
        const loginLink = document.createElement("a");

        loginLink.href = loginURL;
        loginLink.textContent = "Login";
        loginLink.className = "menu-cta";

        accountSection.appendChild(loginLink);

    }

});
