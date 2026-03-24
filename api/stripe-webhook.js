const { google } = require('googleapis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Readable } = require('stream');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Specify we want the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw body stream
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    console.log("--- Webhook Triggered ---");
    let buf;
    try {
        buf = await buffer(req);
        console.log(`Raw body buffered. Length: ${buf.length}`);
    } catch (bufErr) {
        console.error("Buffer error:", bufErr.message);
        return res.status(400).send("Buffer Error");
    }

    const sig = req.headers['stripe-signature'];
    console.log(`Signature header present: ${!!sig}`);

    if (!endpointSecret) {
        console.error("Webhook Secret is MISSING from environment variables!");
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
        console.log(`Event verified: ${event.id} [${event.type}]`);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        // Log a hint about the secret (first/last characters)
        if (endpointSecret) {
            console.log(`Secret Hint: ${endpointSecret.slice(0, 5)}...${endpointSecret.slice(-5)}`);
        }
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle both completed and async succeeded
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object;
        const formData = session.metadata;

        console.log(`Processing Session: ${session.id} | Mode: ${session.livemode ? 'LIVE' : 'TEST'}`);
        console.log(`Metadata received: ${!!formData} | Student Name: ${formData?.studentName || 'MISSING'}`);

        if (formData && formData.studentName) {
            try {
                const num = await processGoogleSheetsAndDrive(session, formData);
                if (num) {
                    console.log(`Admission Number Generated: ${num}`);
                    await sendSuccessEmail(session, formData, num);
                } else {
                    console.error("processGoogleSheetsAndDrive returned null");
                }
            } catch (err) {
                console.error("Webhook Business Logic Error:", err.message);
                // We return 500 here so Stripe retries
                return res.status(500).send(`Processing Error: ${err.message}`);
            }
        } else {
            console.warn("Webhook skipped: Missing metadata or studentName in session object.");
        }
    } else {
        console.log(`Skipping unhandled event type: ${event.type}`);
    }

    res.status(200).send({ received: true });
}

async function processGoogleSheetsAndDrive(session, formData) {
    function robustFormatKey(key) {
        if (!key) return null;
        if (key.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(key);
                if (parsed.private_key) return robustFormatKey(parsed.private_key);
            } catch (e) {}
        }
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

    const privateKey = robustFormatKey(process.env.GOOGLE_PRIVATE_KEY);
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

    if (!SPREADSHEET_ID || !privateKey || !clientEmail) {
        console.error("Webhook Error: Missing Google Configuration", { 
            hasSpreadsheetId: !!SPREADSHEET_ID, 
            hasPrivateKey: !!privateKey, 
            hasClientEmail: !!clientEmail 
        });
        return null;
    }

    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];
    
    // Switch back to GoogleAuth for better reliability
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: SCOPES,
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const RANGE = 'Admissions!A:N';

    console.log(`Processing admission for Session: ${session.id}`, {
        hasSpreadsheetId: !!SPREADSHEET_ID,
        hasPrivateKey: !!privateKey,
        privateKeyStart: privateKey ? privateKey.slice(0, 30) : "null",
        hasClientEmail: !!clientEmail
    });

    // 1. Fetch existing records
    let currentYear = new Date().getFullYear().toString().slice(-2);
    let nextCount = 1;

    try {
         const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE });
         const rows = response.data.values || [];
         console.log(`Fetched ${rows.length} rows from sheet.`);

         if (rows.length > 1) { // Skip Header
             for (let i = 1; i < rows.length; i++) {
                 const row = rows[i];
                 if (row[12] && row[12].trim() === session.id.trim()) {
                     console.log(`Duplicate session found at row ${i+1}. Returning existing admission number: ${row[0]}`);
                     return row[0];
                 }
                 const adNum = row[0];
                 if (adNum && adNum.startsWith(currentYear)) {
                     const count = parseInt(adNum.slice(2), 10);
                     if (!isNaN(count) && count >= nextCount) {
                         nextCount = count + 1;
                     }
                 }
             }
         }
    } catch(err) {
         console.error("Webhook Sheet Read Error:", err.message);
    }

    const nextCountStr = nextCount.toString().padStart(3, '0');
    const admissionNumber = `${currentYear}${nextCountStr}`;
    const photoUrl = formData.photoUrl || '';
    const admissionDate = new Date().toISOString();

    const rowData = [
        admissionNumber,
        formData.studentName,
        formData.gender,
        formData.dob,
        formData.guardianName,
        formData.email,
        formData.address,
        formData.whatsapp,
        formData.classAdmitted,
        formData.classType,
        formData.doj,
        photoUrl,
        session.id,
        admissionDate
    ];

    try {
        console.log(`Attempting to append row for ${admissionNumber}...`);
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
        });
        console.log(`Successfully appended row for ${admissionNumber}.`);
    } catch (err) {
        console.error("Webhook Sheet Append Error:", err.message);
        throw err; // Re-throw to be caught in the main handler's try-catch
    }

    return admissionNumber;
}

async function sendSuccessEmail(session, formData, admissionNumber) {
    if (!process.env.RESEND_API_KEY) return;
    
    const amount = (session.amount_total / 100).toFixed(2);
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0a305c; padding: 20px; text-align: center;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Al Ihsan Academy</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #333333; margin-top: 0;">Payment Successful</h2>
                <p style="color: #555555; font-size: 16px;">Dear ${formData.guardianName},</p>
                <p style="color: #555555; font-size: 16px;">Your admission has been successfully registered.</p>
                
                <div style="background-color: #f9f9f9; border-left: 4px solid #d4af37; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #333333; font-size: 18px;"><strong>Admission Number:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #0a305c; font-size: 28px; font-weight: bold;">${admissionNumber}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Student Name:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">${formData.studentName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Email:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">${formData.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Payment Amount:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">£${amount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #666666;">Payment Date:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; color: #333333; font-weight: bold; text-align: right;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666666;">Transaction ID:</td>
                        <td style="padding: 10px 0; color: #333333; font-weight: bold; text-align: right; font-size: 12px; word-break: break-all;">${session.id}</td>
                    </tr>
                </table>

                <p style="color: #555555; font-size: 14px; text-align: center;">Please save your Admission Number for future reference.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; color: #888888; font-size: 12px;">
                <p style="margin: 0;">This is an automated receipt from Al Ihsan Academy, United Kingdom.</p>
            </div>
        </div>
    `;

    try {
        await resend.emails.send({
            from: 'Al Ihsan Academy <admissions@alihsanacademy.uk>', // Must be a verified domain in Resend
            to: formData.email,
            subject: 'Admission Payment Receipt - Al Ihsan Academy',
            html: htmlContent
        });
    } catch (e) {
        console.error("Email sending failed:", e);
    }
}
