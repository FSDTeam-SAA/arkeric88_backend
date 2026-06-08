FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production image ----
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/well-known ./well-known
COPY --from=builder /app/payment-template.html ./payment-template.html

ENV NODE_ENV=production

EXPOSE 5001

CMD ["node", "dist/main.js"]
