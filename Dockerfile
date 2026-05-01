# Builder stage
FROM node:latest AS builder

WORKDIR /app

COPY package.json .

# Remove node_modules and package-lock.json to force npm install
RUN rm -rf node_modules && rm -rf package-lock.json

RUN npm install --force

COPY . .

RUN npm run build

# Production stage
FROM nginx:latest

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Production stage using apache
# FROM apache:latest

# COPY --from=builder /app/dist /var/www/html

# EXPOSE 8080

# CMD ["apachectl", "-D", "FOREGROUND"]