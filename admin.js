/**
 * AL-IHSAN Academy - Admin Logic
 */

// --- AUTHENTICATION ---
const LOGIN_KEY = 'alIhsanAdminLogged';

function checkAuth() {
    if (sessionStorage.getItem(LOGIN_KEY) === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-app').style.display = 'flex';
        initAdmin();
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('password').value;
    if (pass === 'admin123') {
        sessionStorage.setItem(LOGIN_KEY, 'true');
        checkAuth();
    } else {
        alert('Invalid Password');
    }
});

function logout() {
    sessionStorage.removeItem(LOGIN_KEY);
    window.location.reload();
}

// --- CMS LOGIC ---

function initAdmin() {
    const data = db.get();

    // Populate Dashboard Stats
    document.getElementById('dash-students').textContent = data.stats.students;
    document.getElementById('dash-enquiries').textContent = data.enquiries.length;
    document.getElementById('dash-activities').textContent = data.activities.length;

    // Populate Enquiries Table
    const table = document.getElementById('enquiry-table');
    table.innerHTML = data.enquiries.slice().reverse().map(req => `
        <tr>
            <td>${req.date || 'N/A'}</td>
            <td><strong>${req.studentName}</strong></td>
            <td>${req.class}</td>
            <td>${req.phone}<br><span style="font-size:0.8em; color:#888;">${req.parentName}</span></td>
            <td><span class="badge badge-new">New</span></td>
        </tr>
    `).join('');

    // Populate Edit Fields
    document.getElementById('edit-hero-title').value = data.hero.title;
    document.getElementById('edit-hero-subtitle').value = data.hero.subtitle;
    document.getElementById('edit-hero-image').value = data.hero.image;

    document.getElementById('edit-stats-students').value = data.stats.students;
    document.getElementById('edit-stats-teachers').value = data.stats.teachers;
}

// --- SAVE FUNCTIONS ---

function saveHome() {
    const data = db.get();
    data.hero.title = document.getElementById('edit-hero-title').value;
    data.hero.subtitle = document.getElementById('edit-hero-subtitle').value;
    data.hero.image = document.getElementById('edit-hero-image').value;

    db.save(data);
    alert('Hero Section Updated!');
}

function saveStats() {
    const data = db.get();
    data.stats.students = document.getElementById('edit-stats-students').value;
    data.stats.teachers = document.getElementById('edit-stats-teachers').value;

    db.save(data);
    alert('Statistics Updated!');
    // Update dashboard instantly
    document.getElementById('dash-students').textContent = data.stats.students;
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
