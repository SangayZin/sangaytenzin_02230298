FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set backend API URL for production build
ENV REACT_APP_API_URL=https://be-todo-02230298-4.onrender.com

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
