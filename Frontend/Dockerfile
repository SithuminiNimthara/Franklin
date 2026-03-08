FROM node:20-slim AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm run dev

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_AI_SERVICE_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL

RUN npm run build

FROM nginx:alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
