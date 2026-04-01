# Guesser

Standalone Next.js app for the world-map guesser game extracted from `trips`.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- next-intl (`en`, `fr`)
- Vitest + Testing Library

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:4102`.

## Build

```bash
npm run build
npm run start
```

## Docker (local)

```bash
docker compose up
```

Then open `http://localhost:4102`.

## Deploy

This project is self-contained and can be deployed independently as a standard Next.js app.
