# TODO

## High Priority

- Replace `pnpm dlx nx ...` in `.github/workflows/ci.yml` with the pinned workspace binary, such as `pnpm exec nx ...` or `pnpm nx ...`.
- Fix package type entrypoints in both package manifests so `types` and `exports["."].types` point to the actual generated declaration files.

## Medium Priority

- Decide whether `Permissions` in `rbac-core` should be constrained to `extends string`.
- Decide whether keeping `fp-ts` as an internal implementation dependency is still worthwhile after removing it from the public API.

## Low Priority

- Add direct tests for `rbac-core`.
- Add a runtime test for duplicate module registration.
- Add consumer-style integration tests that exercise both packages together through public entrypoints.
