/**
 * AL-IHSAN Academy - Core Logic
 * Handles Data (LocalStorage), Animations, and UI Interactions
 */

// --- DATA LAYER ---
// --- DATA LAYER ---
// Replaced LocalStorage with Central Cloud Data (data.json + GitHub API)

const db = {
    get: async () => {
        try {
            // Fetch with cache busting
            const response = await fetch('/data.json?t=' + Date.now());
            if (!response.ok) throw new Error('Failed to load data');
            return await response.json();
        } catch (error) {
            console.error('DB Load Error:', error);
            // Fallback for extreme cases (network fail) to prevent crash
            return { hero: {}, contact: {}, socials: {}, events: [], gallery: [], enquiries: [], stats: {}, about: {} };
        }
    },
    save: async (data, silent = false) => {
        try {
            const response = await fetch('/api/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Save failed');

            if (!silent) alert('Changes Saved! They will reflect on the live site in about 1-2 minutes (after deployment).');
            return true;
        } catch (error) {
            console.error('DB Save Error:', error);
            alert('Error saving data: ' + error.message);
            return false;
        }
    },
    addEnquiry: async (enquiry) => {
        const data = await db.get();
        if (!data.enquiries) data.enquiries = [];
        data.enquiries.push({ ...enquiry, id: Date.now(), date: new Date().toLocaleDateString() });
        // Enquiries are critical, we try to save immediately
        await db.save(data, true); // Silent save
    }
};

// --- UI LOGIC ---

// 1. Populate Content on Load
async function initContent() {
    const data = await db.get();

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
    }

    // Gallery Marquee
    const galleryMarquee = document.getElementById('gallery-marquee');
    if (galleryMarquee && data.gallery) {
        const loopGallery = [...data.gallery, ...data.gallery];
        galleryMarquee.innerHTML = loopGallery.map((img, index) => {
            const isInstagram = img.includes('instagram.com');
            const isFacebook = img.includes('facebook.com');

            // Handle Instagram
            if (isInstagram) {
                const cleanUrl = img.split('?')[0].replace(/\/$/, '');
                const mediaUrl = `${cleanUrl}/media/?size=l`;
                const fallbackHTML = `<div class='social-card' style='width:100%; height:100%; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;'><span style='font-size:2rem; color:white; margin-bottom:10px;'>📸</span><span style='color:white; font-weight:bold; font-size:0.9rem;'>View Post</span></div>`;
                return `<div class="gallery-item" onclick="window.open('${img}', '_blank')"><img src="${mediaUrl}" alt="Instagram Post" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML=&quot;${fallbackHTML}&quot;;"></div>`;
            }

            // Handle Facebook
            if (isFacebook) {
                return `<div class="gallery-item social-card" onclick="window.open('${img}', '_blank')" style="background: #1877F2; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;"><span style="font-size:2rem; color:white; margin-bottom:10px;">f</span><span style="color:white; font-weight:bold; font-size:0.9rem;">View Post</span></div>`;
            }

            // Standard Image
            return `<div class="gallery-item" onclick="openLightbox('${img}')"><img src="${img}" alt="Al-Ihsan Gallery ${index + 1}" loading="lazy"></div>`;
        }).join('');
    }

    // 2. Contact Info (Footer & Page)
    document.querySelectorAll('.app-phone').forEach(el => el.textContent = data.contact.phone);
    document.querySelectorAll('.app-email').forEach(el => el.textContent = data.contact.email);
    document.querySelectorAll('.app-address').forEach(el => el.textContent = data.contact.address);

    // Dynamic Links
    const waLink = `https://wa.me/${data.contact.whatsapp.replace(/[^0-9]/g, '')}`;
    const phoneLink = `tel:${data.contact.phone.replace(/[^0-9+]/g, '')}`;

    document.querySelectorAll('.link-whatsapp').forEach(el => el.href = waLink);
    document.querySelectorAll('.link-phone').forEach(el => el.href = phoneLink);
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
async function handleEnquirySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);
        const enquiry = Object.fromEntries(formData.entries());
        await db.addEnquiry(enquiry);
        alert('Thank you! Your admission enquiry has been submitted successfully.');
        e.target.reset();
    } catch (err) {
        alert('Could not submit enquiry. Please try again.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // Determine if we are on the User Side
    const isUserPage = document.getElementById('home') || document.getElementById('hero-title');

    if (isUserPage) {
        await initContent();
        await renderEvents(); // Ensure events render!

        const form = document.getElementById('enquiry-form');
        if (form) form.addEventListener('submit', handleEnquirySubmit);

        // Sticky Header Logic
        const header = document.querySelector('header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }
    }
});

// --- LIGHTBOX LOGIC ---
// ... (Reference existing code for initLightboxHTML, openLightbox etc, unchanged except openLightbox usage)
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
    div.addEventListener('click', (e) => {
        if (e.target === div || e.target.classList.contains('lightbox-content-wrapper')) closeLightbox();
    });
    initLightboxGestures();
}

function openLightbox(source, index = -1) {
    initLightboxHTML();
    const lightbox = document.getElementById('lightbox');
    if (typeof source === 'string') {
        lightboxImages = [source];
        currentLightboxIndex = 0;
    } else if (Array.isArray(source)) {
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

    resetZoom(img);
    img.style.opacity = '0.5';
    img.src = src;
    setTimeout(() => img.style.opacity = '1', 200);
}

function changeLightboxImage(dir) {
    if (lightboxImages.length <= 1) return;
    currentLightboxIndex += dir;
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

function initLightboxGestures() {
    const img = document.getElementById('lightbox-img');
    const wrapper = document.getElementById('lightbox-wrapper');
    let scale = 1;
    let touchStartX = 0;
    let touchEndX = 0;

    img.addEventListener('dblclick', () => {
        if (scale === 1) {
            scale = 2;
            img.classList.add('zoomed');
            img.style.transform = `scale(${scale})`;
        } else {
            resetZoom(img);
        }
    });

    wrapper.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    wrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        if (scale > 1) return;
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) changeLightboxImage(1);
        if (touchEndX > touchStartX + threshold) changeLightboxImage(-1);
    }
}

function resetZoom(el) {
    el.style.transform = `translate(0px, 0px) scale(1)`;
    el.classList.remove('zoomed');
}

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox')?.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') changeLightboxImage(1);
    if (e.key === 'ArrowLeft') changeLightboxImage(-1);
});

// --- SMOOTH SCROLL ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth' });
            if (targetId === '#get-in-touch') {
                targetElement.classList.add('contact-highlight-anim');
                setTimeout(() => targetElement.classList.remove('contact-highlight-anim'), 2000);
            }
        }
    });
});

// --- MOBILE NAV ---
const mobileToggle = document.querySelector('.mobile-nav-toggle');
const mobileOverlay = document.querySelector('.mobile-nav-overlay');
const mobileClose = document.querySelector('.mobile-nav-close');
const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

if (mobileToggle) mobileToggle.addEventListener('click', () => { mobileOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; });
if (mobileClose) mobileClose.addEventListener('click', () => { mobileOverlay.classList.remove('active'); document.body.style.overflow = ''; });
mobileLinks.forEach(link => link.addEventListener('click', () => { mobileOverlay.classList.remove('active'); document.body.style.overflow = ''; }));

// --- RENDER EVENTS ---
async function renderEvents() {
    const data = await db.get();
    const container = document.getElementById('events-container');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEvents = data.events || [];
    const upcomingEvents = [];
    const pastEvents = [];

    allEvents.forEach(event => {
        if (event.isVisible === false) return;
        const eDate = new Date(event.date);
        if (isNaN(eDate.getTime()) || eDate >= today) {
            upcomingEvents.push(event);
        } else {
            pastEvents.push(event);
        }
    });

    const sortParams = (a, b) => {
        const orderDiff = (a.order || 0) - (b.order || 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.date) - new Date(b.date);
    };

    upcomingEvents.sort(sortParams);
    pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // UPCOMING
    if (upcomingEvents.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;"><h3 style="color: var(--col-primary); font-size: 1.5rem; margin-bottom: 10px;">Stay Tuned!</h3><p style="color: #666; font-size: 1.1rem;">Upcoming event details will be published here.</p></div>`;
    } else {
        container.innerHTML = upcomingEvents.map((event, index) => renderEventCard(event, index, upcomingEvents)).join('');
    }

    // PAST
    const pastContainer = document.getElementById('past-events-container');
    if (pastContainer) {
        if (pastEvents.length === 0) {
            pastContainer.innerHTML = `<p class="text-center" style="grid-column:1/-1; color:#888;">No past events to show.</p>`;
        } else {
            pastContainer.innerHTML = pastEvents.map((event, index) => renderEventCard(event, index, pastEvents, true)).join('');
        }
    }

    // Init animations
    initEventAnimations(container);
    if (pastContainer) initEventAnimations(pastContainer);
}

function renderEventCard(event, index, listContext, isPast = false) {
    let displayDate = event.date;
    const d = new Date(event.date);
    if (!isNaN(d.getTime())) displayDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
        <div class="event-card ${isPast ? 'past-event' : ''}" style="animation-delay: ${index * 0.1}s; ${isPast ? 'opacity:0.8; filter:grayscale(0.3);' : ''}">
            <div class="event-image-wrapper" onclick="openLightbox('${event.image}')">
                <img data-src="${event.image}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${event.title}" class="event-banner lazy-img">
                ${event.isNew && !isPast ? '<span class="event-badge">New</span>' : ''}
                ${isPast ? '<span class="event-badge" style="background:#555;">Completed</span>' : ''}
            </div>
            <div class="event-content">
                <div>
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-date"><span>📅</span> ${displayDate}</div>
                    ${event.description ? `<p style="font-size:0.9em; color:#666; margin-top:5px; line-height:1.4;">${event.description.substring(0, 80)}${event.description.length > 80 ? '...' : ''}</p>` : ''}
                </div>
            </div>
        </div>
    `;
}

function initEventAnimations(container) {
    setTimeout(() => {
        const cards = container.querySelectorAll('.event-card');
        cards.forEach((card) => card.classList.add('visible'));

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
