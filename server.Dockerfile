FROM node:16.15-alpine3.14 AS build

WORKDIR /app/server
COPY package*.json ./
RUN npm install --only=dev
COPY . /app/
RUN npm run build

FROM node:12
WORKDIR /app
COPY ./server/package*.json ./
RUN npm install --only=prod
COPY --from=build app/server/bundle.js ./
ENV PORT=8081
EXPOSE 8081
CMD [ "node", "bundle.js" ]