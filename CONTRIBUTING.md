# Contributing | مشارکت

Thanks for helping build the Farsi Plays Database! 🎭

## Ways to Contribute

- **Data** — submit missing plays, flag incorrect entries (in-app)
- **Code** — fix bugs, improve UX, write tests
- **Docs** — improve README, translations, taxonomy labels

## Development Setup

1. Fork & clone the repo
2. `cp .env.example .env.local` and add your Supabase credentials
3. `npm install` && `npm run dev`

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Keep PRs small and focused; link related issues
3. Ensure `npm run lint` and `npm run build` pass
4. Write clear commit messages in English
5. A maintainer will review within a few days

## Code Style

- Components small and focused; extract hooks for logic
- Persian UI strings live inline in components (RTL via `dir="rtl"`)
- Format with Prettier (`.prettierrc`); lint with Oxlint

## Code of Conduct

Be respectful and constructive. This is a cultural-preservation project — kindness matters.