# Media Pulse – Media Buying Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> منصة ذكية لتتبع الإعلانات والمنافسين وتحليل المشاعر – دعم كامل للعربية والإنجليزية

## 🚀 Live Demo

| Component | URL |
|-----------|-----|
| **Landing Page** | [media-pulse-landing.vercel.app](https://media-pulse-landing.vercel.app) |
| **Frontend Demo** | [media-pulse.vercel.app](https://media-pulse.vercel.app) |
| **Backend API** | [media-pulse-production.up.railway.app](https://media-pulse-production.up.railway.app) |
| **API Docs** | [media-pulse-production.up.railway.app/docs](https://media-pulse-production.up.railway.app/docs) |

**Demo Credentials:** `admin1` / `Admin123!`

## ✨ Features

- 📊 **Meta Ad Library Monitoring** – Track competitor ads across Facebook, Instagram, Messenger
- 📱 **App Store & Google Play Tracking** – Exact install numbers, ratings, rankings
- 💬 **Sentiment Analysis** – AI-powered analysis using VADER + TextBlob + NRCLex ensemble
- 🔑 **ASO Keywords Generation** – Optimize app store visibility
- 🌍 **Country Analytics** – Track performance across Egypt & GCC countries
- 🎵 **TikTok Integration** – Trending hashtags, videos, ad analytics
- 🌐 **Bilingual Support** – Full Arabic/English with RTL support
- 🔐 **Role-based Auth** – Admin, Analyst, Viewer roles

## 📁 Project Structure

```
media-pulse/
├── backend/                    # FastAPI Backend
│   ├── main.py                 # API routes
│   ├── models.py               # SQLAlchemy models
│   ├── crud.py                 # Database operations
│   ├── services/               # Business logic
│   │   ├── auth.py             # JWT authentication
│   │   ├── brand_sentiment.py  # Sentiment analysis
│   │   ├── playstore.py        # Google Play scraper
│   │   ├── tiktok.py           # TikTok integration
│   │   └── scrapers/           # Multi-source scrapers
│   ├── tests/                  # 90 tests
│   └── requirements.txt
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── pages/              # Main pages
│   │   │   ├── AdLibrary.tsx   # Meta Ad monitoring
│   │   │   ├── AppTracking.tsx # App store tracking
│   │   │   ├── BrandIntelligence.tsx # Sentiment analysis
│   │   │   └── TikTokAds.tsx   # TikTok analytics
│   │   ├── components/         # Shared components
│   │   ├── api/                # API client
│   │   └── i18n/               # Translations (AR/EN)
│   └── package.json
├── landing/                    # Landing page
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── docker-compose.yml
```

## 🛠️ Tech Stack

**Backend:**
- FastAPI + Uvicorn
- SQLAlchemy + PostgreSQL (Supabase)
- VADER + TextBlob + NRCLex (Sentiment)
- Groq LLM (Advanced Analysis)
- DuckDuckGo Search (Web Scraping)

**Frontend:**
- React 18 + TypeScript
- Vite + TailwindCSS 4
- Recharts (Charts)
- i18n (AR/EN)

**Deployment:**
- Backend: Railway
- Frontend: Vercel
- Database: Supabase PostgreSQL

## 👥 Demo Users

| Username | Password | Role |
|----------|----------|------|
| admin1 | Admin123! | admin |
| admin2 | Admin123! | admin |
| analyst1 | Analyst123! | analyst |
| viewer1 | Viewer123! | viewer |
| viewer2 | Viewer123! | viewer |

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (or Supabase account)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env with your database URL

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

### Docker Setup
```bash
docker compose up --build
# Backend: http://localhost:8000/docs
# Frontend: http://localhost:5173
```

## 🧪 Testing

```bash
# Backend tests (90 tests)
cd backend
python -m pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

## 🌍 Supported Countries

| Country | Code |
|---------|------|
| 🇪🇬 Egypt | EG |
| 🇸🇦 Saudi Arabia | SA |
| 🇦🇪 UAE | AE |
| 🇶🇦 Qatar | QA |
| 🇰🇼 Kuwait | KW |
| 🇧🇭 Bahrain | BH |
| 🇴🇲 Oman | OM |

## 📝 License

MIT License - feel free to use for your projects.

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

For questions or support, open an issue on GitHub.
