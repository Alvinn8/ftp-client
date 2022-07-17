FROM node:16.15-alpine3.14 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --only=dev
COPY . ./
RUN npm run build

FROM nginx:stable
COPY --from=build app/dist /usr/share/nginx/html
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;" ]