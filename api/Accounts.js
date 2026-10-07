export default async function handler(req, res) {
    const scriptURL = process.env.ACCOUNT_GAS_SCRIPT_URL;
    const adminPass = process.env.ACCOUNT_ADMIN_PASSWORD;
    const adminId = process.env.ACCOUNT_ADMIN_ID || "admin";

    // ১. আল্ট্রা-ফাস্ট CORS ও পারফরম্যান্স হেডার
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ২. GET রিকোয়েস্টে Edge Cache হ্যান্ডলিং (যাতে কয়েক মিলিসেকেন্ডেই রেসপন্স চলে আসে)
    if (req.method === 'GET') {
        try {
            // Vercel Edge Cache: ব্রাউজার ১ সেকেন্ড এবং ব্যাকগ্রাউন্ডে ৬০ সেকেন্ড ক্যাশ সাপোর্ট করবে
            res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=59');

            const fetchUrl = scriptURL + (scriptURL.includes('?') ? '&' : '?') + '_t=' + Date.now();
            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: "Google Script-এর সাথে সংযোগ বিচ্ছিন্ন!" });
        }
    }

    // ৩. POST রিকোয়েস্ট (এডমিন অপারেশন)
    if (req.method === 'POST') {
        try {
            const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

            // এডমিন লগিন
            if (bodyData.actionType === 'admin_login') {
                if (bodyData.id === adminId && bodyData.pass === adminPass) {
                    return res.status(200).json({ success: true, role: 'admin' });
                } else {
                    return res.status(401).json({ success: false, message: "ভুল আইডি অথবা পাসওয়ার্ড!" });
                }
            }

            // সিকিউরিটি চেক
            if (bodyData.adminPass !== adminPass) {
                return res.status(401).json({ 
                    error: "Unauthorized", 
                    message: "ভুল পাসওয়ার্ড! তথ্য পরিবর্তন করতে সঠিক এডমিন পাসওয়ার্ড প্রয়োজন।" 
                });
            }

            delete bodyData.adminPass;

            const response = await fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify(bodyData),
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ error: "ডাটা প্রসেস করতে ব্যর্থ হয়েছে!" });
        }
    }
}
