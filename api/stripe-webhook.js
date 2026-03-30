const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function robustFormatKey(key) {
    if (!key) return null;
    let cleaned = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    let base64 = cleaned;
    if (cleaned.includes('BEGIN') && cleaned.includes('END')) {
        const parts = cleaned.split(/-----BEGIN[^-]+-----/);
        if (parts.length > 1) {
            const inner = parts[1].split(/-----END[^-]+-----/);
            if (inner.length > 0) base64 = inner[0];
        }
    }
    base64 = base64.replace(/\s/g, '');
    if (!base64) return null;
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    const lines = base64.match(/.{1,64}/g) || [];
    return `${beginMarker}\n${lines.join('\n')}\n${endMarker}`;
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Disable Vercel's automatic body parser to keep the request stream intact for Stripe signature verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const diagSecret = req.headers['x-diag-secret'];
    const isDiag = diagSecret === 'diagnose-ihsan-2024';

    console.log(`--- Webhook Triggered (Diag: ${isDiag}) ---`);
    
    let event;
    if (isDiag) {
        // Bypass signature for diagnostic simulation
        event = req.body;
        console.log("DIAGNOSTIC BYPASS: Using body as event.");
    } else {
        let buf;
        try {
            buf = await buffer(req);
        } catch (err) {
            console.error("Buffer error:", err.message);
            return res.status(400).send("Buffer Error");
        }

        const sig = req.headers['stripe-signature'];
        try {
            event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
            console.log(`Event verified: ${event.id} [${event.type}]`);
        } catch (err) {
            console.error(`Webhook Signature Verification Failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object;
        const formData = session.metadata;

        console.log("Processing Session:", session.id);
        console.log("Metadata:", JSON.stringify(formData));

        if (!formData || !formData.studentName) {
            console.error("CRITICAL: Metadata missing studentName.");
            return res.status(200).json({ received: true, error: "Metadata Missing" });
        }

        try {
            const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
            const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
            const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);

            const auth = new google.auth.GoogleAuth({
                credentials: { client_email: clientEmail, private_key: privateKey },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const authClient = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });
            const RANGE = 'Admissions!A:P';
            
            const sheetData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
            const rows = sheetData.data.values || [];
            
            let nextCount = 1;
            if (rows.length > 1) {
                const lastRow = rows[rows.length - 1];
                if (lastRow[0]) {
                    const num = parseInt(lastRow[0].slice(-3));
                    if (!isNaN(num)) nextCount = num + 1;
                }
            }

            const admissionNumber = `${new Date().getFullYear().toString().slice(-2)}${nextCount.toString().padStart(3, '0')}`;
            const rowData = [
                admissionNumber, formData.studentName, formData.gender || '', formData.dob || '', formData.guardianName || '',
                formData.email || '', formData.address || '', formData.whatsapp || '', formData.classAdmitted || '',
                formData.classType || '', formData.doj || '', formData.photoUrl || '', session.id, new Date().toISOString(),
                session.payment_intent || '', (session.amount_total / 100).toFixed(2)
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: RANGE,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [rowData] },
            });

            console.log(`SUCCESS: Admission ${admissionNumber} recorded.`);
        } catch (sheetsErr) {
            console.error("Google Sheets Error:", sheetsErr.message);
            return res.status(500).send("Database Error");
        }
    }

    res.status(200).json({ received: true });
};
