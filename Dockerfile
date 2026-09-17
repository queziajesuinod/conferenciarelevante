# ---------- Stage 1: clona o repositório ----------
FROM alpine:3.20 AS source

ARG REPO_URL=https://github.com/queziajesuinod/conferenciarelevante
ARG REPO_REF=master

WORKDIR /tmp

RUN apk add --no-cache git
RUN git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" project

# ---------- Stage 2: serve com nginx ----------
FROM nginx:1.27-alpine

# Configuração do nginx (inclui o endpoint /healthz)
COPY --from=source /tmp/project/nginx/default.conf /etc/nginx/conf.d/default.conf

# Páginas e todos os assets estáticos necessários
COPY --from=source /tmp/project/index.html           /usr/share/nginx/html/index.html
COPY --from=source /tmp/project/conferencia2026.html /usr/share/nginx/html/conferencia2026.html
COPY --from=source /tmp/project/ministracao.html     /usr/share/nginx/html/ministracao.html
COPY --from=source /tmp/project/assets     /usr/share/nginx/html/assets
COPY --from=source /tmp/project/css        /usr/share/nginx/html/css
COPY --from=source /tmp/project/js         /usr/share/nginx/html/js
COPY --from=source /tmp/project/fonts      /usr/share/nginx/html/fonts
COPY --from=source /tmp/project/logos      /usr/share/nginx/html/logos

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
