FROM node:20-slim

WORKDIR /usr/src/app

# Install ffmpeg which is typically required for media processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN node src/server.js

COPY . .

EXPOSE 5002

CMD ["npm", "run", "dev"]
