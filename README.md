# MathPro X

**Advanced Scientific & Graphing Calculator for Android and Web**

MathPro X is a React + TypeScript scientific calculator project with a responsive web/PWA interface and an Android debug package built through Capacitor.

## Current project status

**v0.1.0 — developer preview.** The repository contains the application source, calculation engine, graph renderer, reference datasets, OCR adapter, unit tests and GitHub Actions pipelines.

The web production build, TypeScript check and unit-test suite have passed in GitHub Actions. An Android debug APK was also built successfully from the application source and uploaded as an Actions artifact. It has not yet been manually tested on a physical Android device and is not a signed production release.

## Features included

- Scientific expression entry and evaluation using Math.js.
- 100-significant-digit BigNumber configuration for supported operations.
- DEG/RAD/GRAD angle modes and inverse trigonometric helpers.
- Symbolic differentiation, antiderivatives and equation solving for supported forms through Nerdamer.
- Composite Simpson numerical definite integration.
- Cartesian, polar, parametric and implicit graph rendering.
- Complex-number expressions.
- Matrix determinant, inverse, transpose, RREF, eigenvalues and matrix self-product.
- Descriptive statistics and simple linear regression.
- Prime testing, prime factorization, divisors, GCD/LCM, continued fractions and rational approximation.
- Binary, octal, decimal and hexadecimal conversion; permutations and combinations.
- Searchable starter mathematics, physics and chemistry formula reference.
- 118-element periodic-table browser.
- Local history up to 1,000 calculations with CSV export.
- Camera image selection with a server-side OCR adapter.
- Five appearance themes and saved angle/theme settings.

## Repository structure

- `src/App.tsx` — application UI and navigation.
- `src/lib/engine.ts` — numeric, symbolic, matrix, statistics and number-theory helpers.
- `src/components/GraphCanvas.tsx` — graph renderer.
- `src/lib/elements.ts` — element data for the periodic-table view.
- `src/lib/reference.ts` — formula-library content.
- `src/lib/storage.ts` — history and settings persistence.
- `src/lib/engine.test.ts` — calculation-engine unit tests.
- `api/math-ocr.ts` — server-side Mathpix OCR proxy.
- `.github/workflows/` — web deployment and Android debug build workflows.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Production build and tests:

```bash
npm test
npm run build
npm run preview
```

## Android debug build

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

GitHub Actions runs this build path and uploads `app-debug.apk` when successful. A debug APK is for development/testing and is not a signed release package.

## Web deployment

The web bundle builds and uploads successfully as a GitHub Pages artifact. To publish it, enable Pages in **Settings → Pages → Build and deployment → Source → GitHub Actions**. Until Pages is enabled, the deploy job returns GitHub's 404 error even though the web build itself passes.

## Camera OCR

The OCR endpoint requires these server-side Vercel environment variables:

- `MATHPIX_APP_ID`
- `MATHPIX_APP_KEY`

Do not commit provider credentials or expose them in frontend variables. GitHub Pages is static hosting and cannot execute `api/math-ocr.ts`; deploy the OCR API separately and point the client to that API.

## Accuracy and known limitations

- The 100-digit setting is not a guarantee that every operation returns 100 correct digits. Graph sampling, numerical integration, matrix/statistics calculations, symbolic transforms and OCR have method-specific limits.
- Symbolic solving and integration are limited to expressions supported by Nerdamer.
- Matrix multiplication currently calculates a matrix multiplied by itself; a separate second-matrix input has not been added.
- Formula and periodic-table content is an educational starter dataset, not a complete engineering or chemistry reference.
- OCR is unavailable until the external service and credentials are configured.
- The APK has passed CI packaging but still requires installation and manual testing on a physical Android device.
- No signed production APK or Play Store release is provided.

See [STATUS.md](STATUS.md) for the latest build and verification record.
