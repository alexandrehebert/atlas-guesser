FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4102

ENV NODE_ENV=development
ENV PORT=4102

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
