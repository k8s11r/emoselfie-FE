# syntax=docker/dockerfile:1.7
#
# 정적 빌드 결과를 nginx가 직접 서빙한다. 라우팅 설정(nginx.conf)은
# 이미지에 넣지 않고 emoselfie-INFRA에서 마운트한다. 자산을 만드는 책임은
# 이 저장소가, 트래픽을 가르는 책임은 INFRA가 갖는다.

# ──────────────────────────────── 정적 빌드 ────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

WORKDIR /src

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
 && pnpm install --frozen-lockfile

COPY . .

# package.json의 build = "tsc -b && vite build"
RUN pnpm build

# ───────────────────────────────── 서빙 ─────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 80
