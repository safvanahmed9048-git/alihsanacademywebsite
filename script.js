/**
 * AL-IHSAN Academy - Core Logic
 * Handles Data (LocalStorage), Animations, and UI Interactions
 */

// --- DATA LAYER ---
const DEFAULT_DATA = {
    hero: {
        title: "Welcome to AL-IHSAN Academy",
        subtitle: '"Building a Generation for Tomorrow"',
        image: "hero-bg.jpg"
    },
    about: {
        title: "About Us",
        content: "AL-IHSAN Academy is dedicated to providing a holistic education that blends traditional Islamic studies with modern academic rigor. Our mission is to raise a generation of knowledgeable, ethical, and compassionate leaders.",
        image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1000&auto=format&fit=crop"
    },
    stats: {
        students: 250,
        teachers: 40,
        classes: 10
    },
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
// Automatically update hero image for existing users who have cached data
const currentData = db.get();
if (currentData.hero.image.includes('unsplash.com')) {
    currentData.hero.image = 'hero-bg.jpg';
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
        aboutText.textContent = data.about.content;
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
          <div style="border-radius: 8px; overflow: hidden; height: 250px;">
              <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; transition: 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          </div>
      `).join('');
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
