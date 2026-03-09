FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:standalone

FROM nginx:alpine
COPY --from=build /app/dist-standalone /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
