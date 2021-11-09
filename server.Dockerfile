FROM node:12 AS build

WORKDIR /app
COPY package*.json .
RUN npm install --only=dev
COPY . .
RUN npm run build:server

FROM node:12
WORKDIR /app
COPY package*.json .
RUN npm install --only=prod
COPY --from=build app/build/server .
ENV PORT=8081
EXPOSE 8081
CMD [ "node", "server/src/index.js" ]