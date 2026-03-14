const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'); // In production use real env var

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
                        unit_amount: 2000, // £20.00 admission fee (adjustable)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/admission.html?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${req.headers.origin}/admission.html`,
        });

        res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("Stripe Error:", err);
        res.status(500).json({ error: err.message });
    }
}
