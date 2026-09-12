# Media Pulse – Media Buying Intelligence (Demo)

**Supabase Project:** `Media Pulse` – https://rpbybnbrcyfrqjgqpkxi.supabase.co

> Demo هيكل جاهز – Ad Library (Meta) + Dual Language + Auth + Export – Scraping مباشر + Meta Graph API

## 🔐 البيانات الحساسة
- **SUPABASE_URL:** `https://rpbybnbrcyfrqjgqpkxi.supabase.co`
- **ANON_KEY:** `eyJhbG...3uM` (في `backend/.env` فقط، 600 perms)
- **META_TOKEN:** `EAAPKo...` + APP_ID `1067217365774980` في `backend/.env` فقط – لا يُرفع لـ Git

## 📁 الهيكل
```
media-pulse/
├── backend/
│   ├── main.py (FastAPI)
│   ├── models.py (users, brands, countries, ads, jobs)
│   ├── database.py (SQLite default / Postgres optional)
│   ├── data/regions.py (EG + 6 GCC)
│   ├── services/meta_api.py (Graph API ads_archive)
│   ├── services/meta_scraper.py (Playwright fallback – mock للـ Demo)
│   ├── services/estimation.py (CPM EG $1.5 GCC $6-8)
│   ├── .env (600) + .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/pages/AdLibrary.tsx (Search + Checkbox EG/GCC + Update Now + Export)
│   ├── src/pages/Login.tsx (5 users)
│   ├── src/i18n/{ar,en}.json (Dual)
│   └── src/api/client.ts
├── docker-compose.yml
└── README.md
```

## 🗄️ إعداد الداتابيز – خطوة بخطوة (3 خيارات)

### الخيار A: SQLite المحلي (الافتراضي للـ Demo – لا يحتاج Supabase Password)
- الملف `backend/media_pulse.db` يُنشأ أوتوماتيك عند أول تشغيل
- الجداول تُنشأ من `models.py` + `crud.init_db()` (regions + 7 دول + 5 يوزرز)
- لا تحتاج أي خطوة يدوية

### الخيار B: Supabase Postgres (للـ Cloud)
1. ادخل Supabase → مشروع Media Pulse → `Settings` → `Database`
2. انسخ `Connection string` → `URI` (شكل `postgresql://postgres.rpbybn...:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`)
3. ضع PASSWORD الذي اخترته عند إنشاء المشروع (لو نسيته: `Reset DB Password`)
4. في `backend/.env` غيّر:
   ```
   DATABASE_URL=postgresql://postgres.rpbybnbrcyfrqjgqpkxi:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
5. شغّل Backend – الجداول ستُنشأ تلقائياً

### الخيار C: Supabase SQL Editor (إنشاء يدوي)
- في Supabase → `SQL Editor` → `New Query` → شغّل SQL من `backend/models.py` (أو انسخ من `crud.py: init_db`)
- الجداول: `users, regions, countries, brands, keywords, ads, apps_tracked, app_snapshots, scrape_jobs, settings`

## 👥 اليوزرز الافتراضية (5)
| Username | Password | Role |
|----------|----------|------|
| admin1 | Admin123! | admin |
| admin2 | Admin123! | admin |
| analyst1 | Analyst123! | analyst |
| viewer1 | Viewer123! | viewer |
| viewer2 | Viewer123! | viewer |

تُنشأ أوتوماتيك عند أول تشغيل – JWT 24h

## 🚀 التشغيل

### عبر Docker (موصى به – بدون pip/node محلي)
```bash
cd media-pulse
docker compose up --build
# Backend: http://localhost:8000/docs
# Frontend: http://localhost:5173
# Login: admin1 / Admin123!
```

### محلي (يحتاج Python 3.11 + Node 20)
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (terminal ثاني)
cd frontend
npm install
npm run dev
```

## 🧪 تجربة Demo
1. Login `admin1/Admin123!`
2. في Ad Library اكتب `Vodafone` + اختر `EG, SA` + `Update Now`
3. سترى إعلانات (من Meta API إن نجح، أو Mock Fallback للـ Demo) مع Spend/Impressions تقديري + Disclaimer
4. `Export Excel` ينزل ملف مفصول Per Country

## 🔑 Meta API
- Endpoint: `GET https://graph.facebook.com/v20.0/ads_archive?search_terms={brand}&ad_reached_countries=['EG']&fields=...`
- Fallback للـ Scraping المباشر إذا فشل API
- التوكن في `.env` فقط

## 🌐 Dual Language
- Toggle `AR | EN` في الهيدر – يحفظ في localStorage ويغير `dir=rtl/ltr`

## ⚠️ ملاحظات
- الكريتيف لا يُخزن – `snapshot_url` فقط (fetch live)
- الأرقام تقديرية Range مع Disclaimer واضح
- التحديث On-Demand فقط (زر تحديث) – لا Cron كل ساعتين
- Keywords تُولد Auto + Modal تخصيص
