FROM node:20-alpine AS base
RUN apk add --no-cache openssl

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Daemon stage — full source + dev deps kept for running kafka-daemon.ts via tsx
FROM node:20-alpine AS daemon
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
RUN npm ci
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib ./lib
COPY --from=build /app/types ./types
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/tsconfig.daemon.json ./
COPY --from=build /app/next-env.d.ts ./
RUN mkdir -p uploads logs

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

RUN mkdir -p uploads logs

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
