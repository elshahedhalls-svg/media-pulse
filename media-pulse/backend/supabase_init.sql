-- Media Pulse – Supabase Init SQL (Option B)
-- شغّل هذا في Supabase Dashboard → SQL Editor → New Query → RUN
-- Project: https://rpbybnbrcyfrqjgqpkxi.supabase.co

-- Enable UUID if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Regions
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  code VARCHAR UNIQUE NOT NULL,
  name_ar VARCHAR,
  is_mena BOOLEAN DEFAULT false
);

-- Countries (EG + GCC)
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  code VARCHAR(5) UNIQUE NOT NULL,
  name_ar VARCHAR,
  region_id INTEGER REFERENCES regions(id),
  is_mena BOOLEAN DEFAULT false,
  arabic_speaking BOOLEAN DEFAULT true
);

-- Users (5)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','analyst','viewer')),
  allowed_features JSONB DEFAULT '[]',
  allowed_platforms JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  phrase VARCHAR NOT NULL,
  language VARCHAR DEFAULT 'en',
  is_auto_generated BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ads
CREATE TABLE IF NOT EXISTS ads (
  id SERIAL PRIMARY KEY,
  ad_archive_id VARCHAR(50) UNIQUE NOT NULL,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  page_name VARCHAR(255),
  page_id VARCHAR(50),
  creative_body TEXT,
  creative_link_title VARCHAR(500),
  creative_link_caption VARCHAR(500),
  snapshot_url TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  duration_days INTEGER,
  countries JSONB DEFAULT '[]',
  platform VARCHAR(20) DEFAULT 'meta',
  status VARCHAR(20) DEFAULT 'active',
  impressions_low INTEGER,
  impressions_high INTEGER,
  spend_low INTEGER,
  spend_high INTEGER,
  is_estimated BOOLEAN DEFAULT true,
  real_spend VARCHAR(50),
  real_impressions VARCHAR(50),
  raw_data JSONB,
  scraped_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_brand ON ads(brand_id);
CREATE INDEX IF NOT EXISTS idx_ads_archive ON ads(ad_archive_id);

-- Apps
CREATE TABLE IF NOT EXISTS apps_tracked (
  id SERIAL PRIMARY KEY,
  store VARCHAR(20) NOT NULL,
  app_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT,
  icon_url TEXT,
  brand_id INTEGER REFERENCES brands(id),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_snapshots (
  id SERIAL PRIMARY KEY,
  app_id INTEGER REFERENCES apps_tracked(id) ON DELETE CASCADE,
  date TIMESTAMP DEFAULT NOW(),
  downloads_est INTEGER,
  reviews_count INTEGER,
  rating_avg FLOAT,
  rating_count INTEGER,
  revenue_est INTEGER,
  country_code VARCHAR(5),
  raw_data JSONB
);

-- Jobs
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id SERIAL PRIMARY KEY,
  brand_name VARCHAR(100) NOT NULL,
  countries VARCHAR(255),
  platform VARCHAR(50),
  job_type VARCHAR(20) DEFAULT 'ads',
  status VARCHAR(20) DEFAULT 'pending',
  results_found INTEGER DEFAULT 0,
  results_saved INTEGER DEFAULT 0,
  error_message TEXT,
  requested_by INTEGER REFERENCES users(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR UNIQUE NOT NULL,
  value TEXT NOT NULL
);

-- Seed Regions & Countries (EG + GCC)
INSERT INTO regions (name, code, name_ar, is_mena) VALUES ('MENA','MENA','الشرق الأوسط وشمال أفريقيا', true) ON CONFLICT (code) DO NOTHING;
-- Use subquery for region_id
INSERT INTO countries (name, code, name_ar, region_id, is_mena, arabic_speaking) VALUES
 ('Egypt','EG','مصر', (SELECT id FROM regions WHERE code='MENA'), true, true),
 ('Saudi Arabia','SA','السعودية', (SELECT id FROM regions WHERE code='MENA'), true, true),
 ('United Arab Emirates','AE','الإمارات', (SELECT id FROM regions WHERE code='MENA'), true, true),
 ('Qatar','QA','قطر', (SELECT id FROM regions WHERE code='MENA'), true, true),
 ('Kuwait','KW','الكويت', (SELECT id FROM regions WHERE code='MENA'), true, true),
 ('Bahrain','BH','البحرين', (SELECT id FROM regions WHERE code='MENA'), true, true),
 ('Oman','OM','عمان', (SELECT id FROM regions WHERE code='MENA'), true, true)
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT 'regions' as table_name, count(*) FROM regions
UNION ALL SELECT 'countries', count(*) FROM countries
UNION ALL SELECT 'users', count(*) FROM users;
