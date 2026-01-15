/**
 * AL-IHSAN Academy - Core Logic
 * Handles Data (LocalStorage), Animations, and UI Interactions
 */

// --- DATA LAYER ---
const DEFAULT_DATA = {
    // --- GLOBAL SETTINGS ---
    contact: {
        address: "Al-Ihsan Academy, United Kingdom",
        phone: "+44 7783 063060",
        whatsapp: "+44 7783 063060",
        email: "academy@alihsan.co.uk"
    },
    socials: {
        facebook: "#",
        instagram: "#",
        youtube: "#"
    },
    // --- PAGES ---
    hero: {
        title: "Welcome to AL-IHSAN Academy",
        subtitle: 'Building a Generation for Tomorrow',
        image: "hero-bg.jpg",
        ctaText: "Read More",
        ctaLink: "#about"
    },
    about: {
        title: "About Us",
        content: `
            <div class="about-desc-box">
                <h3 style="margin-bottom:20px; color:var(--col-primary-dark);">A Legacy of Knowledge</h3>
                <p>AL-IHSAN Academy is an initiative of AL-IHSAN Organisation, established for the public benefit to support social inclusion among people living in the UK, especially the Keralite community. The organisation works to promote Islamic values, education, and Keralite culture and heritage, fostering harmony and community wellbeing through gatherings, celebrations of special occasions such as Eid and Ramadan, charitable support for the needy, and compassionate moral and pastoral care.</p>
                
                <p style="margin-top: 15px;">AL-IHSAN Academy focuses on moral and Islamic education for South Indian Muslim children across the UK and Europe. Through structured, virtual learning, the Academy offers <strong style="color: var(--col-primary);">Online Madrasa Education, Qur'an and Thajweed Classes, and Malayalam Language Classes</strong> delivered by expert teachers-making quality education accessible while nurturing strong Islamic values and cultural identity.</p>
            </div>

            <h4 style="margin: 25px 0 15px; color: var(--col-gold);">Our Features</h4>
            <ul style="list-style: none; padding: 0; display: grid; grid-template-columns: 1fr; gap: 10px;">
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Islamic Moral classes for children across UK & Europe in online</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> One Islamic teacher for one student</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Flexible schedules to match your days/weeks</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Minimum 3 classes per week</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Additional group sessions on Islamic events & topics</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Regular class assessments</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Annual centralised exam in different locations in UK</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Special Quran and Thajweed classes</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Male and female teachers to meet your child requirements</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Quizzes & Qur'an competitions for students</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Classes in Arabic, Malayalam and English medium</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Malayalam language sessions on demand</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Classes from year 1 to Year 10 in structured curriculum</li>
                <li style="display:flex; gap:10px;"><span style="color:var(--col-primary);">✓</span> Quran Hifz courses on a shared accountability model</li>
            </ul>
        `,
        image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1000&auto=format&fit=crop"
    },
    stats: {
        students: 300,
        teachers: 45,
        alumni: 500,
        families: 1000
    },
    events: [
        {
            id: 1,
            title: "Admission Open Day 2026",
            date: "June 15, 2026",
            time: "10:00 AM - 4:00 PM",
            description: "Join us for our annual open day! Meet our teachers, tour our facilities, and learn about our curriculum.",
            image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
            location: "Main Campus, UK",
            isNew: true,
            isVisible: true,
            order: 1,
            link: "#contact"
        },
        {
            id: 2,
            title: "Islamic Arts & Culture Festival",
            date: "July 20, 2026",
            time: "2:00 PM - 8:00 PM",
            description: "Celebrate Islamic heritage through art, calligraphy, and cultural performances.",
            image: "https://images.unsplash.com/photo-1582662055627-2c96c4832e18?w=800&q=80",
            location: "Community Hall",
            isNew: false,
            isVisible: true,
            order: 2,
            link: "#contact"
        },
        {
            id: 3,
            title: "Quran Recitation Competition",
            date: "August 5, 2026",
            time: "3:00 PM - 6:00 PM",
            description: "Annual Quran recitation competition for students of all ages. Prizes for winners!",
            image: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&q=80",
            location: "Online & In-Person",
            isNew: true,
            isVisible: true,
            order: 3,
            link: "#contact"
        }
    ],
    activities: [
        { title: "Annual Sports Day", date: "Jan 15, 2026", desc: "Celebrating physical fitness and teamwork.", img: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&q=80&w=500" },
        { title: "Quran Recitation", date: "Feb 10, 2026", desc: "Annual inter-class competition.", img: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=500" },
        { title: "Science Fair", date: "March 5, 2026", desc: "Showcasing student innovation.", img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=500" }
    ],
    gallery: [
        "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600"
    ],
    enquiries: []
};

// Initialize Data if empty
if (!localStorage.getItem('alIhsanData')) {
    localStorage.setItem('alIhsanData', JSON.stringify(DEFAULT_DATA));
}

const db = {
    get: () => JSON.parse(localStorage.getItem('alIhsanData')),
    save: (data) => localStorage.setItem('alIhsanData', JSON.stringify(data)),
    addEnquiry: (enquiry) => {
        const data = db.get();
        data.enquiries.push({ ...enquiry, id: Date.now(), date: new Date().toLocaleDateString() });
        db.save(data);
    }
};

// --- MIGRATION FIX ---
// Automatically update hero image and about content for existing users
const currentData = db.get();
let dataChanged = false;

if (currentData.hero.image.includes('unsplash.com')) {
    currentData.hero.image = 'hero-bg.jpg';
    dataChanged = true;
}

// Force update "About Us" content to new version if it lacks the new box structure
if (!currentData.about.content.includes('about-desc-box')) {
    currentData.about.content = DEFAULT_DATA.about.content;
    dataChanged = true;
}

// Force update stats if they are missing new keys (alumni)
if (!currentData.stats.alumni) {
    currentData.stats = DEFAULT_DATA.stats;
    dataChanged = true;
}

// Force update core contact info to latest
if (currentData.contact.email === "info@alihsanacademy.com" || currentData.contact.email === "alihsanacademyuk@gmail.com") {
    currentData.contact.email = DEFAULT_DATA.contact.email;
    currentData.contact.phone = DEFAULT_DATA.contact.phone;
    currentData.contact.whatsapp = DEFAULT_DATA.contact.whatsapp;
    currentData.contact.address = DEFAULT_DATA.contact.address;
    dataChanged = true;
}

if (dataChanged) {
    db.save(currentData);
}

// --- UI LOGIC ---

// 1. Populate Content on Load
function initContent() {
    const data = db.get();

    // Hero
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
        heroTitle.textContent = data.hero.title;
        document.getElementById('hero-subtitle').textContent = data.hero.subtitle;
        document.querySelector('.hero').style.backgroundImage = `url('${data.hero.image}')`;
    }

    // Stats
    const statStudents = document.getElementById('stat-students');
    if (statStudents) {
        statStudents.setAttribute('data-target', data.stats.students);
        if (document.getElementById('stat-teachers')) document.getElementById('stat-teachers').setAttribute('data-target', data.stats.teachers);
        if (document.getElementById('stat-alumni')) document.getElementById('stat-alumni').setAttribute('data-target', data.stats.alumni || 500);
        if (document.getElementById('stat-families')) document.getElementById('stat-families').setAttribute('data-target', data.stats.families || 1000);

        initCounters();
    }

    // About
    const aboutText = document.getElementById('about-text');
    if (aboutText) {
        aboutText.innerHTML = data.about.content;
        // Image is now static HTML
    }



    // Gallery Marquee
    const galleryMarquee = document.getElementById('gallery-marquee');
    if (galleryMarquee && data.gallery) {
        // Double the gallery array to ensure a seamless loop
        const loopGallery = [...data.gallery, ...data.gallery];
        galleryMarquee.innerHTML = loopGallery.map((img, index) => `
          <div class="gallery-item" onclick="openLightbox('${img}')">
              <img src="${img}" alt="Al-Ihsan Gallery ${index + 1}" loading="lazy">
          </div>
      `).join('');
    }

    // --- NEW SECTIONS RENDER ---

    // 1. Upcoming Events - RENDERED SEPARATELY IN renderEvents() to keep initContent clean
    if (data.events && data.events.length === 0) {
        const evSection = document.getElementById('events-section');
        if (evSection) evSection.style.display = 'none';
    }

    // 2. Contact Info (Footer & Page)
    document.querySelectorAll('.app-phone').forEach(el => el.textContent = data.contact.phone);
    document.querySelectorAll('.app-email').forEach(el => el.textContent = data.contact.email);
    document.querySelectorAll('.app-address').forEach(el => el.textContent = data.contact.address);

    // Dynamic Links
    const waLink = `https://wa.me/${data.contact.whatsapp.replace(/[^0-9]/g, '')}`;
    document.querySelectorAll('.link-whatsapp').forEach(el => el.href = waLink);
    document.querySelectorAll('.link-phone').forEach(el => el.href = `tel:${data.contact.phone}`);
    document.querySelectorAll('.link-email').forEach(el => el.href = `mailto:${data.contact.email}`);

    // Socials
    if (data.socials) {
        document.querySelectorAll('.link-fb').forEach(el => el.href = data.socials.facebook);
        document.querySelectorAll('.link-insta').forEach(el => el.href = data.socials.instagram);
        document.querySelectorAll('.link-yt').forEach(el => el.href = data.socials.youtube);
    }
}

// 2. Animated Counters
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                const increment = target / 100; // adjust speed

                let c = 0;
                const updateCounter = () => {
                    c = Math.ceil(c + increment);
                    if (c < target) {
                        counter.textContent = c;
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target + "+"; // Append + at end
                    }
                };
                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// 3. Enquiry Form Handler
function handleEnquirySubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const enquiry = Object.fromEntries(formData.entries());

    db.addEnquiry(enquiry);

    alert('Thank you! Your admission enquiry has been submitted successfully.');
    e.target.reset();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initContent();

    const form = document.getElementById('enquiry-form');
    if (form) form.addEventListener('submit', handleEnquirySubmit);

    // Sticky Header Logic
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});

// --- LIGHTBOX LOGIC ---
// --- LIGHTBOX LOGIC ---
let currentLightboxIndex = -1;
let lightboxImages = [];

function initLightboxHTML() {
    if (document.getElementById('lightbox')) return;

    const div = document.createElement('div');
    div.id = 'lightbox';
    div.className = 'lightbox';
    div.innerHTML = `
        <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
        <div class="lightbox-nav lightbox-prev" onclick="changeLightboxImage(-1)">&#10094;</div>
        <div class="lightbox-nav lightbox-next" onclick="changeLightboxImage(1)">&#10095;</div>
        <div class="lightbox-content-wrapper" id="lightbox-wrapper">
            <img class="lightbox-img" id="lightbox-img" src="" alt="Full view">
        </div>
        <div class="interaction-hint">Double tap to zoom • Swipe to navigate</div>
    `;
    document.body.appendChild(div);

    // Initial Event Listeners
    div.addEventListener('click', (e) => {
        if (e.target === div || e.target.classList.contains('lightbox-content-wrapper')) {
            closeLightbox();
        }
    });

    initLightboxGestures();
}

function openLightbox(source, index = -1) {
    initLightboxHTML(); // Ensure HTML exists
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');

    // Determine input type
    if (typeof source === 'string') {
        // Single image URL string (legacy/gallery support)
        lightboxImages = [source];
        currentLightboxIndex = 0;
    } else if (Array.isArray(source)) {
        // Array of objects or strings
        lightboxImages = source;
        currentLightboxIndex = index;
    }

    updateLightboxImage();

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    if (currentLightboxIndex < 0) currentLightboxIndex = 0;
    if (currentLightboxIndex >= lightboxImages.length) currentLightboxIndex = lightboxImages.length - 1;

    let src = typeof lightboxImages[currentLightboxIndex] === 'string'
        ? lightboxImages[currentLightboxIndex]
        : lightboxImages[currentLightboxIndex].image;

    // Reset Zoom
    resetZoom(img);

    img.style.opacity = '0.5';
    img.src = src;
    setTimeout(() => img.style.opacity = '1', 200);
}

function changeLightboxImage(dir) {
    if (lightboxImages.length <= 1) return;

    currentLightboxIndex += dir;
    // Loop
    if (currentLightboxIndex >= lightboxImages.length) currentLightboxIndex = 0;
    if (currentLightboxIndex < 0) currentLightboxIndex = lightboxImages.length - 1;

    updateLightboxImage();
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Zoom & Swipe Logic
function initLightboxGestures() {
    const img = document.getElementById('lightbox-img');
    const wrapper = document.getElementById('lightbox-wrapper');

    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let startX = 0;
    let startY = 0;

    // Swipe Vars
    let touchStartX = 0;
    let touchEndX = 0;

    // Zoom Handlers
    img.addEventListener('dblclick', (e) => {
        if (scale === 1) {
            scale = 2;
            img.classList.add('zoomed');
            img.style.transform = `scale(${scale})`;
        } else {
            resetZoom(img);
        }
    });

    // Mobile Swipe for Navigation (only if not zoomed)
    wrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    wrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        if (scale > 1) return; // Don't swipe nav if zoomed

        const threshold = 50;
        if (touchEndX < touchStartX - threshold) changeLightboxImage(1); // Swipe Left -> Next
        if (touchEndX > touchStartX + threshold) changeLightboxImage(-1); // Swipe Right -> Prev
    }

    function resetZoom(el) {
        scale = 1;
        panning = false;
        pointX = 0;
        pointY = 0;
        el.style.transform = `translate(0px, 0px) scale(1)`;
        el.classList.remove('zoomed');
    }
}

// Keyboard nav
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox')?.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') changeLightboxImage(1);
    if (e.key === 'ArrowLeft') changeLightboxImage(-1);
});

// --- SMOOTH SCROLL & HIGHLIGHT ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });

            // If targeting contact section, add a temporary highlight
            if (targetId === '#get-in-touch') {
                targetElement.classList.add('contact-highlight-anim');
                setTimeout(() => {
                    targetElement.classList.remove('contact-highlight-anim');
                }, 2000);
            }
        }
    });
});

// --- MOBILE NAVIGATION ---
const mobileToggle = document.querySelector('.mobile-nav-toggle');
const mobileOverlay = document.querySelector('.mobile-nav-overlay');
const mobileClose = document.querySelector('.mobile-nav-close');
const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

if (mobileClose) {
    mobileClose.addEventListener('click', () => {
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
}

mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// --- RENDER EVENTS ---
function renderEvents() {
    const data = db.get();
    const container = document.getElementById('events-container');

    if (!container) return;

    // Filter visible events and sort by order
    const visibleEvents = (data.events || [])
        .filter(event => event.isVisible !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (visibleEvents.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 60px 0;">No upcoming events at the moment.</p>';
        return;
    }

    // Prep images for lightbox
    const eventsForLightbox = visibleEvents; // Passed by reference, full objects

    container.innerHTML = visibleEvents.map((event, index) => `
        <div class="event-card" 
             style="animation-delay: ${index * 0.1}s;" 
             onclick="openLightbox(db.get().events.filter(e => e.isVisible !== false).sort((a, b) => (a.order || 0) - (b.order || 0)), ${index})">
            
            <div class="event-image-wrapper">
                <img 
                    data-src="${event.image}" 
                    src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                    alt="${event.title}" 
                    class="event-banner lazy-img"
                >
                ${event.isNew ? '<span class="event-badge">New</span>' : ''}
            </div>
            
            <div class="event-content">
                <div>
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-date">
                        <span>📅</span> ${event.date}
                    </div>
                    ${event.description ? `<p class="event-desc-short">${event.description}</p>` : ''}
                </div>
            </div>
            <div class="ripple-container"></div>
        </div>
    `).join('');

    // Add Stagger & Lazy Loading
    setTimeout(() => {
        const cards = container.querySelectorAll('.event-card');
        cards.forEach((card) => card.classList.add('visible'));

        // Lazy Load
        const imgObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy-img');
                    observer.unobserve(img);
                }
            });
        });

        container.querySelectorAll('.lazy-img').forEach(img => imgObserver.observe(img));
    }, 50);
}

// Initialize events on page load
if (document.getElementById('events-container')) {
    renderEvents();
}
