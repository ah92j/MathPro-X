# MathPro X — v0.1.0 preliminary source status

This is an initial source package, not a verified production release.

## Included in the source package
- Responsive React/TypeScript scientific calculator UI inspired by the supplied reference layout.
- Math.js configured for 100 significant digits for supported BigNumber operations.
- Symbolic differentiation, integration and equation solving for forms supported by Nerdamer.
- Numerical definite integration using composite Simpson's rule.
- Cartesian, polar, parametric and implicit graph sampling.
- User-defined functions stored locally.
- Complex arithmetic, matrix operations, descriptive statistics and linear regression.
- Number theory utilities: primality, prime factors, divisors, GCD/LCM, continued fractions and rational approximation.
- Base conversion, permutations, combinations and factorial using BigInt.
- Local history up to 1,000 entries with CSV export.
- Initial mathematics/physics/chemistry formula library and 118-element periodic table data.
- Camera image selection with a server-side OCR adapter requiring Mathpix credentials.
- DEG/RAD/GRAD settings, five themes, PWA configuration and proposed web/Android workflows.

## Not yet verified
- npm dependency installation did not complete in the original build environment; npm run build and Vitest were not successfully run.
- TypeScript/TSX syntax checks are not type-checking or runtime verification.
- No APK has been built or signed.
- No web deployment has been published.
- OCR requires a deployed API and server-side MATHPIX_APP_ID and MATHPIX_APP_KEY secrets.
- 100 significant digits is an engine setting, not a guarantee for every operation. Graphing, numerical integration, some matrix/statistics operations and symbolic transformations have library-specific limits.
- Symbolic solving/integration are limited to forms supported by Nerdamer.
- Formula coverage is preliminary; periodic table data does not include all detailed chemical properties.
- Matrix multiplication currently uses one input matrix and multiplies it by itself; a separate second-matrix UI is not implemented.

## Next steps
1. Complete dependency installation and run the production build.
2. Run tests and fix type/runtime issues.
3. Verify GitHub Actions web and Android workflows.
4. Configure Pages and OCR hosting if needed.
5. Produce and test a debug APK before preparing a signed release.