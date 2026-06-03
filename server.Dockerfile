FROM node:24-alpine AS build

WORKDIR /app/server
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY server/package.json /app/server/
RUN pnpm install --frozen-lockfile
COPY . /app/
RUN pnpm run build

FROM node:24-alpine

WORKDIR /app/server
RUN apk add --no-cache ca-certificates curl \
	&& curl -fsSL https://letsencrypt.org/certs/gen-y/root-yr.pem \
		-o /usr/local/share/ca-certificates/letsencrypt-root-yr.pem \
	&& update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/letsencrypt-root-yr.pem
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY server/package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/server/bundle.js ./bundle.js
ENV PORT=8081
EXPOSE 8081
CMD [ "node", "bundle.js" ]