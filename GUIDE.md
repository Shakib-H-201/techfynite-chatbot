# TechFynite Custom AI Chatbot - সম্পূর্ণ গাইড

এই প্রজেক্টে দুইটা অংশ আছে:
1. **backend/** - একটা ছোট server (Python + FastAPI) যেটা Claude AI এর সাথে কথা বলে এবং reply পাঠায়
2. **widget/** - একটা ফাইল (`techfynite-chat-widget.js`) যেটা আপনার Framer website এ বসাবেন

নিচে ধাপে ধাপে সব লেখা আছে - কম্পিউটারে টার্মিনাল/কমান্ড লাইন চালানো থেকে শুরু করে Framer এ বসানো পর্যন্ত।

---

## ধাপ ০: যা যা লাগবে (একবারই সেটআপ করতে হবে)

1. **Python** ইনস্টল থাকা লাগবে (3.10 বা তার উপরে) - [python.org](https://python.org) থেকে ডাউনলোড করুন
2. **Google Gemini API Key (সম্পূর্ণ ফ্রি)** - [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) এ যান, Google account দিয়ে লগইন করুন, **"Create API Key"** এ ক্লিক করুন। কোনো কার্ড বা payment info লাগবে না। Key টা কপি করে রাখুন।
3. এই প্রজেক্টের ফাইলগুলো আপনার কম্পিউটারে রাখুন

> **নোট:** Gemini এর ফ্রি টিয়ারে দৈনিক request limit আছে (প্রতিদিন প্রায় ১৫০০ request, Flash মডেলে)। ছোট/মাঝারি ব্যবসার chatbot এর জন্য এটা যথেষ্ট। ফ্রি টিয়ারে যা পাঠাবেন সেটা Google তাদের product উন্নত করতে ব্যবহার করতে পারে, তাই কোনো sensitive/private ডেটা না পাঠানোই ভালো।

---

## ধাপ ১: Backend নিজের কম্পিউটারে চালিয়ে টেস্ট করা

টার্মিনাল/কমান্ড প্রম্পট খুলে backend ফোল্ডারে যান:

```bash
cd techfynite-chatbot/backend
```

### ১.১ - Virtual environment বানান (ঐচ্ছিক কিন্তু ভালো অভ্যাস)
```bash
python3 -m venv venv
source venv/bin/activate        # Windows এ: venv\Scripts\activate
```

### ১.২ - Library গুলো ইনস্টল করুন
```bash
pip install -r requirements.txt
```

### ১.৩ - `.env` ফাইল বানান
`.env.example` ফাইলটা copy করে নাম দিন `.env`, তারপর ভিতরে আপনার আসল API key বসান:

```bash
cp .env.example .env
```

`.env` ফাইল খুলে এভাবে বসান:
```
GEMINI_API_KEY=AIzaSy-এখানে-আপনার-আসল-কী
ALLOWED_ORIGIN=https://www.techfynite.com
MODEL_NAME=gemini-2.5-flash
```

### ১.৪ - Server চালু করুন
```bash
uvicorn main:app --reload --port 8000
```

টার্মিনালে এমন লেখা আসবে: `Uvicorn running on http://127.0.0.1:8000`

### ১.৫ - টেস্ট করুন এটা কাজ করছে কিনা
ব্রাউজারে যান: `http://127.0.0.1:8000/health` - যদি `{"status":"ok"}` দেখা যায়, তার মানে সার্ভার ঠিকমতো চলছে।

---

## ধাপ ২: Widget নিজের কম্পিউটারে টেস্ট করা

Backend চালু রেখেই, `widget/test-page.html` ফাইলটা সরাসরি ডাবল-ক্লিক করে ব্রাউজারে খুলুন (অথবা VS Code এ "Live Server" extension দিয়ে খুলুন)।

- নিচের ডান কোণায় একটা কালো chat bubble দেখা যাবে
- ক্লিক করলে chat panel খুলবে এবং একটা welcome message দেখাবে
- কিছু লিখে পাঠালে সেটা আপনার local backend এ যাবে এবং Claude এর reply ফিরে আসবে

**যদি reply না আসে:** browser এর DevTools (F12) খুলে Console/Network ট্যাবে error দেখুন - সাধারণত API key ভুল বসানো বা backend চালু নেই এই দুটোই কারণ হয়।

---

## ধাপ ৩: Backend কে Internet এ Deploy করা (Railway ব্যবহার করে)

লোকাল কম্পিউটারে backend শুধু আপনার নিজের ব্রাউজারে কাজ করবে। পুরো দুনিয়ার visitor দের জন্য কাজ করতে হলে এটাকে একটা server এ রাখতে হবে। **Railway** সবচেয়ে সহজ এবং ফ্রি tier দিয়ে শুরু করা যায়।

### ৩.১ - GitHub এ কোড আপলোড করুন
1. [github.com](https://github.com) এ একটা নতুন **repository** বানান (যেমন `techfynite-chatbot`)
2. আপনার `backend/` ফোল্ডারের সব ফাইল push করুন (`.env` ফাইলটা **push করবেন না** - এটাতে secret key থাকে)

Terminal এ:
```bash
cd techfynite-chatbot/backend
git init
git add .
echo ".env" >> .gitignore
echo "venv/" >> .gitignore
git add .gitignore
git commit -m "Initial commit - TechFynite chatbot backend"
git branch -M main
git remote add origin https://github.com/আপনার-ইউজারনেম/techfynite-chatbot.git
git push -u origin main
```

### ৩.২ - Railway এ Deploy করুন
1. [railway.app](https://railway.app) এ গিয়ে GitHub দিয়ে sign up করুন
2. **"New Project" → "Deploy from GitHub repo"** বেছে নিন
3. আপনার `techfynite-chatbot` repository সিলেক্ট করুন
4. Railway নিজে থেকেই Python detect করে নেবে

### ৩.৩ - Environment Variables বসান
Railway dashboard এ আপনার project এ ঢুকে **Variables** ট্যাবে গিয়ে যোগ করুন:
- `GEMINI_API_KEY` = আপনার আসল key
- `ALLOWED_ORIGIN` = `https://www.techfynite.com`
- `MODEL_NAME` = `gemini-2.5-flash`

### ৩.৪ - Start Command সেট করুন
Railway এর **Settings** ট্যাবে "Start Command" এ বসান:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### ৩.৫ - Deploy সম্পন্ন হলে URL কপি করুন
Deploy শেষ হলে Railway আপনাকে একটা URL দেবে, যেমন:
`https://techfynite-chatbot-production.up.railway.app`

এই URL ব্রাউজারে গিয়ে `/health` যোগ করে চেক করুন (`.../health`) - `{"status":"ok"}` দেখা গেলে আপনার backend লাইভ।

> **বিকল্প:** Railway এর বদলে Render.com ও ব্যবহার করতে পারেন - পদ্ধতি প্রায় একই।

---

## ধাপ ৪: Widget কে Internet এ হোস্ট করা

`techfynite-chat-widget.js` ফাইলটাও কোথাও host করতে হবে যাতে Framer সেটা load করতে পারে। সবচেয়ে সহজ উপায়:

### বিকল্প A: GitHub + jsDelivr (ফ্রি, সবচেয়ে সহজ)
1. এই `widget/` ফোল্ডারও GitHub এ push করুন (backend এর মতোই, আলাদা repo বা একই repo এর ভিন্ন ফোল্ডারে)
2. jsDelivr স্বয়ংক্রিয়ভাবে যেকোনো public GitHub repo কে CDN link দিয়ে দেয়:
   ```
   https://cdn.jsdelivr.net/gh/আপনার-ইউজারনেম/techfynite-chatbot@main/widget/techfynite-chat-widget.js
   ```

### বিকল্প B: Railway/Render এ static file হিসেবে
Backend এর সাথেই একটা `/widget.js` route বানিয়ে ফাইলটা serve করা যায় (চাইলে আমি এটাও যোগ করে দিতে পারি)।

---

## ধাপ ৫: Framer এ Embed করা

1. আপনার Framer project খুলুন
2. বাম পাশে **Site Settings** (gear/⚙️ icon) এ ক্লিক করুন
3. **Custom Code** সেকশনে যান
4. **"End of `<body>` tag"** বক্সে এই কোডটা বসান, কিন্তু দুটো জায়গা বদলে দিন:
   - `src` → আপনার widget এর আসল URL (ধাপ ৪ থেকে)
   - `data-api-url` → আপনার backend এর আসল URL (ধাপ ৩.৫ থেকে)

```html
<script
  src="https://cdn.jsdelivr.net/gh/আপনার-ইউজারনেম/techfynite-chatbot@main/widget/techfynite-chat-widget.js"
  data-api-url="https://techfynite-chatbot-production.up.railway.app"
></script>
```

5. উপরে ডান দিকে **Publish** বাটনে ক্লিক করুন

এখন আপনার লাইভ website এ গিয়ে দেখুন - নিচের ডান কোণায় chat bubble থাকবে, এবং এটা এখন সত্যিকারের Claude AI দিয়ে চলবে, আপনার নিজের business data অনুযায়ী উত্তর দেবে।

---

## ধাপ ৬: Bot এর Business Info Update করা

`backend/knowledge_base.py` ফাইলে `COMPANY_KNOWLEDGE` অংশে আপনার সব তথ্য প্লেইন টেক্সটে লেখা আছে (services, pricing, contact info ইত্যাদি)। কিছু বদলাতে চাইলে:

1. এই ফাইলটা edit করুন
2. GitHub এ commit ও push করুন
3. Railway স্বয়ংক্রিয়ভাবে নতুন version deploy করে দেবে (কয়েক মিনিটের মধ্যে)

কোনো code জানার দরকার নেই এই ফাইল edit করতে - এটা শুধু plain English/Bangla টেক্সট।

---

## ধাপ ৭: Lead গুলো কোথায় জমা হয়

`backend/main.py` তে একটা `/lead` endpoint আছে যেটা নাম-ইমেইল সেভ করে `backend/leads.json` ফাইলে। এটা শুরুর জন্য যথেষ্ট, কিন্তু client সংখ্যা বাড়লে ভালো হয়:
- Google Sheet এ পাঠানো (Google Sheets API দিয়ে)
- অথবা সরাসরি আপনার email এ পাঠানো (SendGrid/Resend দিয়ে)

চাইলে আমি এই দুটোর যেকোনো একটা যোগ করে দিতে পারি।

---

## সংক্ষেপে পুরো Flow

```
Visitor আপনার site এ যায়
        ↓
widget.js load হয় (Framer থেকে) → chat bubble দেখা যায়
        ↓
Visitor মেসেজ পাঠায় → widget backend এর /chat এ POST করে
        ↓
Backend (Railway তে চলছে) → Claude API কে জিজ্ঞেস করে (আপনার knowledge_base.py সহ)
        ↓
Claude এর reply → backend widget কে ফেরত পাঠায় → visitor দেখে
```

---

## সাধারণ সমস্যা ও সমাধান

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| Chat bubble দেখাই যাচ্ছে না | Custom code ঠিক জায়গায় বসেনি, বা publish হয়নি | Site Settings > Custom Code চেক করুন, আবার Publish করুন |
| "trouble connecting" মেসেজ আসছে | Backend URL ভুল, বা backend ডাউন | Railway dashboard এ গিয়ে logs দেখুন, `/health` চেক করুন |
| CORS error (browser console এ) | `ALLOWED_ORIGIN` ভুল বসানো | Railway Variables এ গিয়ে আপনার আসল domain বসান |
| উত্তর ভুল/অপ্রাসঙ্গিক আসছে | knowledge_base.py তে তথ্য কম/ভুল | সেই ফাইলে সঠিক তথ্য যোগ করুন |

---

এই setup টা সম্পূর্ণ হলে আপনার কাছে একটা পুরো **custom, self-hosted, সম্পূর্ণ ফ্রি AI chatbot** থাকবে - Chatbase এর মতো কোনো মাসিক ফি নেই, Gemini API এর কোনো খরচও নেই (ফ্রি টিয়ারের ভেতরে থাকলে)। ভবিষ্যতে বড় client এর জন্য বানালে চাইলে `knowledge_base.py` ও `MODEL_NAME` বদলে সহজেই Claude/Anthropic এ upgrade করা যাবে (কোড স্ট্রাকচার প্রায় একই থাকবে) - এই একই প্রজেক্ট সামান্য পরিবর্তন করে ভবিষ্যতে client দের কাছেও বিক্রি করতে পারবেন।
