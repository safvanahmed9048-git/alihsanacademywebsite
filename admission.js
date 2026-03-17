document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if returning from Stripe (success)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentStatus = urlParams.get('status');

    if (sessionId) {
        handleSuccessRedirect(sessionId);
    }

    // 2. Setup Form & Photo Upload
    setupPhotoUpload();
    setupFormSubmission();
    setupClassSelectionLogic();
});

function setupClassSelectionLogic() {
    const checkboxes = document.querySelectorAll('input[name="classType"]');
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const val = this.value;
            const isChecked = this.checked;

            if (!isChecked) return; // Only care about checking

            // Values exactly as in HTML
            const VAL_MALAYALAM = 'Malayalam Language Class';
            const VAL_MADRASSA  = 'Moral Class - Madrassa';
            const VAL_BOTH      = 'Both (Malayalam Language Class & Moral Class – Madrasa)';

            if (val === VAL_BOTH) {
                // If "Both" selected, automatically unselect individual Malayalam and Madrasa
                checkboxes.forEach(other => {
                    if (other.value === VAL_MALAYALAM || other.value === VAL_MADRASSA) {
                        other.checked = false;
                    }
                });
            } else if (val === VAL_MALAYALAM || val === VAL_MADRASSA) {
                // If individual Malayalam or Madrasa selected, automatically unselect "Both"
                checkboxes.forEach(other => {
                    if (other.value === VAL_BOTH) {
                        other.checked = false;
                    }
                });
            }
            // Hifz is independent, no logic needed here
        });
    });
}

let studentPhotoBase64 = null;

function setupPhotoUpload() {
    const photoInput = document.getElementById('studentPhoto');
    const photoPreview = document.getElementById('photo-preview');
    const previewImg = document.getElementById('preview-img');
    const btnRemove = document.getElementById('btn-remove-photo');
    const fileError = document.getElementById('file-error');

    photoInput.addEventListener('change', function (e) {
        const file = this.files[0];
        fileError.classList.add('hidden');

        if (!file) {
            photoPreview.classList.add('hidden');
            studentPhotoBase64 = null;
            return;
        }

        // Validate type
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            fileError.textContent = 'Only JPG/PNG images are allowed.';
            fileError.classList.remove('hidden');
            this.value = '';
            studentPhotoBase64 = null;
            return;
        }

        // Validate size (Max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            fileError.textContent = 'File size must be less than 5MB.';
            fileError.classList.remove('hidden');
            this.value = '';
            studentPhotoBase64 = null;
            return;
        }

        // Compress and convert to base64
        compressImage(file, (base64) => {
            studentPhotoBase64 = base64;
            previewImg.src = base64;
            photoPreview.classList.remove('hidden');
        });
    });

    btnRemove.addEventListener('click', () => {
        photoInput.value = '';
        photoPreview.classList.add('hidden');
        studentPhotoBase64 = null;
    });
}

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // output as base64 JPEG at 0.7 quality
            callback(canvas.toDataURL('image/jpeg', 0.7));
        }
    }
}

function setupFormSubmission() {
    const form = document.getElementById('admission-form');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Custom validations
        const checkboxes = document.querySelectorAll('input[name="classType"]:checked');
        const checkboxError = document.getElementById('checkbox-error');
        
        if (checkboxes.length === 0) {
            checkboxError.textContent = 'Please select at least one class type.';
            checkboxError.classList.remove('hidden');
            return;
        } else {
            checkboxError.classList.add('hidden');
        }

        if (!studentPhotoBase64) {
            const fileError = document.getElementById('file-error');
            fileError.textContent = 'Please upload a valid student photo.';
            fileError.classList.remove('hidden');
            return;
        }

        const generalError = document.getElementById('general-error');
        generalError.classList.add('hidden');

        // Collect Form Data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Extract array for checkboxes
        const classTypes = [];
        document.querySelectorAll('input[name="classType"]:checked').forEach(el => classTypes.push(el.value));
        data.classType = classTypes.join(', ');
        data.photoBase64 = studentPhotoBase64;
        data.recaptchaToken = captchaResponse;

        // Save to LocalStorage
        localStorage.setItem('admissionPendingData', JSON.stringify(data));

        // Start Checkout
        showLoader('Preparing Secure Payment Gateway...');
        
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    studentName: data.studentName,
                    className: data.classAdmitted
                })
            });

            const result = await response.json();
            
            if (response.ok && result.url) {
                // Redirect to Stripe
                window.location.href = result.url;
            } else {
                throw new Error(result.error || 'Failed to create payment session.');
            }
        } catch (error) {
            console.error(error);
            hideLoader();
            generalError.textContent = error.message;
            generalError.classList.remove('hidden');
        }
    });
}

async function handleSuccessRedirect(sessionId) {
    document.getElementById('admission-form').classList.add('hidden');
    
    // Check if we have unsubmitted data
    const pendingData = localStorage.getItem('admissionPendingData');
    if (!pendingData) {
        // Data missing (already processed or opened from scratch)
        // Just verify session and show success if already processed
        verifyPaymentOnly(sessionId);
        return;
    }

    const data = JSON.parse(pendingData);
    
    showLoader('Verifying payment and storing admission data...');
    
    try {
        const response = await fetch('/api/submit-admission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                formData: data
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Success!
            localStorage.removeItem('admissionPendingData'); // clear data
            displaySuccess(result.admissionData);
        } else {
            throw new Error(result.error || 'Failed to complete admission.');
        }

    } catch (error) {
        console.error(error);
        hideLoader();
        alert('An error occurred while confirming your admission: ' + error.message + '\n\nPlease contact our support if payment was deducted.');
        // Don't remove local storage so they can retry if it's a network issue
    }
}

async function verifyPaymentOnly(sessionId) {
    showLoader('Verifying session...');
    try {
        const response = await fetch('/api/submit-admission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sessionId })
        });
        const result = await response.json();
        if (response.ok && result.admissionData) {
            displaySuccess(result.admissionData);
        } else {
            hideLoader();
            document.getElementById('admission-form').classList.remove('hidden');
            const targetError = document.getElementById('general-error');
            targetError.textContent = 'Invalid session or admission already processed. Please submit a new form if required.';
            targetError.classList.remove('hidden');
        }
    } catch(e) {
        hideLoader();
        document.getElementById('admission-form').classList.remove('hidden');
    }
}

let savedAdmissionData = null;

function displaySuccess(admissionData) {
    hideLoader();
    savedAdmissionData = admissionData;

    document.getElementById('admission-form').classList.add('hidden');
    const successView = document.getElementById('success-view');
    successView.classList.remove('hidden');

    document.getElementById('succ-student').textContent = admissionData.studentName;
    document.getElementById('succ-adminno').textContent = admissionData.admissionNumber;
    document.getElementById('succ-class').textContent = admissionData.classAdmitted;
    document.getElementById('succ-date').textContent = new Date(admissionData.admissionDate).toLocaleDateString();

    document.getElementById('btn-download-pdf').addEventListener('click', generatePDF);
    
    // Smooth scroll up
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function generatePDF() {
    if(!savedAdmissionData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Colors and margins
    const margin = 20;
    const colPrimary = [10, 48, 92]; // #0a305c
    const colGold = [212, 175, 55]; // #d4af37
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...colPrimary);
    doc.text("AL-IHSAN Academy", margin, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(...colGold);
    doc.text("Admission Receipt", margin, 40);
    
    // Separator line
    doc.setDrawColor(...colPrimary);
    doc.setLineWidth(0.5);
    doc.line(margin, 45, 190, 45);

    // Details setup
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    let yPos = 60;
    const lineSpacing = 10;
    
    const details = [
        { label: "Admission Number:", value: savedAdmissionData.admissionNumber },
        { label: "Student Name:", value: savedAdmissionData.studentName },
        { label: "Guardian Name:", value: savedAdmissionData.guardianName },
        { label: "Class:", value: savedAdmissionData.classAdmitted },
        { label: "Type of Class:", value: savedAdmissionData.classType },
        { label: "Date of Admission:", value: new Date(savedAdmissionData.admissionDate).toLocaleDateString() },
        { label: "Payment ID:", value: savedAdmissionData.paymentId },
        { label: "Amount Paid:", value: "£" + (savedAdmissionData.amountPaid || "35.00") } // Hardcoded typical amount or backend provided
    ];

    details.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.text(item.label, margin, yPos);
        doc.setFont("helvetica", "normal");
        // aligned at 70
        doc.text(String(item.value), 70, yPos);
        yPos += lineSpacing;
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("This is an automatically generated receipt.", margin, 280);
    doc.text("Al-Ihsan Academy, United Kingdom", margin, 285);

    doc.save(`Admission_Receipt_${savedAdmissionData.admissionNumber}.pdf`);
}

function showLoader(txt) {
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('loader-text').textContent = txt;
}
function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}
