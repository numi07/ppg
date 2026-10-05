export default async function handler(req, res) {
    // Vercel Environment Variables থেকে ডাটা নেওয়া
    const scriptURL = process.env.ACCOUNT_GAS_SCRIPT_URL;
    const adminPass = process.env.ACCOUNT_ADMIN_PASSWORD;
    const adminId = process.env.ACCOUNT_ADMIN_ID || "admin"; // ডিফল্ট admin

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

    // ৩. GET রিকোয়েস্ট (ডাটা পড়া)
    if (req.method === 'GET') {
        try {
            const response = await fetch(scriptURL);
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: "Google Script-এর সাথে সংযোগ বিচ্ছিন্ন!" });
        }
    }

    // ৪. POST রিকোয়েস্ট (লগিন ও ডাটা এন্ট্রি)
    if (req.method === 'POST') {
        try {
            const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

            // [নতুন] এডমিন লগিন চেক লজিক
            if (bodyData.actionType === 'admin_login') {
                if (bodyData.id === adminId && bodyData.pass === adminPass) {
                    return res.status(200).json({ success: true, role: 'admin' });
                } else {
                    return res.status(401).json({ success: false, message: "ভুল আইডি অথবা পাসওয়ার্ড!" });
                }
            }

            // অন্যান্য ডেটা সেভ/আপডেট/ডিলিট এর জন্য পাসওয়ার্ড ভেরিফিকেশন
            if (bodyData.adminPass !== adminPass) {
                return res.status(401).json({ 
                    error: "Unauthorized", 
                    message: "সরাসরি এক্সেস বা ভুল পাসওয়ার্ড! তথ্য পরিবর্তন করতে সঠিক এডমিন পাসওয়ার্ড প্রয়োজন।" 
                });
            }

            // গুগল স্ক্রিপ্টে পাঠানোর আগে পাসওয়ার্ড রিমুভ করে দেওয়া হচ্ছে (সিকিউরিটির জন্য)
            delete bodyData.adminPass;

            const response = await fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify(bodyData),
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ error: "ডাটা প্রসেস করতে ব্যর্থ হয়েছে!" });
        }
    }
}
