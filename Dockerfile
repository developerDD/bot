FROM node:18

# Встановлюємо залежності Puppeteer
RUN apt-get update && apt-get install -y \
  wget \
  curl \
  unzip \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils

# Копіюємо файли проєкту
WORKDIR /app
COPY . .
RUN npm install

# Запускаємо бота
CMD ["node", "bot.js"]
