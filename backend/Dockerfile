FROM node:18-alpine

WORKDIR /app

COPY ./backend/package*.json ./

RUN npm install

# Create data directory
RUN mkdir -p /app/data

COPY ./backend .

EXPOSE 5000

ENV DB_PATH=/app/data/tasks.db

CMD ["node", "server.js"]
