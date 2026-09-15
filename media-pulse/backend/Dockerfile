FROM python:3.11-slim

WORKDIR /app

# Install minimal system deps for Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates libnss3 libatk-bridge2.0-0 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Download Chrome portable (avoids apt timeout)
RUN wget -q -O /tmp/chrome.deb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" \
    && dpkg -i /tmp/chrome.deb || apt-get install -f -y \
    && rm /tmp/chrome.deb

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Chromium + system deps for Playwright (Meta Ad Library scraping)
RUN python -m playwright install --with-deps chromium

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
