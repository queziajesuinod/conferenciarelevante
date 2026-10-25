# ---------- Stage 1: clona o repositório ----------
FROM alpine:3.20 AS source

ARG REPO_URL=https://github.com/queziajesuinod/conferenciarelevante
ARG REPO_REF=master
# Passe --build-arg CACHEBUST=$(date +%s) para forçar novo clone (sem cache)
ARG CACHEBUST=0

WORKDIR /tmp

RUN apk add --no-cache git
RUN echo "cachebust=${CACHEBUST}" && \
    git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" project

# ---------- Stage 2: pré-render (SEO + prévias de link) ----------
# Gera cópias de /ministracao e /evento com título/imagem preenchidos e o
# sitemap.xml a partir das APIs do portal. Se a API estiver fora, o build
# segue normalmente (o site funciona igual, só sem as prévias).
FROM node:22-alpine AS prerender
COPY --from=source /tmp/project /app
WORKDIR /app
RUN node scripts/prerender.mjs /out || mkdir -p /out

# ---------- Stage 3: serve com nginx ----------
FROM nginx:1.27-alpine

# Configuração do nginx (inclui o endpoint /healthz)
COPY --from=source /tmp/project/nginx/default.conf /etc/nginx/conf.d/default.conf

# Página principal = Juventude Relevante
COPY --from=source /tmp/project/index.html           /usr/share/nginx/html/index.html
# Página de resumo da Conferência (rota /conferencia2026)
COPY --from=source /tmp/project/conferencia2026.html /usr/share/nginx/html/conferencia2026.html
# Página de detalhe de ministração (rota /ministracao)
COPY --from=source /tmp/project/ministracao.html     /usr/share/nginx/html/ministracao.html
# Lista completa de ministrações (rota /ministracoes)
COPY --from=source /tmp/project/ministracoes.html    /usr/share/nginx/html/ministracoes.html
# Transmissão ao vivo (rota /aovivo)
COPY --from=source /tmp/project/aovivo.html          /usr/share/nginx/html/aovivo.html
# Página de um evento (rota /evento?id=...)
COPY --from=source /tmp/project/evento.html          /usr/share/nginx/html/evento.html
# Página de uma série (rota /serie?s=...)
COPY --from=source /tmp/project/serie.html           /usr/share/nginx/html/serie.html
COPY --from=source /tmp/project/assets     /usr/share/nginx/html/assets
COPY --from=source /tmp/project/css        /usr/share/nginx/html/css
COPY --from=source /tmp/project/js         /usr/share/nginx/html/js
COPY --from=source /tmp/project/fonts      /usr/share/nginx/html/fonts
COPY --from=source /tmp/project/logos      /usr/share/nginx/html/logos
COPY --from=source /tmp/project/robots.txt /usr/share/nginx/html/robots.txt
# prerender/, og/ e sitemap.xml gerados no stage 2
COPY --from=prerender /out/                /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
