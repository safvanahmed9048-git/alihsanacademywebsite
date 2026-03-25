const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function robustFormatKey(key) {
    if (!key) return null;
    if (key.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(key);
            if (parsed.private_key) return robustFormatKey(parsed.private_key);
        } catch (e) {}
    }
    let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    const beginMarker = '-----BEGIN PRIVATE KEY-----|-----BEGIN RSA PRIVATE KEY-----'; // Regex compatible
    const endMarker = '-----END PRIVATE KEY-----|-----END RSA PRIVATE KEY-----';
    let base64 = cleaned;
    if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
        base64 = cleaned.split(/-----BEGIN[^-]+-----/)[1].split(/-----END[^-]+-----/)[0];
    }
    base64 = base64.replace(/\s/g, '');
    if (!base64) return null;
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

export default async function handler(req, res) {
    const { session_id, secret } = req.query;

    // Security check: Only allow this to run if a special secret is provided
    if (secret !== 'diagnose-ihsan-2024') {
        return res.status(403).json({ error: "Unauthorized diagnostic request." });
    }

    if (!session_id) {
        return res.status(400).json({ error: "Missing session_id" });
    }

    console.log(`--- Diagnostic Webhook Triggered for Session: ${session_id} ---`);

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (!session) throw new Error("Session not found in Stripe");

        const formData = session.metadata;
        if (!formData || Object.keys(formData).length === 0) {
            return res.status(200).json({ 
                status: "Success (Partial)", 
                message: "Session found but metadata is EMPTY. Admission number cannot be generated.",
                session_id: session.id,
                metadata: formData
            });
        }

        // GOOGLE SETUP
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);

        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const RANGE = 'Admissions!A:N';

        // 1. Get current rows to determine Admission Number
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
        const rows = response.data.values || [];
        
        let nextCount = 1;
        if (rows.length > 1) {
            rows.forEach((row, index) => {
                if (index === 0) return;
                const id = row[0];
                if (id && id.length > 2) {
                    const num = parseInt(id.slice(-3));
                    if (!isNaN(num) && num >= nextCount) nextCount = num + 1;
                }
            });
        }

        const currentYear = new Date().getFullYear().toString().slice(-2);
        const nextCountStr = nextCount.toString().padStart(3, '0');
        const admissionNumber = `${currentYear}${nextCountStr}`;
        const admissionDate = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });

        const rowData = [
            admissionNumber,
            formData.studentName || 'Sample',
            formData.gender || 'Unknown',
            formData.dob || '',
            formData.guardianName || '',
            formData.email || '',
            formData.address || '',
            formData.whatsapp || '',
            formData.classAdmitted || '',
            formData.classType || '',
            formData.dateOfJoining || '',
            formData.photoUrl || '',
            session.id,
            admissionDate
        ];

        // 2. Append to Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
        });

        res.status(200).json({
            status: "Success",
            message: "Row appended successfully bypassing signature check.",
            admissionNumber,
            rowData
        });

    } catch (err) {
        console.error("Diagnostic error:", err.message);
        res.status(500).json({ error: err.message });
    }
}
