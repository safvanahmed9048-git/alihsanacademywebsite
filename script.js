/**
 * AL-IHSAN Academy - Core Logic
 * Handles Data (LocalStorage), Animations, and UI Interactions
 */

// --- DATA LAYER ---
const DEFAULT_DATA = {
    // --- GLOBAL SETTINGS ---
    contact: {
        address: "Al-Ihsan Academy Campus, Kerala, India - 670001",
        phone: "+91 98765 43210",
        whatsapp: "+91 98765 43210",
        email: "info@alihsanacademy.com"
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
        { id: 1, title: "Admission Open Day", date: "June 15, 2026", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500", link: "#" },
        { id: 2, title: "Islamic Arts Fest", date: "July 20, 2026", image: "https://images.unsplash.com/photo-1582662055627-2c96c4832e18?w=500", link: "#" }
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

    // 1. Upcoming Events
    const eventsGrid = document.getElementById('events-grid');
    if (eventsGrid && data.events) {
        if (data.events.length === 0) {
            document.getElementById('events-section').style.display = 'none';
        } else {
            eventsGrid.innerHTML = data.events.map(ev => `
                <div class="event-card">
                    <div style="height: 150px; background: url('${ev.image}') center/cover;"></div>
                    <div style="padding: 15px;">
                        <span style="color: var(--col-primary); font-weight: bold; font-size: 0.8rem;">${ev.date}</span>
                        <h4 style="margin: 5px 0;">${ev.title}</h4>
                        <a href="${ev.link}" class="btn-text">Details &rarr;</a>
                    </div>
                </div>
            `).join('');
        }
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
function openLightbox(imgSrc) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Close lightbox on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
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
