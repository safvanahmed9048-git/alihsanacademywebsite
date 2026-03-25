const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function robustFormatKey(key) {
    if (!key) return null;
    let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    let base64 = cleaned;
    if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
        base64 = cleaned.split(/-----BEGIN[^-]+-----/)[1].split(/-----END[^-]+-----/)[0];
    }
    base64 = base64.replace(/\s/g, '');
    if (!base64) return null;
    const lines = base64.match(/.{1,64}/g) || [];
    return `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
}

module.exports = async function handler(req, res) {
    const { session_id, secret } = req.query;

    if (secret !== 'diagnose-ihsan-2024') {
        return res.status(403).json({ error: "Unauthorized" });
    }

    if (!session_id) {
        return res.status(400).json({ error: "Missing session_id" });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        const formData = session.metadata;

        if (!formData || !formData.studentName) {
            return res.status(200).json({ status: "Found", metadata: formData });
        }

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

        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
        const rows = response.data.values || [];
        
        let nextCount = 1;
        if (rows.length > 1) {
            const lastRow = rows[rows.length - 1];
            if (lastRow[0]) {
                const num = parseInt(lastRow[0].slice(-3));
                if (!isNaN(num)) nextCount = num + 1;
            }
        }

        const currentYear = new Date().getFullYear().toString().slice(-2);
        const admissionNumber = `${currentYear}${nextCount.toString().padStart(3, '0')}`;
        const admissionDate = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });

        const rowData = [
            admissionNumber,
            formData.studentName,
            formData.gender || '',
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

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
        });

        res.status(200).json({ status: "Success", admissionNumber });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
