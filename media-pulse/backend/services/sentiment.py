"""
Sentiment Analysis Service — تحليل مشاعر الريفيوز
 يستخدم TextBlob لتحليل النصوص وتصنيفها كإيجابي/سلبي/محايد
"""
from textblob import TextBlob
from typing import Optional
import re


def analyze_sentiment(text: str, stars: int = None) -> dict:
    """تحليل مشاعر نص واحد — TextBlob للإنجليزي، Star rating fallback للعربي"""
    if not text or not text.strip():
        # لو في نجوم، استخدمها
        if stars is not None:
            label = classify_star_rating(stars)
            return {"polarity": 0, "subjectivity": 0, "label": label, "confidence": 0.5, "method": "stars"}
        return {"polarity": 0, "subjectivity": 0, "label": "neutral", "confidence": 0, "method": "empty"}
    
    # تحقق هل النص عربي
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
    total_chars = len(re.findall(r'\w', text))
    is_arabic = arabic_chars > total_chars * 0.3 if total_chars > 0 else False
    
    if is_arabic and stars is not None:
        # للنصوص العربية، استخدم التقييم كبديل
        label = classify_star_rating(stars)
        return {"polarity": 0, "subjectivity": 0, "label": label, "confidence": 0.6, "method": "stars_arabic"}
    
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    
    # لو polarity صفر وفي نجوم، استخدم النجوم
    if abs(polarity) < 0.05 and stars is not None:
        label = classify_star_rating(stars)
        return {"polarity": 0, "subjectivity": round(subjectivity, 3), "label": label, "confidence": 0.5, "method": "stars_fallback"}
    
    if polarity > 0.1:
        label = "positive"
    elif polarity < -0.1:
        label = "negative"
    else:
        label = "neutral"
    
    confidence = abs(polarity)
    
    return {
        "polarity": round(polarity, 3),
        "subjectivity": round(subjectivity, 3),
        "label": label,
        "confidence": round(confidence, 3),
        "method": "textblob",
    }


def analyze_reviews(reviews: list[dict]) -> dict:
    """تحليل مجموعة من الريفيوز وإرجاع ملخص"""
    if not reviews:
        return {
            "total": 0,
            "positive": 0,
            "negative": 0,
            "neutral": 0,
            "avg_polarity": 0,
            "avg_subjectivity": 0,
            "sentiment_score": 0,
            "details": [],
        }
    
    analyzed = []
    positive = 0
    negative = 0
    neutral = 0
    total_polarity = 0
    total_subjectivity = 0
    
    for review in reviews:
        text = review.get("text", "")
        stars = review.get("stars") or review.get("star_rating")
        sentiment = analyze_sentiment(text, stars=stars)
        
        analyzed.append({
            **review,
            "sentiment": sentiment,
        })
        
        if sentiment["label"] == "positive":
            positive += 1
        elif sentiment["label"] == "negative":
            negative += 1
        else:
            neutral += 1
        
        total_polarity += sentiment["polarity"]
        total_subjectivity += sentiment["subjectivity"]
    
    count = len(reviews)
    avg_polarity = total_polarity / count if count > 0 else 0
    avg_subjectivity = total_subjectivity / count if count > 0 else 0
    
    # sentiment score: -1 إلى 1 (إجمالي المشاعر)
    sentiment_score = avg_polarity
    
    return {
        "total": count,
        "positive": positive,
        "negative": negative,
        "neutral": neutral,
        "positive_pct": round((positive / count * 100) if count > 0 else 0, 1),
        "negative_pct": round((negative / count * 100) if count > 0 else 0, 1),
        "neutral_pct": round((neutral / count * 100) if count > 0 else 0, 1),
        "avg_polarity": round(avg_polarity, 3),
        "avg_subjectivity": round(avg_subjectivity, 3),
        "sentiment_score": round(sentiment_score, 3),
        "details": analyzed,
    }


def get_sentiment_emoji(label: str) -> str:
    """إرجاع إيموجي بناءً على المشاعر"""
    return {"positive": "😊", "negative": "😞", "neutral": "😐"}.get(label, "😐")


def get_sentiment_color(label: str) -> str:
    """إرجاع لون بناءً على المشاعر"""
    return {"positive": "#22c55e", "negative": "#ef4444", "neutral": "#6b7280"}.get(label, "#6b7280")


def classify_star_rating(stars: int) -> str:
    """تصنيف تقييم النجوم"""
    if stars >= 4:
        return "positive"
    elif stars <= 2:
        return "negative"
    else:
        return "neutral"
