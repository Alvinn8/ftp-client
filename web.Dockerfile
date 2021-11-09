FROM node:12 AS build

WORKDIR /app
COPY package*.json .
RUN npm install --only=dev
COPY . .
RUN npm run build:website-dist

FROM nginx:stable
COPY --from=build app/build/website-dist /usr/share/nginx/html
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;" ]