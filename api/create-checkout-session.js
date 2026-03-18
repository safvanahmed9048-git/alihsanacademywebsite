const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { google } = require('googleapis');
const { Readable } = require('stream');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { studentName, className, fullFormData } = req.body;
        
        let photoUrl = '';
        if (fullFormData && fullFormData.photoBase64) {
             function formatPrivateKey(key) {
                 if (!key) return '';
                 let cleaned = key.replace(/['"]/g, '').trim();
                 cleaned = cleaned.replace(/\\n/g, '\n');
                 
                 const begin = '-----BEGIN PRIVATE KEY-----';
                 const end = '-----END PRIVATE KEY-----';
                 
                 if (cleaned.includes(begin) && cleaned.includes(end)) {
                     const base64Content = cleaned.split(begin)[1].split(end)[0].replace(/\s/g, '');
                     const lines = base64Content.match(/.{1,64}/g) || [base64Content];
                     return `${begin}\n${lines.join('\n')}\n${end}`;
                 }
                 
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
             if (credentials.client_email && credentials.private_key) {
                 try {
                     const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
                     const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
                     const drive = google.drive({ version: 'v3', auth });
                     const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

                     if (DRIVE_FOLDER_ID) {
                         const base64Data = fullFormData.photoBase64.replace(/^data:image\/\w+;base64,/, "");
                         const bufferStream = new Readable();
                         bufferStream.push(Buffer.from(base64Data, 'base64'));
                         bufferStream.push(null);

                         const tempId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

                         const fileMetadata = {
                             name: `Student_Pending_${tempId}.jpg`,
                             parents: [DRIVE_FOLDER_ID],
                         };
                         const media = {
                             mimeType: 'image/jpeg',
                             body: bufferStream,
                         };

                         const driveResp = await drive.files.create({
                             resource: fileMetadata,
                             media: media,
                             fields: 'id, webViewLink',
                         });
                         photoUrl = driveResp.data.webViewLink;
                         
                         await drive.permissions.create({
                             fileId: driveResp.data.id,
                             requestBody: { role: 'reader', type: 'anyone' },
                         });
                     }
                 } catch (driveErr) {
                     console.error("Google Drive upload error:", driveErr);
                 }
             }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Admission Fee - ${studentName}`,
                            description: `Admission to ${className}`,
                        },
                        unit_amount: 3500, // £35.00 admission fee
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            metadata: {
                studentName: fullFormData?.studentName?.substring(0, 500) || '',
                gender: fullFormData?.gender?.substring(0, 500) || '',
                dob: fullFormData?.dob?.substring(0, 500) || '',
                guardianName: fullFormData?.guardianName?.substring(0, 500) || '',
                email: fullFormData?.email?.substring(0, 500) || '',
                address: fullFormData?.address?.substring(0, 500) || '',
                whatsapp: fullFormData?.whatsapp?.substring(0, 500) || '',
                classAdmitted: fullFormData?.classAdmitted?.substring(0, 500) || '',
                classType: fullFormData?.classType?.substring(0, 500) || '',
                doj: fullFormData?.doj?.substring(0, 500) || '',
                photoUrl: photoUrl?.substring(0, 500) || ''
            },
            success_url: req.headers.origin 
                ? `${req.headers.origin}/admission.html?session_id={CHECKOUT_SESSION_ID}&status=success`
                : `https://${req.headers.host}/admission.html?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: req.headers.origin
                ? `${req.headers.origin}/admission.html`
                : `https://${req.headers.host}/admission.html`,
        });

        res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("Stripe Error:", err);
        res.status(500).json({ error: err.message });
    }
}
