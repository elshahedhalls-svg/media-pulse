"""
Auto Keyword Generator – AR/EN + Variants
"""
import re

# Simple transliteration map for demo (can be replaced with better lib)
AR_TRANSLITERATION = {
    "mubasher": "مباشر",
    "vodafone": "فودافون",
    "careem": "كريم",
    "uber": "أوبر",
    "talabat": "طلبات",
    "noon": "نون",
    "amazon": "امازون",
    "etisalat": "اتصالات",
    "orange": "اورانج",
    "we": "وي",
}

def generate_keywords(brand: str):
    brand_lower = brand.lower().strip()
    keywords = set()
    keywords.add(brand)
    keywords.add(brand_lower)
    # transliteration
    if brand_lower in AR_TRANSLITERATION:
        keywords.add(AR_TRANSLITERATION[brand_lower])
    # Variants with country
    for suffix in [" مصر", " السعودية", " الإمارات", " عروض", " Egypt", " Saudi", " UAE"]:
        keywords.add(f"{brand}{suffix}")
        keywords.add(f"{brand_lower}{suffix}")
    # Clean
    cleaned = [k.strip() for k in keywords if k.strip()]
    return sorted(cleaned)

def suggest_custom_keywords(auto_keywords):
    return {
        "auto_generated": auto_keywords,
        "message": "هل تريد تخصيص الكلمات؟ يمكنك إضافة/حذف أي كلمة.",
        "message_en": "Do you want to customize? You can add/remove any keyword."
    }
