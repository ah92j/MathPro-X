# MathPro X

**Advanced Scientific & Graphing Calculator for Android and Web**

MathPro X is an early React + TypeScript calculator project intended to share one codebase between the web/PWA experience and an Android package through Capacitor.

> **Development status:** v0.1.0 is a preliminary source drop. The calculator UI, math modules and build workflows are still being integrated and validated. Do not treat this repository as a production release or use it as the sole source for high-stakes engineering calculations.

## Repository contents

- `src/App.tsx` — current calculator screen and interface entry point.
- `src/lib/engine.ts` — numerical and symbolic calculation helpers, number theory, matrices and statistics.
- `src/components/GraphCanvas.tsx` — Cartesian, polar, parametric and implicit graph rendering.
- `src/lib/elements.ts` — periodic-table element data.
- `src/lib/reference.ts` — starter mathematics, physics and chemistry formula library.
- `src/lib/storage.ts` — local history and settings persistence.
- `src/lib/engine.test.ts` — initial unit tests.
- `api/math-ocr.ts` — optional server-side Mathpix OCR proxy.
- `.github/workflows/` — GitHub Actions workflows for web deployment and a debug Android APK.

## Implemented calculation helpers

The calculation engine includes:
- Math.js BigNumber configuration at 100 significant digits for supported operations.
- Degree, radian and gradian trigonometric helpers.
- Symbolic differentiation, integration and equation solving through Nerdamer where supported.
- Composite Simpson numerical integration.
- Matrix determinant, inverse, transpose, row-reduced echelon form, eigenvalues and matrix self-product.
- Descriptive statistics and simple linear regression.
- Prime testing, prime factors, divisors, GCD/LCM, continued fractions and rational approximation.
- Integer base conversion and permutations/combinations.

**Accuracy note:** the 100-digit setting is not a guarantee that all library functions or numerical algorithms return 100 correct digits. Graph sampling, numerical integration, symbolic transforms, statistics and OCR have their own limitations.

## Run the web app

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Production bundle:

```bash
npm run build
npm run preview
```

Run unit tests:

```bash
npm test
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

The GitHub Actions Android workflow runs the same general build path and uploads a debug APK artifact when successful. It does not create a signed release APK.

## Web deployment

The `web-pages.yml` workflow builds the static web app and deploys it to GitHub Pages. In repository settings, configure **Pages → Build and deployment → Source → GitHub Actions** before expecting the deploy job to publish the site.

## Camera OCR

The OCR endpoint requires server-side Vercel environment variables:
- `MATHPIX_APP_ID`
- `MATHPIX_APP_KEY`

Do not commit provider credentials or expose them through frontend environment variables. GitHub Pages is static hosting and cannot run `api/math-ocr.ts`; deploy the API separately and configure the client to use that server endpoint.

## Current limitations

- The main application screen is still a basic calculator shell; the advanced modules are in the repository but are not all connected to the UI yet.
- Dependency installation, production type-check/build, unit tests and the Android packaging workflow have not yet passed end-to-end verification.
- No APK or live web deployment is confirmed at this point.
- OCR requires external credentials and a separately deployed serverless endpoint.
- Matrix multiplication currently multiplies one matrix by itself; a two-matrix input UI is not implemented.
- Formula and periodic-table datasets are starter references, not a complete scientific database.

See [STATUS.md](STATUS.md) for the current validation status and follow-up work.
