# LINKAVTO — образ витрины: Vite-сборка + раздача статики через nginx.
# Build context = корень репозитория, слушаем 8080, GET /healthz для проб.
#
# Витрина статическая: данные отдаёт MSW прямо в браузере
# (VITE_ENABLE_MOCKS в .env.production), рантайм-переменные читать некому —
# всё, что нужно фронту, вшивается на этапе build.

# ─── Stage 1: сборка SPA ───────────────────────────────────────────────────
# node:20-slim (glibc), а НЕ alpine (musl): у Tailwind v4 (@tailwindcss/oxide)
# и lightningcss нативные бинарники — под glibc prebuilt-сборки надёжнее, иначе
# `vite build` падает в контейнере.
FROM node:20-slim AS web
WORKDIR /build/frontend

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Манифест и лок — отдельным слоём: пока зависимости не менялись, пересборка
# после правки исходников не тянет установку заново (на 2 vCPU это минуты).
COPY frontend/package.json frontend/pnpm-lock.yaml ./
# node_modules НЕ копируется (см. .dockerignore) — ставим свежие бинарники под linux.
RUN pnpm install --frozen-lockfile

COPY frontend ./
# vite build читает .env.production (VITE_ENABLE_MOCKS=true). tsc-проверка уже
# прогнана в разработке — в образе делаем только сборку бандла.
RUN pnpm exec vite build

# ─── Stage 2: раздача статики nginx ────────────────────────────────────────
FROM nginx:1.27-alpine
COPY frontend/deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=web /build/frontend/dist /srv/web

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
