const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { studentName, className, recaptchaToken } = req.body;
        
        // reCAPTCHA disabled per user request

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp', // Change as per location
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
                // Stripe limits metadata values to 500 characters, so we only pass the essentials.
                // We'll pass the full formData so the webhook can process it, but note that 
                // large photoBase64 fields can't go in metadata directly without truncation.
                // We need to omit the photoBase64 from metadata due to the 500 character limit.
                // A better approach is storing formData temporarily in a database/KV store keyed by a random ID,
                // but for this small change, we'll store everything except the photo.
                formData: JSON.stringify(Object.fromEntries(
                    Object.entries(req.body.fullFormData || {}).filter(([key]) => key !== 'photoBase64')
                ))
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
