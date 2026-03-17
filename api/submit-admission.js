const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Missing Session ID' });
        }

        // 1. Verify Payment via Stripe to ensure they actually paid
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment has not been completed.' });
        }

        // 2. Setup Google Sheets to poll for the completed Admission Number created by the Webhook
        const credentials = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL || 'your-service-account-email',
            private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        };

        const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
        const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
        const sheets = google.sheets({ version: 'v4', auth });
        const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID; 

        if (!SPREADSHEET_ID || !credentials.private_key || !credentials.client_email) {
             return res.status(500).json({ error: "System configuration error." });
        }

        const RANGE = 'Admissions!A:N';

        // Fetch existing records to check if the Webhook has processed the Session ID yet
        let foundRecord = null;
        try {
             const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
             const rows = response.data.values || [];

             if (rows.length > 1) { // Skip Header
                 for (let i = 1; i < rows.length; i++) {
                     const row = rows[i];
                     if (row[12] === sessionId) {
                         foundRecord = row;
                         break;
                     }
                 }
             }
             
             if (foundRecord) {
                 return res.status(200).json({
                     admissionData: {
                         admissionNumber: foundRecord[0],
                         studentName: foundRecord[1],
                         guardianName: foundRecord[4],
                         classAdmitted: foundRecord[8],
                         classType: foundRecord[9],
                         admissionDate: foundRecord[13],
                         paymentId: sessionId,
                         amountPaid: (session.amount_total / 100).toFixed(2)
                     }
                 });
             } else {
                 // Webhook hasn't processed it yet
                 return res.status(202).json({ message: "Processing payment...", status: "pending" });
             }

        } catch(err) {
             console.error("Sheet read error:", err.message);
             return res.status(500).json({ error: "Database unavailable." });
        }

    } catch (err) {
        console.error("Submit Admission Error:", err);
        res.status(500).json({ error: err.message });
    }
}
