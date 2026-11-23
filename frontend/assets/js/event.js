
/* =========================================
   CEMS - EVENTS PAGE JAVASCRIPT
========================================= */

"use strict";

/* ---------- SAMPLE EVENT DATA ---------- */
/* Replace these sample events with database data later. */

const events = [
    {
        id: 1,
        title: "CodeFest 2026",
        category: "technical",
        date: "2026-11-25",
        time: "10:00 AM onwards",
        venue: "Computer Department",
        organizer: "Computer Engineering",
        type: "offline",
        seats: 80,
        totalSeats: 100,
        status: "open",
        symbol: "</>",
        description: "Challenge your coding skills, solve programming problems, collaborate with other developers and compete for exciting prizes.",
        eligibility: "All interested students",
        fee: "Free"
    },
    {
        id: 2,
        title: "Rhythm & Beats",
        category: "cultural",
        date: "2026-11-28",
        time: "4:00 PM onwards",
        venue: "College Auditorium",
        organizer: "Cultural Committee",
        type: "offline",
        seats: 25,
        totalSeats: 150,
        status: "limited",
        symbol: "♫",
        description: "Celebrate music, dance and creativity with incredible campus performances, cultural showcases and unforgettable memories.",
        eligibility: "All students",
        fee: "Free"
    },
    {
        id: 3,
        title: "Champions League",
        category: "sports",
        date: "2026-12-02",
        time: "9:00 AM onwards",
        venue: "College Sports Ground",
        organizer: "Sports Committee",
        type: "offline",
        seats: 0,
        totalSeats: 64,
        status: "full",
        symbol: "⚽",
        description: "Bring your team spirit and compete in exciting campus sports tournaments. Team slots are currently full.",
        eligibility: "Registered student teams",
        fee: "Free"
    },
    {
        id: 4,
        title: "AI Innovation Workshop",
        category: "workshop",
        date: "2026-12-05",
        time: "11:00 AM onwards",
        venue: "Innovation Lab",
        organizer: "Innovation Cell",
        type: "offline",
        seats: 12,
        totalSeats: 60,
        status: "limited",
        symbol: "✦",
        description: "Explore artificial intelligence, understand practical applications and learn how emerging technologies solve real problems.",
        eligibility: "Beginners and enthusiasts",
        fee: "₹100"
    },
    {
        id: 5,
        title: "Startup & Innovation Summit",
        category: "seminar",
        date: "2026-12-09",
        time: "10:30 AM onwards",
        venue: "Seminar Hall",
        organizer: "Innovation Cell",
        type: "hybrid",
        seats: 110,
        totalSeats: 150,
        status: "open",
        symbol: "↗",
        description: "Learn from entrepreneurs, explore startup ideas and understand the journey from an innovative idea to a successful venture.",
        eligibility: "All students",
        fee: "Free"
    },
    {
        id: 6,
        title: "Web Development Bootcamp",
        category: "workshop",
        date: "2026-12-12",
        time: "9:30 AM onwards",
        venue: "Computer Lab 2",
        organizer: "Computer Engineering",
        type: "offline",
        seats: 35,
        totalSeats: 50,
        status: "open",
        symbol: "{ }",
        description: "Build your web development skills with hands-on HTML, CSS and JavaScript activities and practical mini-projects.",
        eligibility: "All engineering students",
        fee: "₹50"
    },
    {
        id: 7,
        title: "Guest Lecture: Future of AI",
        category: "seminar",
        date: "2026-12-15",
        time: "2:00 PM onwards",
        venue: "Main Auditorium",
        organizer: "Training and Placement",
        type: "online",
        seats: 200,
        totalSeats: 250,
        status: "open",
        symbol: "AI",
        description: "Discover emerging artificial intelligence careers, industry applications and the skills students should develop for the future.",
        eligibility: "All students",
        fee: "Free"
    },
    {
        id: 8,
        title: "Photography Exhibition",
        category: "other",
        date: "2026-12-18",
        time: "11:00 AM onwards",
        venue: "Central Hall",
        organizer: "Student Council",
        type: "offline",
        seats: 70,
        totalSeats: 100,
        status: "open",
        symbol: "◎",
        description: "Explore student photography, visual storytelling, creative perspectives and an exhibition of campus life.",
        eligibility: "All students",
        fee: "Free"
    },
    {
        id: 9,
        title: "Annual Sports Meet",
        category: "sports",
        date: "2026-12-20",
        time: "8:00 AM onwards",
        venue: "College Sports Ground",
        organizer: "Sports Committee",
        type: "offline",
        seats: 45,
        totalSeats: 120,
        status: "open",
        symbol: "🏆",
        description: "Take part in athletic competitions, team challenges and sporting activities that celebrate teamwork and fitness.",
        eligibility: "All students",
        fee: "Free"
    },
    {
        id: 10,
        title: "Campus Talent Night",
        category: "cultural",
        date: "2026-12-22",
        time: "5:00 PM onwards",
        venue: "College Auditorium",
        organizer: "Cultural Committee",
        type: "offline",
        seats: 0,
        totalSeats: 200,
        status: "closed",
        symbol: "★",
        description: "An evening of student talent, music, dance and creative performances. Registration for this sample event is closed.",
        eligibility: "All students",
        fee: "Free"
    },
    {
        id: 11,
        title: "Project Expo 2027",
        category: "technical",
        date: "2027-01-08",
        time: "10:00 AM onwards",
        venue: "Exhibition Centre",
        organizer: "Computer Engineering",
        type: "hybrid",
        seats: 90,
        totalSeats: 120,
        status: "open",
        symbol: "⌘",
        description: "Showcase innovative student projects, exchange ideas, demonstrate prototypes and discover solutions developed by fellow students.",
        eligibility: "All departments",
        fee: "Free"
    },
    {
        id: 12,
        title: "Career Guidance Session",
        category: "seminar",
        date: "2026-10-10",
        time: "11:00 AM onwards",
        venue: "Seminar Hall",
        organizer: "Training and Placement",
        type: "offline",
        seats: 0,
        totalSeats: 100,
        status: "closed",
        symbol: "↗",
        description: "A session covering career planning, interview preparation and professional development. This sample event has already taken place.",
        eligibility: "All students",
        fee: "Free"
    }
];

/* ---------- DOM REFERENCES ---------- */

const $ = (selector) => document.querySelector(selector);

const searchInput = $("#searchInput");
const clearSearch = $("#clearSearch");
const filtersPanel = $("#filtersPanel");
const filterToggle = $("#filterToggle");
const filterBadge = $("#filterBadge");

const dateFilter = $("#dateFilter");
const typeFilter = $("#typeFilter");
const availabilityFilter = $("#availabilityFilter");
const organizerFilter = $("#organizerFilter");
const fromDate = $("#fromDate");
const toDate = $("#toDate");
const sortFilter = $("#sortFilter");

const eventsGrid = $("#eventsGrid");
const savedGrid = $("#savedGrid");
const savedEmpty = $("#savedEmpty");
const savedCount = $("#savedCount");
const resultsCount = $("#resultsCount");
const activeFilters = $("#activeFilters");
const emptyState = $("#emptyState");
const loadMore = $("#loadMore");
const viewToggle = $("#viewToggle");
const toast = $("#toast");

const eventModal = $("#eventModal");
const modalVisual = $("#modalVisual");
const modalCategory = $("#modalCategory");
const modalTitle = $("#modalTitle");
const modalDescription = $("#modalDescription");
const modalDetails = $("#modalDetails");
const modalNotice = $("#modalNotice");
const modalSave = $("#modalSave");
const modalRegister = $("#modalRegister");

const categoryNames = {
    technical: "Technical",
    cultural: "Cultural",
    sports: "Sports",
    workshop: "Workshop",
    seminar: "Seminar",
    other: "Other"
};

const categorySymbols = {
    technical: "</>",
    cultural: "♫",
    sports: "⚽",
    workshop: "✦",
    seminar: "▤",
    other: "◈"
};

/* ---------- STATE ---------- */

let selectedCategory = "all";
let visibleLimit = 6;
let listView = false;
let currentModalId = null;
let lastFocusedElement = null;
let toastTimer;

function loadSavedIds() {
    try {
        const value = JSON.parse(
            localStorage.getItem("cemsSavedEvents") || "[]"
        );

        return Array.isArray(value)
            ? value.filter(id =>
                Number.isInteger(id) &&
                events.some(event => event.id === id)
            )
            : [];
    } catch {
        return [];
    }
}

let savedIds = loadSavedIds();

/* ---------- HELPERS ---------- */

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    return new Date(dateString + "T12:00:00").toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}

function formatShortDate(dateString) {
    const date = new Date(dateString + "T12:00:00");

    return {
        day: String(date.getDate()).padStart(2, "0"),
        month: date.toLocaleDateString("en-IN", {
            month: "short"
        }).toUpperCase()
    };
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getEventStatus(event) {
    if (event.status === "closed") {
        return {
            label: "Registration Closed",
            className: "status-closed"
        };
    }

    if (event.status === "full" || event.seats <= 0) {
        return {
            label: "Fully Booked",
            className: "status-full"
        };
    }

    if (event.seats <= 25 || event.status === "limited") {
        return {
            label: "Limited Seats",
            className: "status-limited"
        };
    }

    return {
        label: "Registration Open",
        className: "status-open"
    };
}

function getRegistrationAvailability(event) {
    if (event.status === "closed") return "closed";
    if (event.seats <= 0 || event.status === "full") return "full";

    if (event.seats <= 25 || event.status === "limited") {
        return "limited";
    }

    return "open";
}

function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

/* ---------- EVENT CARD TEMPLATE ---------- */

function createEventCard(event) {
    const date = formatShortDate(event.date);
    const status = getEventStatus(event);
    const isSaved = savedIds.includes(event.id);

    return `
        <article class="event-card">
            <div class="event-visual ${event.category}">
                <span class="event-category">
                    ${escapeHTML(categoryNames[event.category])}
                </span>

                <span class="event-symbol" aria-hidden="true">
                    ${escapeHTML(event.symbol || categorySymbols[event.category])}
                </span>

                <div class="event-date">
                    <strong>${date.day}</strong>
                    <span>${date.month}</span>
                </div>

                <button
                    type="button"
                    class="save-btn ${isSaved ? "saved" : ""}"
                    data-save="${event.id}"
                    aria-label="${isSaved ? "Remove saved event" : "Save event"}"
                    aria-pressed="${isSaved}"
                    title="${isSaved ? "Remove from saved events" : "Save event"}">
                    ${isSaved ? "♥" : "♡"}
                </button>
            </div>

            <div class="event-info">
                <p class="event-meta">
                    📍 ${escapeHTML(event.venue)}
                </p>

                <h3>${escapeHTML(event.title)}</h3>

                <p class="event-description">
                    ${escapeHTML(event.description)}
                </p>

                <p class="event-organizer">
                    ✦ Organized by ${escapeHTML(event.organizer)}
                </p>

                <span class="status-badge ${status.className}">
                    ${status.label}
                </span>

                <div class="event-bottom">
                    <span class="seats-text">
                        ${event.seats > 0
                            ? `${event.seats} seats remaining`
                            : "No seats available"}
                    </span>

                    <button type="button"
                            class="details-btn"
                            data-details="${event.id}">
                        View Details →
                    </button>
                </div>
            </div>
        </article>
    `;
}

/* ---------- FILTERING ---------- */

function matchesDateFilter(event) {
    const today = localDateString();
    const date = event.date;
    const selected = dateFilter.value;

    if (selected === "today") return date === today;

    if (selected === "week") {
        const lastDay = new Date();
        lastDay.setDate(lastDay.getDate() + 7);

        return date >= today && date <= localDateString(lastDay);
    }

    if (selected === "month") {
        const lastDay = new Date();
        lastDay.setDate(lastDay.getDate() + 30);

        return date >= today && date <= localDateString(lastDay);
    }

    if (selected === "future") return date >= today;
    if (selected === "past") return date < today;

    return true;
}

function matchesCustomDates(event) {
    if (fromDate.value && event.date < fromDate.value) {
        return false;
    }

    if (toDate.value && event.date > toDate.value) {
        return false;
    }

    return true;
}

function getFilteredEvents() {
    const query = searchInput.value.trim().toLowerCase();

    let filtered = events.filter(event => {
        const searchableText = [
            event.title,
            event.description,
            event.venue,
            event.organizer,
            event.category,
            categoryNames[event.category]
        ].join(" ").toLowerCase();

        const matchesSearch = !query ||
            searchableText.includes(query);

        const matchesCategory =
            selectedCategory === "all" ||
            event.category === selectedCategory;

        const matchesType =
            typeFilter.value === "all" ||
            event.type === typeFilter.value;

        const matchesAvailability =
            availabilityFilter.value === "all" ||
            getRegistrationAvailability(event) === availabilityFilter.value;

        const matchesOrganizer =
            organizerFilter.value === "all" ||
            event.organizer === organizerFilter.value;

        return matchesSearch &&
            matchesCategory &&
            matchesDateFilter(event) &&
            matchesCustomDates(event) &&
            matchesType &&
            matchesAvailability &&
            matchesOrganizer;
    });

    switch (sortFilter.value) {
        case "dateDesc":
            filtered.sort((a, b) => b.date.localeCompare(a.date));
            break;

        case "nameAsc":
            filtered.sort((a, b) => a.title.localeCompare(b.title));
            break;

        case "seats":
            filtered.sort((a, b) => b.seats - a.seats);
            break;

        default:
            filtered.sort((a, b) => a.date.localeCompare(b.date));
    }

    return filtered;
}

/* ---------- ACTIVE FILTER LABELS ---------- */

function updateActiveFilters() {
    const filters = [];

    if (searchInput.value.trim()) {
        filters.push({
            label: `Search: ${searchInput.value.trim()}`,
            clear: () => {
                searchInput.value = "";
            }
        });
    }

    if (selectedCategory !== "all") {
        filters.push({
            label: categoryNames[selectedCategory],
            clear: () => {
                selectedCategory = "all";
            }
        });
    }

    const selectFilters = [
        [dateFilter, "Date"],
        [typeFilter, "Type"],
        [availabilityFilter, "Registration"],
        [organizerFilter, "Organizer"]
    ];

    selectFilters.forEach(([element, label]) => {
        if (element.value !== "all") {
            filters.push({
                label: `${label}: ${
                    element.options[element.selectedIndex].text
                }`,
                clear: () => {
                    element.value = "all";
                }
            });
        }
    });

    if (fromDate.value) {
        filters.push({
            label: `From: ${fromDate.value}`,
            clear: () => {
                fromDate.value = "";
            }
        });
    }

    if (toDate.value) {
        filters.push({
            label: `To: ${toDate.value}`,
            clear: () => {
                toDate.value = "";
            }
        });
    }

    activeFilters.innerHTML = filters.map((filter, index) => `
        <span class="active-filter">
            ${escapeHTML(filter.label)}
            <button type="button" data-remove-filter="${index}"
                    aria-label="Remove ${escapeHTML(filter.label)}">
                ×
            </button>
        </span>
    `).join("");

    activeFilters.querySelectorAll("[data-remove-filter]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const filter = filters[Number(button.dataset.removeFilter)];

                if (filter) {
                    filter.clear();
                    renderEvents();
                }
            });
        });

    const activeCount = filters.length;

    filterBadge.textContent = activeCount;
    filterBadge.hidden = activeCount === 0;
    clearSearch.classList.toggle(
        "visible",
        searchInput.value.length > 0
    );
}

/* ---------- RENDER EVENT LIST ---------- */

function renderEvents() {
    const filtered = getFilteredEvents();

    const visibleEvents = filtered.slice(0, visibleLimit);

    eventsGrid.innerHTML = visibleEvents
        .map(createEventCard)
        .join("");

    eventsGrid.classList.toggle("list-view", listView);

    viewToggle.textContent = listView ? "▦" : "☷";
    viewToggle.title = listView ? "Switch to grid view" : "Switch to list view";
    viewToggle.setAttribute(
        "aria-label",
        listView ? "Switch to grid view" : "Switch to list view"
    );

    resultsCount.textContent =
        `Showing ${visibleEvents.length} of ${filtered.length} events`;

    emptyState.hidden = filtered.length !== 0;

    loadMore.hidden = visibleEvents.length >= filtered.length;
    loadMore.disabled = visibleEvents.length >= filtered.length;

    updateActiveFilters();
    renderSavedEvents();
}

/* ---------- SAVED EVENTS ---------- */

function persistSavedIds() {
    try {
        localStorage.setItem(
            "cemsSavedEvents",
            JSON.stringify(savedIds)
        );
        return true;
    } catch {
        showToast("Browser storage is unavailable.");
        return false;
    }
}

function toggleSavedEvent(id) {
    const wasSaved = savedIds.includes(id);

    if (wasSaved) {
        savedIds = savedIds.filter(savedId => savedId !== id);
    } else {
        savedIds.push(id);
    }

    if (!persistSavedIds()) {
        savedIds = loadSavedIds();
        return;
    }

    renderEvents();

    if (currentModalId === id) {
        updateModalSaveButton();
    }

    showToast(
        wasSaved ? "Event removed from saved events."
                 : "Event added to your saved events."
    );
}

function renderSavedEvents() {
    const savedEvents = savedIds
        .map(id => events.find(event => event.id === id))
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));

    savedCount.textContent = savedEvents.length;
    savedEmpty.hidden = savedEvents.length > 0;

    savedGrid.innerHTML = savedEvents
        .map(createEventCard)
        .join("");
}

/* ---------- EVENT DETAILS MODAL ---------- */

function openEventModal(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;

    currentModalId = id;
    lastFocusedElement = document.activeElement;

    modalVisual.className = `modal-visual ${event.category}`;
    modalVisual.innerHTML = `
        <span class="event-symbol" aria-hidden="true">
            ${escapeHTML(event.symbol || categorySymbols[event.category])}
        </span>
    `;

    modalCategory.textContent = categoryNames[event.category];
    modalTitle.textContent = event.title;
    modalDescription.textContent = event.description;

    const details = [
        ["Date", formatDate(event.date)],
        ["Time", event.time],
        ["Venue", event.venue],
        ["Organizer", event.organizer],
        ["Event type", event.type.toUpperCase()],
        ["Eligibility", event.eligibility],
        ["Entry fee", event.fee],
        ["Available seats", event.seats]
    ];

    modalDetails.innerHTML = details.map(([label, value]) => `
        <div class="detail-item">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(value)}</strong>
        </div>
    `).join("");

    const availability = getRegistrationAvailability(event);
    const isPast = event.date < localDateString();

    if (isPast) {
        modalNotice.textContent = "This event has already taken place.";
    } else if (availability === "closed") {
        modalNotice.textContent = "Registration for this event is closed.";
    } else if (availability === "full") {
        modalNotice.textContent = "All seats are currently booked.";
    } else {
        modalNotice.textContent =
            "Sign in to continue to the registration page.";
    }

    const canRegister =
        !isPast &&
        (availability === "open" || availability === "limited");

    modalRegister.hidden = !canRegister;
    modalRegister.href =
        `login.html?event=${encodeURIComponent(event.id)}`;

    updateModalSaveButton();

    eventModal.hidden = false;
    document.body.style.overflow = "hidden";
    $("#modalClose").focus();
}

function closeEventModal() {
    eventModal.hidden = true;
    document.body.style.overflow = "";

    currentModalId = null;

    if (lastFocusedElement &&
        typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
    }
}

function updateModalSaveButton() {
    if (currentModalId === null) return;

    const isSaved = savedIds.includes(currentModalId);

    modalSave.textContent = isSaved
        ? "♥ Saved Event"
        : "♡ Save Event";
}

/* ---------- CATEGORY URL SUPPORT ---------- */

function applyURLCategory() {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");

    if (requestedCategory &&
        Object.hasOwn(categoryNames, requestedCategory)) {
        selectedCategory = requestedCategory;
    }

    document.querySelectorAll(".category-chip").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.category === selectedCategory
        );
    });
}

/* ---------- FILTER RESET ---------- */

function resetFilters() {
    searchInput.value = "";
    selectedCategory = "all";

    dateFilter.value = "all";
    typeFilter.value = "all";
    availabilityFilter.value = "all";
    organizerFilter.value = "all";

    fromDate.value = "";
    toDate.value = "";
    sortFilter.value = "dateAsc";

    visibleLimit = 6;

    document.querySelectorAll(".category-chip").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.category === "all"
        );
    });

    renderEvents();
}

/* ---------- MOBILE NAVIGATION ---------- */

const menuToggle = $("#menuToggle");
const mobileMenu = $("#mobileMenu");
const menuOverlay = $("#menuOverlay");
const menuClose = $("#menuClose");

function openMenu() {
    mobileMenu.classList.add("open");
    menuOverlay.classList.add("open");
    document.body.classList.add("menu-open");

    mobileMenu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuClose.focus();
}

function closeMenu() {
    mobileMenu.classList.remove("open");
    menuOverlay.classList.remove("open");
    document.body.classList.remove("menu-open");

    mobileMenu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.focus();
}

menuToggle.addEventListener("click", openMenu);
menuClose.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

mobileMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        menuOverlay.classList.remove("open");
        document.body.classList.remove("menu-open");

        mobileMenu.setAttribute("aria-hidden", "true");
        menuToggle.setAttribute("aria-expanded", "false");
    });
});

/* ---------- EVENT LISTENERS ---------- */

searchInput.addEventListener("input", () => {
    visibleLimit = 6;
    renderEvents();
});

clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    renderEvents();
});

document.querySelectorAll(".category-chip").forEach(button => {
    button.addEventListener("click", () => {
        selectedCategory = button.dataset.category;
        visibleLimit = 6;

        document.querySelectorAll(".category-chip").forEach(chip => {
            chip.classList.toggle("active", chip === button);
        });

        renderEvents();
    });
});

[
    dateFilter,
    typeFilter,
    availabilityFilter,
    organizerFilter,
    fromDate,
    toDate,
    sortFilter
].forEach(element => {
    element.addEventListener("change", () => {
        visibleLimit = 6;
        renderEvents();
    });
});

filterToggle.addEventListener("click", () => {
    filtersPanel.hidden = !filtersPanel.hidden;

    filterToggle.setAttribute(
        "aria-expanded",
        String(!filtersPanel.hidden)
    );
});

$("#resetFilters").addEventListener("click", resetFilters);
$("#emptyReset").addEventListener("click", resetFilters);

loadMore.addEventListener("click", () => {
    visibleLimit += 6;
    renderEvents();
});

viewToggle.addEventListener("click", () => {
    listView = !listView;
    renderEvents();
});

/* Event delegation supports dynamically created cards. */

document.addEventListener("click", event => {
    const saveButton = event.target.closest("[data-save]");
    const detailsButton = event.target.closest("[data-details]");

    if (saveButton) {
        toggleSavedEvent(Number(saveButton.dataset.save));
        return;
    }

    if (detailsButton) {
        openEventModal(Number(detailsButton.dataset.details));
    }
});

savedGrid.addEventListener("click", event => {
    const detailsButton = event.target.closest("[data-details]");

    if (detailsButton) {
        openEventModal(Number(detailsButton.dataset.details));
    }
});

$("#modalClose").addEventListener("click", closeEventModal);

eventModal.addEventListener("click", event => {
    if (event.target === eventModal) {
        closeEventModal();
    }
});

modalSave.addEventListener("click", () => {
    if (currentModalId !== null) {
        toggleSavedEvent(currentModalId);
    }
});

document.querySelectorAll("[data-footer-category]").forEach(link => {
    link.addEventListener("click", () => {
        selectedCategory = link.dataset.footerCategory;

        document.querySelectorAll(".category-chip").forEach(chip => {
            chip.classList.toggle(
                "active",
                chip.dataset.category === selectedCategory
            );
        });

        visibleLimit = 6;
        renderEvents();
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (!eventModal.hidden) {
            closeEventModal();
        } else if (mobileMenu.classList.contains("open")) {
            closeMenu();
        }
    }
});

/* ---------- INITIALIZE PAGE ---------- */

function initializePage() {
    $("#footerYear").textContent = new Date().getFullYear();

    const today = localDateString();

    fromDate.min = today;
    toDate.min = today;

    fromDate.addEventListener("change", () => {
        toDate.min = fromDate.value || today;

        if (toDate.value && toDate.value < fromDate.value) {
            toDate.value = fromDate.value;
        }
    });

    toDate.addEventListener("change", () => {
        fromDate.max = toDate.value || "";
    });

    applyURLCategory();

    $("#totalEvents").textContent = events.length;

    $("#upcomingCount").textContent = events.filter(
        event => event.date >= today
    ).length;

    renderEvents();
}

initializePage();
