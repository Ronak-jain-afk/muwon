# muwon

muwon is a desktop-first music player built with **Tauri 2, SolidJS, and TypeScript**.
It is designed around an immersive dark UI where album art stays at the center and controls remain fast, predictable, and low-friction.

## Table of Contents

- [Overview](#overview)
- [Core Goals](#core-goals)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Design & Product Docs](#design--product-docs)
- [GitHub Releases](#github-releases)
- [Language Composition](#language-composition)
- [Contributing](#contributing)
- [License](#license)

## Overview

This repository contains:

- A **Vite + SolidJS frontend** in `src/`
- A **Tauri (Rust) desktop layer** in `src-tauri/`
- Product and design specifications in `PRODUCT.md` and `DESIGN.md`

The interface direction is intentionally restrained:

- Dark, receding surfaces to reduce visual noise
- Warm ember accents for active/high-signal states
- Artwork-first experience with minimal dashboard-like clutter

## Core Goals

Based on the current product and design docs:

1. **Artwork-first presence** – UI should frame media, not compete with it.
2. **Immersive playback** – low-friction listening with dependable controls.
3. **Muscle-memory interactions** – familiar and consistent control placement.
4. **Accessible by default** – contrast, keyboard support, reduced motion.

## Tech Stack

### Frontend

- **SolidJS**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **PostCSS + Autoprefixer**
- **lucide-solid**

### Desktop / Native

- **Tauri 2**
- **Rust** (`src-tauri`)
- `@tauri-apps/api`
- `@tauri-apps/plugin-dialog`

## Repository Structure

```text
.
├── .github/
├── src/                  # Frontend (SolidJS + TypeScript)
├── src-tauri/            # Tauri + Rust desktop backend
├── DESIGN.md             # Design system and visual language
├── PRODUCT.md            # Product purpose, users, principles
├── plan.md
├── plan-detailed.md
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm**
- **Rust toolchain** (required for Tauri desktop development/build)
- OS prerequisites for Tauri/WebView runtime

### Install

```bash
npm install
```

### Run frontend in development

```bash
npm run dev
```

### Build frontend

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Run Tauri app (development)

```bash
npm run tauri -- dev
```

### Build Tauri desktop app

```bash
npm run tauri -- build
```

## Scripts

Defined in `package.json`:

- `dev` → `vite`
- `build` → `tsc && vite build`
- `preview` → `vite preview`
- `tauri` → `tauri`

## Design & Product Docs

- [`PRODUCT.md`](./PRODUCT.md): user profile, product purpose, and design principles
- [`DESIGN.md`](./DESIGN.md): color system, typography, layout, components, accessibility rules

If you are making UI changes, align with these documents first.

## GitHub Releases

muwon is distributed through [GitHub Releases](https://github.com/Ronak-jain-afk/muwon/releases). Each release includes pre-built binaries for supported platforms:

- **macOS** – Universal binary (Apple Silicon & Intel)
- **Windows** – `.msi` installer
- **Linux** – AppImage or `.deb` package

Visit the [Releases page](https://github.com/Ronak-jain-afk/muwon/releases) to download the latest version, or check the release notes for changelog details and platform-specific instructions.

## Language Composition

- **TypeScript:** 50.8%
- **Rust:** 46.3%
- **CSS:** 2.4%
- **Other:** 0.5%

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a branch for your change
3. Keep commits focused and descriptive
4. Open a pull request with clear context and screenshots for UI changes

Please keep changes consistent with the product and design direction documented in `PRODUCT.md` and `DESIGN.md`.

## License

This project is licensed under the **MIT License**.
See [`LICENSE`](./LICENSE) for details.
