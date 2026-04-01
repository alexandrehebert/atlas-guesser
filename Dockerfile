FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=4102

RUN npm run build

EXPOSE 4102

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]
