# Section F Community (Demo)

A community hub for a school section: swipeable classmate cards with filters, section infographics and map, coffee-chat invites, daily spotlight, section calendar and birthdays. Built solo, zero to one.

**Portfolio demo using sample data created for demonstration, replacing private information from the original project.** The original repository remains private. All bundled people, emails, phone numbers, and profiles in `seed_cards.json` and `src/data/sectionFRoster.ts` are generated sample data. The real community roster and member data are not in this repository.

## Tech stack

React, TypeScript, Vite, Tailwind CSS, Firebase (Auth + Firestore), Google Generative AI (Gemini), Node.js + Express, Nodemailer.

## Run locally

1. `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` (see `.env.example`)
3. Add your Firebase web config to `firebase-applet-config.json`
4. `npm run dev`

## Configuration

- `GMAIL_USER` / `GMAIL_APP_PASSWORD`: sending account for community emails (use a Gmail app password stored as an environment variable - never commit it).
- `ADMIN_EMAILS`: comma-separated admin accounts.
- Replace the sample roster/seed data with your own community's data (with their consent) to deploy for real.

## Build & verification notes

- A `.npmrc` sets `legacy-peer-deps=true` because of a peer-dependency conflict in the lockfile; `npm ci` then works.
- `npm run build` passes (with `NODE_OPTIONS=--max-old-space-size=1536` on ~2GB machines).
- `tsc --noEmit` passes (typescript is not a declared dependency; run via `npx --package=typescript tsc --noEmit`).
- With the placeholder `firebase-applet-config.json` the app now keeps Firestore offline (no connection attempts to a nonexistent project). Configure a real Firebase project to enable sign-in and live data.
- The server only contacts Gmail SMTP when `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set; otherwise email is disabled.
- "Try Section F Guest Access" uses only local sample data and performs no email sends.
- Branding: the demo uses a neutral "Section F" wordmark and calendar name instead of school insignia. "Pre-HBS/Post-HBS" remain as descriptive profile fields from the original community app. This is a community project concept, not an official school product.
- Checked in a headless browser (guest mode): sign-in screen, guest entry, card deck paging, directory, spotlight, and infographics views. Infographics tab and map render. Network calls seen: Google Fonts, unpkg (map library), and ArcGIS map tiles only.
- Not checked: real sign-in, profile creation/onboarding, coffee-chat flows, calendar, admin tools, (these need a Firebase project or were not exercised).
