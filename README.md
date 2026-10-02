# builtbysai.github.io

<p align="center"><img src="assets/hero.svg" width="800" alt="BuiltBySai hero — Hans Sai, Systems Administrator building toward security engineering"></p>

<p align="center"><img src="assets/hero-screenshot.png" width="800" alt="builtbysai.com hero: headline and interactive ops-console terminal"></p>

Personal portfolio for Hans Sai - Systems Administrator building toward security engineering.

**Live site: [builtbysai.com](https://builtbysai.com)**

## What it is

A single-file, hand-built portfolio: Active Directory / IT operations background, a terminal-style hero, a scroll-driven 3D project gallery (click any card to open its case study) (with test counts and MITRE ATT&CK mappings where relevant, each opening a full-screen case study), and certifications with linked proof.

No framework, no build step, no bundler. `index.html` is the entire site - HTML, CSS, and JS inline, plus one CDN script (Lenis, for anchor-scroll easing). No canvas or WebGL on the page itself; the Interactive Diploma is embedded live from its own repo.

## Structure

```
index.html                the site (everything lives here)
404.html                   custom 404 page (served automatically by GitHub Pages)
manifest.json              web app manifest (icons, theme color)
favicon.ico / favicon-light.ico   favicon (dark/light theme variants)
icons/                     favicon/apple-touch-icon/manifest icon set
headshot.jpeg / headshot-web.webp about-section photo (original + optimized web copy)
screenshots/               project screenshots used in the Projects section
assets/                    README visuals: hero.svg + real site screenshots
certs/                     certification PDFs linked from the Education section
resume/                    resume PDF linked from the hero
files/                     vCard, linked from the footer's "Save Contact" button
```

## Local preview

Nothing to install - open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

## Deploying

Push to `main`. GitHub Pages serves it directly, no build step.
