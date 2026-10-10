# builtbysai.github.io

Personal portfolio for Hans Sai — Systems Administrator building toward security engineering.

**Live site: [builtbysai.com](https://builtbysai.com)**

## What it is

A single-file, hand-built portfolio: warm editorial design, no frameworks, no build step. Sections: hero with portrait, about, experience timeline, nine shipped projects, skills, education and certifications (with linked proof), and contact.

Design notes: Fraunces for display type, Inter for body, IBM Plex Mono for micro-labels — all self-hosted in `fonts/` (no third-party requests). One deep-teal brand accent on warm paper. Custom hand-drawn SVG icon set, no emoji icons, no gradients.

## Structure

```
index.html                the site (everything lives here)
404.html                   custom 404 page (served automatically by GitHub Pages)
manifest.json              web app manifest (icons, theme color)
favicon.ico / favicon-light.ico   favicon (dark/light theme variants)
icons/                     favicon/apple-touch-icon/manifest icon set
fonts/                     self-hosted webfonts (Fraunces, Inter, IBM Plex Mono)
headshot.jpeg / headshot-web.webp hero portrait (original + optimized web copy)
screenshots/               project screenshots (kept for reference)
assets/                    README visuals
certs/                     certification PDFs linked from the Education section
resume/                    resume PDF linked from the hero
files/                     vCard, linked from the contact section
```

## Local preview

Nothing to install — serve the folder with any static server (fonts and images need http, not file://):

```bash
python3 -m http.server 8000
```

## Deploying

Push to `main`. GitHub Pages serves it directly, no build step. Design work happens on `redesign/unslop`; `main` stays untouched until a redesign is approved.
