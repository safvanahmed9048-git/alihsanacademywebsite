const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function robustFormatKey(key) {
    if (!key) return null;
    let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    
    // If it contains markers, extract the content
    let base64 = cleaned;
    if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
        const parts = cleaned.split(/-----BEGIN[^-]+-----/);
        if (parts.length > 1) {
            const inner = parts[1].split(/-----END[^-]+-----/);
            if (inner.length > 0) base64 = inner[0];
        }
    }
    
    // Clean all whitespace
    base64 = base64.replace(/\s/g, '');
    if (!base64) return null;
    
    // Reformat into 64-character lines with proper markers
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    const lines = base64.match(/.{1,64}/g) || [];
    return `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
}

module.exports = async function handler(req, res) {
    const { test_session, secret } = req.query;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripeKeyHint = stripeKey ? `${stripeKey.slice(0, 7)}...${stripeKey.slice(-4)}` : "MISSING";
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);

    let diagnostic = null;

    if (test_session && secret === 'diagnose-ihsan-2024') {
        try {
            const session = await stripe.checkout.sessions.retrieve(test_session);
            const formData = session.metadata;
            if (formData && formData.studentName) {
                const auth = new google.auth.GoogleAuth({
                    credentials: { client_email: clientEmail, private_key: privateKey },
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
                const authClient = await auth.getClient();
                const sheets = google.sheets({ version: 'v4', auth: authClient });
                const RANGE = 'Admissions!A:N';

                const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
                const rows = response.data.values || [];
                let nextCount = rows.length > 1 ? (parseInt(rows[rows.length-1][0].slice(-3)) || 0) + 1 : 1;
                const admissionNumber = `${new Date().getFullYear().toString().slice(-2)}${nextCount.toString().padStart(3, '0')}`;
                const rowData = [admissionNumber, formData.studentName, formData.gender, formData.dob, formData.guardianName, formData.email, formData.address, formData.whatsapp, formData.classAdmitted, formData.classType, formData.dateOfJoining, formData.photoUrl, session.id, new Date().toISOString()];

                await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: RANGE, valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] } });
                diagnostic = { status: "Row Appended Successfully", admissionNumber };
            } else {
                diagnostic = { status: "Found Session but NO metadata", metadata: formData };
            }
        } catch (diagErr) {
            diagnostic = { status: "Error", message: diagErr.message };
        }
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Admissions!A1:B2' });
        res.status(200).json({
            timestamp: new Date().toISOString(),
            stripe: { keyHint: stripeKeyHint },
            google: { status: "Healthy", rowCount: (response.data.values || []).length, keyLength: privateKey ? privateKey.length : 0 },
            diagnostic
        });
    } catch (err) {
        res.status(200).json({
            timestamp: new Date().toISOString(),
            stripe: { keyHint: stripeKeyHint },
            google: { status: "Error", message: err.message, keyLength: privateKey ? privateKey.length : 0 },
            diagnostic
        });
    }
}
