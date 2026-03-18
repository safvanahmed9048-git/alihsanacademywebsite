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
        function formatPrivateKey(key) {
            if (!key) return '';
            // Remove any surrounding quotes and whitespace
            let cleaned = key.replace(/['"]/g, '').trim();
            // Convert literal \n strings to actual newlines
            cleaned = cleaned.replace(/\\n/g, '\n');
            
            // Extract the core base64 content if headers exist
            const begin = '-----BEGIN PRIVATE KEY-----';
            const end = '-----END PRIVATE KEY-----';
            
            if (cleaned.includes(begin) && cleaned.includes(end)) {
                const base64Content = cleaned.split(begin)[1].split(end)[0].replace(/\s/g, '');
                // Correctly wrap it back into 64-character lines
                const lines = base64Content.match(/.{1,64}/g) || [base64Content];
                return `${begin}\n${lines.join('\n')}\n${end}`;
            }
            
            // If it's just raw base64 without headers, add them
            if (!cleaned.includes('-----BEGIN')) {
                const base64 = cleaned.replace(/\s/g, '');
                const lines = base64.match(/.{1,64}/g) || [base64];
                return `${begin}\n${lines.join('\n')}\n${end}`;
            }
            
            return cleaned;
        }

        let privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY || '');
        
        const credentials = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
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
             return res.status(500).json({ error: `Database read error: ${err.message}` });
        }

    } catch (err) {
        console.error("Submit Admission Error:", err.message); // Updated to include err.message
        res.status(500).json({ error: err.message });
    }
}
