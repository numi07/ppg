export default async function handler(req, res) {
    // Vercel Environment Variables থেকে ডাটা নেওয়া
    const scriptURL = process.env.ACCOUNT_GAS_SCRIPT_URL;
    const adminPass = process.env.ACCOUNT_ADMIN_PASSWORD;

    // ১. ডোমেইন সিকিউরিটি চেক
    const allowedDomains = ["ppgroup.vercel.app", "vercel.app", "localhost"];
    const referer = req.headers.referer || "";
    const isAllowedSource = allowedDomains.some(domain => referer.includes(domain)) || !referer;

    // ২. হেডার সেটআপ (CORS Security)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ৩. GET রিকোয়েস্ট (ডাটা পড়া) - সাধারণ ইউজারদের জন্য ওপেন (পাসওয়ার্ড ছাড়া)
    if (req.method === 'GET') {
        try {
            const response = await fetch(scriptURL);
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: "Google Script-এর সাথে সংযোগ বিচ্ছিন্ন!" });
        }
    }

    // ৪. POST রিকোয়েস্ট (ডাটা এন্ট্রি / ডিলিট) - শুধুমাত্র এডমিন পাসওয়ার্ড দিয়ে এক্সেসযোগ্য
    if (req.method === 'POST') {
        try {
            const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            
            // এডমিন এক্সেস যাচাই
            if (bodyData.adminPass !== adminPass) {
                return res.status(401).json({ 
                    error: "Unauthorized", 
                    message: "সরাসরি এক্সেস বা ভুল পাসওয়ার্ড! তথ্য পরিবর্তন করতে এডমিন প্যানেল ব্যবহার করুন।" 
                });
            }

            // পাসওয়ার্ড সরিয়ে শুধু মূল ডাটা GAS এ পাঠানো
            delete bodyData.adminPass;

            const response = await fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify(bodyData),
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ error: "ডাটা সেভ করতে ব্যর্থ হয়েছে!" });
        }
    }
}
