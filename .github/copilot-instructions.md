# Copilot Instructions

- This project runs locally with Docker. When you need the app running, use `docker compose up --build` and assume the app is served on `http://localhost:4102`.
- Do not start the app directly with `npm run dev` or `npm run start` unless the user explicitly asks for a non-Docker workflow.
- When finishing a feature or refactor, run a verification command before handing off the work.
- Default verification is `npm run typecheck`.
- Run `npm run build` instead when the change affects production/runtime behavior, Next.js config, routing, PWA/service worker behavior, or deployment-facing code.
- If relevant tests exist for the changed area, run them in addition to the verification step.