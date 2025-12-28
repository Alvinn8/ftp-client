FROM node:24-alpine AS build

WORKDIR /app/server
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY server/package.json /app/server/
RUN pnpm install --frozen-lockfile
COPY . /app/
RUN pnpm run build

FROM node:24-alpine

WORKDIR /app/server
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY server/package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/server/bundle.js ./bundle.js
ENV PORT=8081
EXPOSE 8081
CMD [ "node", "bundle.js" ]