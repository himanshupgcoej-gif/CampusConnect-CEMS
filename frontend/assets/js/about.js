
/* ========================================
   CEMS ABOUT PAGE JAVASCRIPT
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
        const isExpanded =
            menuToggle.getAttribute("aria-expanded") === "true";

        if (isExpanded) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close menu after clicking a navigation link
    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // Close menu using Escape key
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    // Close mobile menu when switching to desktop width
    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeMenu();
        }
    });
}


/* 2. UPDATE COPYRIGHT YEAR */

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


/* 3. SCROLL REVEAL ANIMATIONS */

const revealElements = document.querySelectorAll(".reveal");

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
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


/* 4. BACK TO TOP */

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


/* 5. CLOSE MENU IF USER CLICKS OUTSIDE IT */

document.addEventListener("click", event => {
    if (!menuToggle || !navLinks) return;

    const clickedInsideMenu = navLinks.contains(event.target);
    const clickedToggle = menuToggle.contains(event.target);

    if (
        menuToggle.getAttribute("aria-expanded") === "true" &&
        !clickedInsideMenu &&
        !clickedToggle
    ) {
        closeMenu();
    }
});
