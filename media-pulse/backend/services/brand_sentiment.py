"""
Brand Sentiment Engine — تحليل مشاعر البراند من مصادر متعددة
يجمع البيانات من Twitter, Reddit, News باستخدام Scraper Provider
 ويحلل المشاعر باستخدام Groq LLM + VADER + TextBlob + NRCLex ensemble
"""
import asyncio
import os
import json
from datetime import datetime
from textblob import TextBlob
from groq import Groq
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from deep_translator import MyMemoryTranslator
from nrclex import NRCLex

# Scraper provider
from .scrapers import get_scraper, list_providers

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# VADER instance (rule-based, fast, English)
vader = SentimentIntensityAnalyzer()


def get_groq_client():
    try:
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"[Brand Sentiment] Groq init error: {e}")
        return None


# =====================================================
# LANGUAGE DETECTION & TRANSLATION
# =====================================================

def detect_language(text: str) -> str:
    """Simple heuristic: if >30% Arabic chars, return 'ar', else 'en'"""
    if not text:
        return "en"
    arabic_count = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    return "ar" if arabic_count / max(len(text), 1) > 0.3 else "en"


def translate_to_english(text: str) -> str:
    """Translate Arabic text to English using MyMemory Translator"""
    try:
        return MyMemoryTranslator(source='ar-EG', target='en-GB').translate(text)
    except Exception:
        try:
            return MyMemoryTranslator(source='ar-SA', target='en-GB').translate(text)
        except Exception:
            # Fallback: simple Arabic sentiment dictionary
            return text  # fallback to original


# Simple Arabic sentiment dictionary for fallback
ARABIC_SENTIMENT_DICT = {
    # Positive words (multiple forms)
    "ممتاز": 0.8, "ممتازة": 0.8, "رائع": 0.7, "رائعة": 0.7,
    "جيد": 0.5, "جيدة": 0.5, "أحب": 0.6, "حب": 0.6,
    "مميز": 0.6, "مميزة": 0.6, "سهل": 0.4, "سهلة": 0.4,
    "سريع": 0.4, "سريعة": 0.4, "آمن": 0.5, "آمنة": 0.5,
    "مفيد": 0.5, "مفيدة": 0.5, "جميل": 0.6, "جميلة": 0.6,
    "مبدع": 0.7, "مبدعة": 0.7, "متطور": 0.6, "متطورة": 0.6,
    "مريح": 0.5, "مريحة": 0.5, "مقبول": 0.4, "مقبولة": 0.4,
    "فعال": 0.5, "فاعلة": 0.5, "موثوق": 0.6, "موثوقة": 0.6,
    "محترف": 0.6, "محترفة": 0.6, "محدث": 0.4, "محدثة": 0.4,
    "مجاني": 0.5, "مجانية": 0.5, "متوفرة": 0.3,
    "يعمل": 0.5, "تعمل": 0.5, "شغال": 0.5, "شغالة": 0.5,
    # Negative words (multiple forms)
    "سيء": -0.7, "سيئة": -0.7, "سيئ": -0.7, "سيئات": -0.7,
    "ضعيف": -0.5, "ضعيفة": -0.5, "بطيء": -0.5, "بطيئة": -0.5,
    "صعب": -0.4, "صعبة": -0.4, "مشكلة": -0.5, "مشاكل": -0.5,
    "خطأ": -0.6, "أخطاء": -0.6, "محبط": -0.6, "محبطة": -0.6,
    "مرتفع": -0.3, "مرتفعة": -0.3, "مكلف": -0.4, "مكلفة": -0.4,
    "غير": -0.3, "مش": -0.2, "لا يعمل": -0.6, "لا تعمل": -0.6,
    "بطيء": -0.5, "بطيئة": -0.5, "سي": -0.5, "سج": -0.5,
    # Intensifiers (multiply sentiment)
    "جداً": 1.5, "للغاية": 1.5, "كثير": 1.3, "خالص": 1.4,
    " جدا": 1.5, "للغاية": 1.5,
    # Negation words (flip sentiment)
    "ليس": -1, "لم": -1, "لا": -1, "مش": -0.8, "لا يعمل": -0.7, "لا تعمل": -0.7,
    # Common phrases
    "لا يعمل": -0.7, "لا تعمل": -0.7, "misbehaving": -0.6, "يعلق": -0.5, "تجمد": -0.6,
}


def analyze_arabic_sentiment(text: str) -> dict:
    """Simple Arabic sentiment analysis using dictionary lookup with intensifiers and negation"""
    words = text.split()
    scores = []
    intensifier = 1.0
    negate = False
    
    for i, word in enumerate(words):
        # Check for intensifiers
        if word in ["جداً", "للغاية", "كثير", "خالص"]:
            intensifier = 1.5
            continue
        
        # Check for negation
        if word in ["ليس", "لم", "لا", "مش"]:
            negate = True
            continue
        
        # Look up word in dictionary
        if word in ARABIC_SENTIMENT_DICT:
            score = ARABIC_SENTIMENT_DICT[word] * intensifier
            if negate:
                score = -score  # Flip sentiment
                negate = False
            scores.append(score)
            intensifier = 1.0  # Reset intensifier after use
    
    if scores:
        avg_score = sum(scores) / len(scores)
        # Normalize to [-1, 1]
        avg_score = max(-1, min(1, avg_score))
        label = "positive" if avg_score > 0.1 else "negative" if avg_score < -0.1 else "neutral"
        return {"score": avg_score, "label": label, "source": "arabic_dict"}
    
    return {"score": 0, "label": "neutral", "source": "arabic_dict"}


# =====================================================
# SENTIMENT ANALYSIS — 3 ENGINES
# =====================================================

def analyze_sentiment_vader(text: str) -> dict:
    """VADER sentiment with auto-translation for Arabic"""
    lang = detect_language(text)
    analysis_text = translate_to_english(text) if lang == "ar" else text

    scores = vader.polarity_scores(analysis_text)
    compound = scores['compound']

    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    return {"score": compound, "label": label, "source": "vader", "lang": lang}


def analyze_sentiment_textblob(text: str) -> dict:
    """TextBlob sentiment with auto-translation for Arabic"""
    lang = detect_language(text)
    analysis_text = translate_to_english(text) if lang == "ar" else text

    try:
        blob = TextBlob(analysis_text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        if polarity > 0.1:
            label = "positive"
        elif polarity < -0.1:
            label = "negative"
        else:
            label = "neutral"
        return {"score": polarity, "subjectivity": subjectivity, "label": label, "source": "textblob", "lang": lang}
    except Exception:
        return {"score": 0, "subjectivity": 0, "label": "neutral", "source": "textblob", "lang": lang}


def analyze_sentiment_ensemble(text: str) -> dict:
    """Ensemble: VADER (40%) + TextBlob (30%) + NRCLex emotions (30%) — no API needed"""
    lang = detect_language(text)
    
    # For Arabic, try translation first, then fallback to dictionary
    if lang == "ar":
        translated = translate_to_english(text)
        if translated == text:  # Translation failed
            # Use Arabic dictionary fallback
            arabic_result = analyze_arabic_sentiment(text)
            return {
                "score": arabic_result["score"],
                "label": arabic_result["label"],
                "confidence": abs(arabic_result["score"]),
                "source": "arabic_dict",
                "lang": "ar",
                "vader_score": 0,
                "textblob_score": 0,
                "nrclex_score": 0,
                "emotions": {},
            }
        text = translated
    
    vader_result = analyze_sentiment_vader(text)
    textblob_result = analyze_sentiment_textblob(text)
    
    # NRCLex emotion analysis
    try:
        text_obj = NRCLex(text)
        text_obj.load_raw_text(text)
        emotions = text_obj.top_emotions
        affect_freq = text_obj.affect_frequencies
        
        # Convert emotions to sentiment score
        positive_emotions = affect_freq.get('joy', 0) + affect_freq.get('trust', 0) + \
                           affect_freq.get('anticipation', 0) + affect_freq.get('surprise', 0)
        negative_emotions = affect_freq.get('anger', 0) + affect_freq.get('fear', 0) + \
                           affect_freq.get('sadness', 0) + affect_freq.get('disgust', 0)
        
        nrclex_score = positive_emotions - negative_emotions
        nrclex_label = "positive" if nrclex_score > 0.1 else "negative" if nrclex_score < -0.1 else "neutral"
    except Exception:
        nrclex_score = 0
        nrclex_label = "neutral"
        affect_freq = {}
    
    # Weighted average: VADER (40%) + TextBlob (30%) + NRCLex (30%)
    avg_score = (vader_result["score"] * 0.4) + (textblob_result["score"] * 0.3) + (nrclex_score * 0.3)

    if avg_score > 0.1:
        label = "positive"
    elif avg_score < -0.1:
        label = "negative"
    else:
        label = "neutral"

    return {
        "score": round(avg_score, 3),
        "label": label,
        "confidence": abs(avg_score),
        "source": "ensemble",
        "lang": lang,
        "vader_score": vader_result["score"],
        "textblob_score": textblob_result["score"],
        "nrclex_score": round(nrclex_score, 3),
        "emotions": affect_freq,
    }


async def analyze_sentiment_groq(texts: list[str]) -> list[dict]:
    client = get_groq_client()
    if not client:
        return [analyze_sentiment_textblob(text) for text in texts]

    try:
        results = []
        batch_size = 10

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            prompt = f"""Analyze the sentiment of each of the following texts.
For each text, return:
- score: a number between -1 (very negative) and 1 (very positive)
- label: "positive", "negative", or "neutral"
- confidence: a number between 0 and 1

Return ONLY a JSON array with objects like [{{"score": 0.5, "label": "positive", "confidence": 0.8}}].
Do not include any other text.

Texts:
{chr(10).join([f"{j+1}. {text[:200]}" for j, text in enumerate(batch)])}"""

            completion = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {"role": "system", "content": "You are a sentiment analysis expert. Return only JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=1000,
            )

            response_text = completion.choices[0].message.content.strip()
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            batch_results = json.loads(response_text)

            while len(batch_results) < len(batch):
                batch_results.append({"score": 0, "label": "neutral", "confidence": 0.5})

            results.extend(batch_results[:len(batch)])

        return results

    except Exception as e:
        print(f"[Groq Sentiment] Error: {e}")
        return [analyze_sentiment_ensemble(text) for text in texts]


# =====================================================
# MAIN ORCHESTRATOR
# =====================================================

async def get_brand_sentiment(
    brand: str,
    sources: list[str] = None,
    language: str = "all",
    limit: int = 100,
    use_groq: bool = True,
    provider: str = None,
) -> dict:
    if sources is None:
        sources = ["twitter", "reddit", "news"]

    scraper = get_scraper(provider)
    print(f"[Brand Sentiment] Analyzing '{brand}' | Provider: {scraper.__class__.__name__} | Sources: {sources}")

    all_mentions = []
    sources_data = {}

    source_methods = {
        "twitter": scraper.search_twitter,
        "reddit": scraper.search_reddit,
        "news": scraper.search_news,
        "youtube": scraper.search_youtube,
        "google": scraper.search_google,
        "instagram": scraper.search_instagram,
        "tiktok": scraper.search_tiktok,
    }

    for src in sources:
        method = source_methods.get(src)
        if method:
            try:
                mentions = await method(brand, limit)
                sources_data[src] = {"count": len(mentions), "mentions": mentions}
                all_mentions.extend(mentions)
                print(f"[Brand Sentiment] {src}: {len(mentions)} mentions")
            except Exception as e:
                print(f"[Brand Sentiment] {src} error: {e}")
                sources_data[src] = {"count": 0, "mentions": []}

    texts = [m.get("text", "") for m in all_mentions if m.get("text")]

    if use_groq and texts:
        sentiments = await analyze_sentiment_groq(texts)
    else:
        sentiments = [analyze_sentiment_ensemble(text) for text in texts]

    for i, mention in enumerate(all_mentions):
        if i < len(sentiments):
            mention["sentiment"] = sentiments[i]

    if sentiments:
        overall_score = sum(s.get("score", 0) for s in sentiments) / len(sentiments)
    else:
        overall_score = 0

    positive = [m for m in all_mentions if m.get("sentiment", {}).get("label") == "positive"]
    negative = [m for m in all_mentions if m.get("sentiment", {}).get("label") == "negative"]
    neutral = [m for m in all_mentions if m.get("sentiment", {}).get("label") == "neutral"]

    positive.sort(key=lambda x: x.get("sentiment", {}).get("score", 0), reverse=True)
    negative.sort(key=lambda x: x.get("sentiment", {}).get("score", 0))

    source_breakdown = {}
    for source_name, source_data in sources_data.items():
        source_mentions = [m for m in all_mentions if m.get("source") == source_name]
        source_sentiments = [m.get("sentiment", {}).get("score", 0) for m in source_mentions]
        source_breakdown[source_name] = {
            "count": source_data["count"],
            "avg_sentiment": sum(source_sentiments) / len(source_sentiments) if source_sentiments else 0,
            "positive": len([m for m in source_mentions if m.get("sentiment", {}).get("label") == "positive"]),
            "negative": len([m for m in source_mentions if m.get("sentiment", {}).get("label") == "negative"]),
            "neutral": len([m for m in source_mentions if m.get("sentiment", {}).get("label") == "neutral"]),
        }

    return {
        "brand": brand,
        "provider": scraper.__class__.__name__,
        "overall_score": round(overall_score, 3),
        "total_mentions": len(all_mentions),
        "positive_count": len(positive),
        "negative_count": len(negative),
        "neutral_count": len(neutral),
        "positive_percentage": round(len(positive) / len(all_mentions) * 100, 1) if all_mentions else 0,
        "negative_percentage": round(len(negative) / len(all_mentions) * 100, 1) if all_mentions else 0,
        "neutral_percentage": round(len(neutral) / len(all_mentions) * 100, 1) if all_mentions else 0,
        "sources_breakdown": source_breakdown,
        "positive_mentions": positive[:10],
        "negative_mentions": negative[:10],
        "neutral_mentions": neutral[:10],
        "all_mentions": all_mentions,
        "analyzed_at": datetime.utcnow().isoformat(),
    }


async def get_brand_trend(brand: str, days: int = 30, sources: list[str] = None) -> dict:
    sentiment = await get_brand_sentiment(brand, sources)
    return {"brand": brand, "period_days": days, "current": sentiment, "trend": []}


def get_available_sources() -> list[dict]:
    return list_providers()
