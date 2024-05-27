#Stage 1
# FROM node:18-alpine
# # Create app directory
# WORKDIR /app
FROM nginx:1.25.0-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY  ./build .
ENTRYPOINT ["nginx", "-g", "daemon off;"]