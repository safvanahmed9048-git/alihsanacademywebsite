/**
 * AL-IHSAN Academy - Admin Logic
 */

// --- AUTHENTICATION ---
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert('Session expired due to inactivity.');
        logout();
    }, 15 * 60 * 1000); // 15 Minutes
}

function checkAuth() {
    // We check a non-http-only flag for UI state, 
    // but the API/Middleware enforces the real security.
    if (localStorage.getItem('alIhsanAdminLogged') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-app').style.display = 'flex';
        initAdmin();
        resetInactivityTimer();
        // Listen for activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(e => {
            document.addEventListener(e, resetInactivityTimer);
        });
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('login-error');

    btn.disabled = true;
    btn.textContent = 'Authenticating...';
    errorMsg.style.display = 'none';

    // Allowed emails
    const ALLOWED_EMAILS = [
        'msvattoli@gmail.com',
        'safvanahmed9048@gmail.com',
        'academy@alihsan.co.uk'
    ];

    // Password
    const ADMIN_PASSWORD = 'Academy@01012026';

    // Simulate a small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check email allowlist
    if (!ALLOWED_EMAILS.includes(email)) {
        errorMsg.textContent = 'You are not authorized to access the admin panel.';
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Verify Identity';
        document.getElementById('password').value = '';
        return;
    }

    // Check password
    if (password !== ADMIN_PASSWORD) {
        errorMsg.textContent = 'You are not authorized to access the admin panel.';
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Verify Identity';
        document.getElementById('password').value = '';
        return;
    }

    // Success
    localStorage.setItem('alIhsanAdminLogged', 'true');
    localStorage.setItem('adminEmail', email);
    checkAuth();
});

async function logout() {
    await fetch('/api/logout');
    localStorage.removeItem('alIhsanAdminLogged');
    window.location.reload();
}

// --- CMS LOGIC ---

function initAdmin() {
    const data = db.get();

    // Dashboard Stats
    if (document.getElementById('dash-students')) document.getElementById('dash-students').textContent = data.stats.students;
    if (document.getElementById('dash-enquiries')) document.getElementById('dash-enquiries').textContent = data.enquiries.length;
    if (document.getElementById('dash-events')) document.getElementById('dash-events').textContent = (data.events || []).length;

    renderEnquiries(data.enquiries);
    renderEvents(data.events || []);
    renderGallery(data.gallery);

    // Fill Settings Forms
    if (data.contact) {
        if (document.getElementById('set-phone')) document.getElementById('set-phone').value = data.contact.phone;
        if (document.getElementById('set-whatsapp')) document.getElementById('set-whatsapp').value = data.contact.whatsapp;
        if (document.getElementById('set-email')) document.getElementById('set-email').value = data.contact.email;
        if (document.getElementById('set-address')) document.getElementById('set-address').value = data.contact.address;
    }
    if (data.socials) {
        if (document.getElementById('set-fb')) document.getElementById('set-fb').value = data.socials.facebook;
        if (document.getElementById('set-insta')) document.getElementById('set-insta').value = data.socials.instagram;
        if (document.getElementById('set-yt')) document.getElementById('set-yt').value = data.socials.youtube;
    }

    if (data.hero) {
        if (document.getElementById('set-hero-title')) document.getElementById('set-hero-title').value = data.hero.title;
        if (document.getElementById('set-hero-subtitle')) document.getElementById('set-hero-subtitle').value = data.hero.subtitle;
        if (document.getElementById('edit-hero-image')) document.getElementById('edit-hero-image').value = data.hero.image;
    }

    if (data.stats) {
        if (document.getElementById('edit-stats-students')) document.getElementById('edit-stats-students').value = data.stats.students;
        if (document.getElementById('edit-stats-teachers')) document.getElementById('edit-stats-teachers').value = data.stats.teachers;
        if (document.getElementById('edit-stats-alumni')) document.getElementById('edit-stats-alumni').value = data.stats.alumni;
        if (document.getElementById('edit-stats-families')) document.getElementById('edit-stats-families').value = data.stats.families;
    }
}

// --- RENDERERS ---
function renderEnquiries(enquiries) {
    const table = document.getElementById('enquiry-table');
    if (!table) return;
    table.innerHTML = enquiries.slice().reverse().map(req => `
        <tr>
            <td>${req.date || 'N/A'}</td>
            <td><strong>${req.studentName}</strong></td>
            <td>${req.class}</td>
            <td>${req.phone}<br><span style="font-size:0.8em; color:#888;">${req.parentName}</span></td>
            <td><span class="badge badge-new">New</span></td>
        </tr>
    `).join('');
}

function renderEvents(events) {
    const list = document.getElementById('admin-events-list');
    if (!list) return;
    list.innerHTML = events.map((ev, index) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
            <div style="display:flex; gap:15px; align-items:center;">
                <img src="${ev.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
                <div>
                    <strong style="display:block;">${ev.title}</strong>
                    <span style="color:#666; font-size:0.9rem;">${ev.date}</span>
                </div>
            </div>
            <button class="btn btn-outline" style="padding:5px 10px; color:red; border-color:red;" onclick="deleteEvent(${index})">Delete</button>
        </div>
    `).join('');
}

function renderGallery(gallery) {
    const grid = document.getElementById('admin-gallery-grid');
    if (!grid) return;
    grid.innerHTML = gallery.map((img, index) => `
        <div style="position:relative;">
            <img src="${img}" style="width:100%; height:100px; object-fit:cover; border-radius:5px;">
            <button onclick="deleteGalleryImage(${index})" style="position:absolute; top:5px; right:5px; background:red; color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">&times;</button>
        </div>
    `).join('');
}

// --- ACTIONS ---

function addEvent(e) {
    e.preventDefault();
    const data = db.get();
    if (!data.events) data.events = [];

    const newEvent = {
        id: Date.now(),
        title: document.getElementById('new-event-title').value,
        date: document.getElementById('new-event-date').value,
        image: document.getElementById('new-event-img').value,
        link: document.getElementById('new-event-link').value || '#'
    };

    data.events.push(newEvent);
    db.save(data);
    renderEvents(data.events);
    e.target.reset();
    alert('Event Added');
}

function deleteEvent(index) {
    if (!confirm('Delete this event?')) return;
    const data = db.get();
    data.events.splice(index, 1);
    db.save(data);
    renderEvents(data.events);
}

function addGalleryImage() {
    const urlInput = document.getElementById('new-gallery-img');
    const url = urlInput.value.trim();
    if (!url) return;

    const btn = document.querySelector('button[onclick="addGalleryImage()"]');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    // Create a temporary image to test loading
    const img = new Image();
    img.onload = function () {
        // Validation successful
        const data = db.get();
        data.gallery.push(url);
        db.save(data);
        renderGallery(data.gallery);
        urlInput.value = '';
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Image added successfully!');
    };
    img.onerror = function () {
        // Validation failed
        alert('Error: Unable to load image. Please check the URL and try again. Ensure it is a direct link to an image (jpg/png).');
        btn.textContent = originalText;
        btn.disabled = false;
    };
    img.src = url;
}

function deleteGalleryImage(index) {
    if (!confirm('Delete this photo?')) return;
    const data = db.get();
    data.gallery.splice(index, 1);
    db.save(data);
    renderGallery(data.gallery);
}

function saveSettings() {
    const data = db.get();
    data.contact = {
        phone: document.getElementById('set-phone').value,
        whatsapp: document.getElementById('set-whatsapp').value,
        email: document.getElementById('set-email').value,
        address: document.getElementById('set-address').value
    };
    db.save(data);
    alert('Contact Info Saved!');
}

function saveSocials() {
    const data = db.get();
    data.socials = {
        facebook: document.getElementById('set-fb').value,
        instagram: document.getElementById('set-insta').value,
        youtube: document.getElementById('set-yt').value
    };
    db.save(data);
    alert('Social Links Saved!');
}

function saveHero() {
    const data = db.get();
    data.hero.title = document.getElementById('set-hero-title').value;
    data.hero.subtitle = document.getElementById('set-hero-subtitle').value;
    data.hero.image = document.getElementById('edit-hero-image').value;
    db.save(data);
    alert('Hero Section Saved!');
}

function saveStats() {
    const data = db.get();
    data.stats.students = document.getElementById('edit-stats-students').value;
    data.stats.teachers = document.getElementById('edit-stats-teachers').value;
    db.save(data);
    alert('Stats Updated!');
}

// --- NAVIGATION ---

window.showSection = function (id) {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // Ideally find the nav item with the onclick matching and add active, 
    // but for simplicity just simple toggle.
}

// --- EXPORT CSV ---
window.exportCSV = function () {
    const data = db.get().enquiries;
    if (data.length === 0) { alert('No enquiries to export'); return; }

    const headers = ["Date", "Student Name", "Parent Name", "Class", "Phone", "Email", "Message"];
    const rows = data.map(e => [e.date, e.studentName, e.parentName, e.class, e.phone, e.email || '', e.message || ''].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "admissions_data.csv");
    document.body.appendChild(link);
    link.click();
}

// Initialize
checkAuth();
