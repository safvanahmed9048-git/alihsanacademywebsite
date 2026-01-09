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
        subtitle: '"Building a Generation for Tomorrow"',
        image: "hero-bg.jpg",
        ctaText: "Read More",
        ctaLink: "#about"
    },
    about: {
        title: "About Us",
        content: `AL-IHSAN Academy is an initiative of AL-IHSAN Organisation, established for the public benefit to support social inclusion among people living in the UK, especially the Keralite community. The organisation works to promote Islamic values, education, and Keralite culture and heritage. fostering harmony and community wellbeing through gatherings, celebrations of special occasions such as Eid and Ramadan, charitable support for the needy. and compassionate moral and pastoral care.<br><br>AL-IHSAN Academy focuses on moral and Islamic education for South Indian Muslim children across the UK and Europe. Through structured, virtual learning, the Academy offers <strong style="color: var(--col-primary);">Online Madrasa Classes, Qur'an and Thajweed Classes, and Malayalam language Classes</strong> delivered by expert teachers-making quality education accessible while nurturing strong Islamic values and cultural identity.`,
        image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1000&auto=format&fit=crop"
    },
    stats: {
        students: 250,
        teachers: 40,
        classes: 10
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

// Force update "About Us" content to new version if it is short (old version)
if (currentData.about.content.length < 300) {
    currentData.about.content = DEFAULT_DATA.about.content;
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
        document.getElementById('stat-teachers').setAttribute('data-target', data.stats.teachers);
        document.getElementById('stat-classes').setAttribute('data-target', data.stats.classes);
        initCounters();
    }

    // About
    const aboutText = document.getElementById('about-text');
    if (aboutText) {
        aboutText.innerHTML = data.about.content;
        document.getElementById('about-img').src = data.about.image;
    }

    // Activities
    const activityGrid = document.getElementById('activity-grid');
    if (activityGrid) {
        activityGrid.innerHTML = data.activities.map(act => `
          <div class="activity-card">
              <div class="activity-img" style="background-image: url('${act.img}'); background-size: cover;"></div>
              <div class="activity-body">
                  <span class="text-gold" style="font-size: 0.9rem; font-weight: bold;">${act.date}</span>
                  <h3 style="margin: 10px 0; font-size: 1.2rem;">${act.title}</h3>
                  <p style="color: #666;">${act.desc}</p>
              </div>
          </div>
      `).join('');
    }

    // Gallery
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        galleryGrid.innerHTML = data.gallery.map(img => `
          <div style="border-radius: 8px; overflow: hidden; height: 180px; position:relative;">
              <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; transition: 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
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
                const increment = target / 100;

                let c = 0;
                const updateCounter = () => {
                    c = Math.ceil(c + increment);
                    if (c < target) {
                        counter.textContent = c;
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
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
