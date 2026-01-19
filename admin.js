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

// --- CMS LOGIC ---

async function initAdmin() {
    const data = await db.get(); // Async Get

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
    table.innerHTML = (enquiries || []).slice().reverse().map(req => `
        <tr>
            <td>${req.date || 'N/A'}</td>
            <td><strong>${req.studentName}</strong></td>
            <td>${req.class}</td>
            <td>${req.phone}<br><span style="font-size:0.8em; color:#888;">${req.parentName}</span></td>
            <td><span class="badge badge-new">New</span></td>
        </tr>
    `).join('');
}

function renderGallery(images) {
    const grid = document.getElementById('admin-gallery-grid');
    if (!grid) return;
    grid.innerHTML = (images || []).map((img, index) => `
        <div style="position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; group:hover .overlay {opacity:1}">
            <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:0.2s; display:flex; align-items:center; justify-content:center; cursor:pointer;"
                 onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                <button onclick="deleteGalleryImage(${index})" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
            </div>
        </div>
    `).join('');
}

// --- EVENTS MANAGEMENT ---
// Note: renderEvents is duplicated in script.js but we keep it here for Admin view specific logic if needed.
// However, since we defined the same function name, we must be careful.
// script.js's renderEvents targets 'events-container', this one targets 'admin-events-list'.
// They coexist because they target different elements.
// Same logic as before, just async aware? renderEvents doesn't call db.get inside, it takes 'events' arg.
// So renderEvents remains synchronous-ish, but the caller provides data.

function renderEvents(events) {
    const list = document.getElementById('admin-events-list');
    if (!list) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];
    const mappedEvents = events.map((e, i) => ({ ...e, originalIndex: i }));

    mappedEvents.forEach(ev => {
        const eDate = new Date(ev.date);
        if (isNaN(eDate.getTime()) || eDate >= today) {
            upcoming.push(ev);
        } else {
            past.push(ev);
        }
    });

    upcoming.sort((a, b) => (a.order || 0) - (b.order || 0));
    past.sort((a, b) => new Date(b.date) - new Date(a.date));

    // (Rendering logic identical to previous, omitted for brevity as it was already correct)
    const renderCard = (ev, isPast) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-left: 5px solid ${isPast ? '#95a5a6' : (ev.isVisible !== false ? '#2ecc71' : '#e74c3c')}; opacity: ${isPast ? '0.8' : '1'}; background: ${isPast ? '#f9f9f9' : 'white'};">
            <div style="display:flex; gap:15px; align-items:center; flex: 1;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    ${!isPast ? `
                    <button onclick="moveEvent(${ev.originalIndex}, -1)" style="border:none; background:none; cursor:pointer;" title="Move Up">▲</button>
                    <button onclick="moveEvent(${ev.originalIndex}, 1)" style="border:none; background:none; cursor:pointer;" title="Move Down">▼</button>
                    ` : ''}
                </div>
                <img src="${ev.image}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; background:#eee;">
                <div>
                    <strong style="display:block; font-size:1.1rem; color: ${isPast ? '#666' : '#000'};">${ev.title}</strong>
                    <span style="color:#666; font-size:0.9rem;">${ev.date} ${isPast ? '(Completed)' : ''}</span>
                    ${ev.isNew && !isPast ? '<span class="badge badge-new" style="margin-left:5px;">New</span>' : ''}
                    ${ev.isVisible === false ? '<span class="badge" style="background:#e74c3c; color:white;">Hidden</span>' : ''}
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-outline" onclick="toggleEventVisibility(${ev.originalIndex})">
                    ${ev.isVisible !== false ? 'Hide' : 'Show'}
                </button>
                <button class="btn btn-outline" onclick="editEvent(${ev.originalIndex})">Edit</button>
                <button class="btn btn-outline" style="color:red; border-color:red;" onclick="deleteEvent(${ev.originalIndex})">Delete</button>
            </div>
        </div>
    `;

    let html = '';
    html += `<h3 style="margin: 20px 0 10px; color: var(--col-primary);">📅 Upcoming & Active Events</h3>`;
    if (upcoming.length === 0) html += `<p style="color:#888; font-style:italic;">No upcoming events scheduled.</p>`;
    html += upcoming.map(ev => renderCard(ev, false)).join('');

    if (past.length > 0) {
        html += `<h3 style="margin: 40px 0 10px; color: #7f8c8d; border-top: 2px dashed #eee; padding-top: 20px;">🕰️ Past Events (Archived)</h3>`;
        html += past.map(ev => renderCard(ev, true)).join('');
    }
    list.innerHTML = html;
}

async function handleEventSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('event-submit-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const data = await db.get();
        if (!data.events) data.events = [];

        const idInput = document.getElementById('event-id').value;
        const isEdit = idInput !== '';

        const eventData = {
            id: isEdit ? parseInt(idInput) : Date.now(),
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            description: document.getElementById('event-desc').value,
            image: document.getElementById('event-img').value,
            isNew: document.getElementById('event-new').checked,
            isVisible: document.getElementById('event-visible').checked,
            order: isEdit ? data.events.find(ev => ev.id == idInput)?.order || 0 : data.events.length + 1
        };

        if (isEdit) {
            const index = data.events.findIndex(ev => ev.id == eventData.id);
            if (index !== -1) {
                data.events[index] = eventData;
            }
        } else {
            data.events.push(eventData);
        }

        await db.save(data);
        renderEvents(data.events);
        resetEventForm();
    } catch (err) {
        alert("Failed to save event");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function editEvent(index) {
    const data = await db.get();
    const ev = data.events[index];
    if (!ev) return;

    document.getElementById('event-form-title').textContent = 'Edit Event';
    document.getElementById('event-submit-btn').textContent = 'Update Event';
    document.getElementById('event-cancel-btn').style.display = 'inline-block';

    document.getElementById('event-id').value = ev.id;
    document.getElementById('event-title').value = ev.title;
    document.getElementById('event-date').value = ev.date;
    document.getElementById('event-desc').value = ev.description || '';
    document.getElementById('event-img').value = ev.image;
    document.getElementById('event-new').checked = ev.isNew || false;
    document.getElementById('event-visible').checked = ev.isVisible !== false;

    document.querySelector('.main-content').scrollTop = 0;
}

function resetEventForm() {
    document.getElementById('event-form-title').textContent = 'Add New Event';
    document.getElementById('event-submit-btn').textContent = 'Add Event';
    document.getElementById('event-cancel-btn').style.display = 'none';
    document.getElementById('event-id').value = '';

    // Explicit reset
    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
    document.getElementById('event-desc').value = '';
    document.getElementById('event-img').value = '';
    document.getElementById('event-new').checked = false;
    document.getElementById('event-visible').checked = true;
}

async function toggleEventVisibility(index) {
    const data = await db.get();
    const ev = data.events[index];
    ev.isVisible = !(ev.isVisible !== false);
    await db.save(data);
    renderEvents(data.events);
}

async function moveEvent(index, direction) {
    const data = await db.get();
    const events = data.events;

    const sortedIndices = events.map((e, i) => ({ index: i, order: e.order || 0 }))
        .sort((a, b) => a.order - b.order);

    const currentPos = sortedIndices.findIndex(item => item.index === index);
    const targetPos = currentPos + direction;

    if (targetPos < 0 || targetPos >= events.length) return;

    const itemA = events[sortedIndices[currentPos].index];
    const itemB = events[sortedIndices[targetPos].index];

    const tempOrder = itemA.order;
    itemA.order = itemB.order;
    itemB.order = tempOrder;

    await db.save(data);
    renderEvents(data.events);
}

async function deleteEvent(index) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const data = await db.get();
    data.events.splice(index, 1);
    await db.save(data);
    renderEvents(data.events);
}

function addGalleryImage() {
    const urlInput = document.getElementById('new-gallery-img');
    const url = urlInput.value.trim();
    if (!url) return;

    const isGenericUrl = url.includes('instagram.com') || url.includes('facebook.com');
    const btn = document.querySelector('button[onclick="addGalleryImage()"]');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    const saveImage = async () => {
        try {
            const data = await db.get();
            data.gallery.push(url);
            await db.save(data);
            renderGallery(data.gallery);
            urlInput.value = '';
        } catch (e) {
            console.error(e);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    };

    if (isGenericUrl) {
        saveImage();
    } else {
        const img = new Image();
        img.onload = saveImage;
        img.onerror = function () {
            if (confirm('Warning: This URL does not look like a direct image link. Add it anyway?')) {
                saveImage();
            } else {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        };
        img.src = url;
    }
}

async function deleteGalleryImage(index) {
    if (!confirm('Delete this photo?')) return;
    const data = await db.get();
    data.gallery.splice(index, 1);
    await db.save(data);
    renderGallery(data.gallery);
}

async function saveSettings() {
    const data = await db.get();
    data.contact = {
        phone: document.getElementById('set-phone').value,
        whatsapp: document.getElementById('set-whatsapp').value,
        email: document.getElementById('set-email').value,
        address: document.getElementById('set-address').value
    };
    await db.save(data);
}

async function saveSocials() {
    const data = await db.get();
    data.socials = {
        facebook: document.getElementById('set-fb').value,
        instagram: document.getElementById('set-insta').value,
        youtube: document.getElementById('set-yt').value
    };
    await db.save(data);
}

async function saveHero() {
    const data = await db.get();
    data.hero.title = document.getElementById('set-hero-title').value;
    data.hero.subtitle = document.getElementById('set-hero-subtitle').value;
    data.hero.image = document.getElementById('edit-hero-image').value;
    await db.save(data);
}

async function saveStats() {
    const data = await db.get();
    data.stats.students = document.getElementById('edit-stats-students').value;
    data.stats.teachers = document.getElementById('edit-stats-teachers').value;
    data.stats.alumni = document.getElementById('edit-stats-alumni').value;
    data.stats.families = document.getElementById('edit-stats-families').value;
    await db.save(data);
}

// --- NAVIGATION ---
window.showSection = function (id) {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
}

// --- EXPORT CSV ---
window.exportCSV = async function () {
    const dataRaw = await db.get();
    const data = dataRaw.enquiries;
    if (!data || data.length === 0) { alert('No enquiries to export'); return; }

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
