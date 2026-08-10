FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN node -e "import('@xenova/transformers').then(m => m.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })"

EXPOSE 3101

CMD ["node", "index.js"]
