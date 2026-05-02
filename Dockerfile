# Builder stage
FROM node:latest AS builder

WORKDIR /app

COPY package.json .

# Remove node_modules and package-lock.json to force npm install
RUN rm -rf node_modules && rm -rf package-lock.json

RUN npm install --force

COPY . .

# Empty = default prod env (real API). docker-compose sets docker-mock → nginx + mock backend.
ARG VITE_BUILD_PROFILE=
ENV VITE_BUILD_PROFILE=$VITE_BUILD_PROFILE

RUN npm run build

# Production stage — `static` = SPA only; `docker` = proxy /api/v1 + /content to mock (docker-compose)
FROM nginx:latest

ARG NGINX_TEMPLATE=static
COPY deploy/nginx.${NGINX_TEMPLATE}.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Production stage using apache
# FROM apache:latest

# COPY --from=builder /app/dist /var/www/html

# EXPOSE 8080

# CMD ["apachectl", "-D", "FOREGROUND"]