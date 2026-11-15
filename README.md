# Mars Outpost Manager
Run a four-person Mars outpost for 100 sols. Numbers are game-scaled, not real engineering values.

`npm install && npm run dev` · `npm test` · `npm run build`

**Deploy on Vercel:** push to GitHub → Add New → Project → import the repo. The Vite preset is detected (build `npm run build`, output `dist`). No environment variables.

`src/engine.js` is the pure, seeded game logic. `src/main.js` is the UI. Fact cards still need source links before submission.
