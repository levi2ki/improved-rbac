# Architecture Review

## Summary

The current architecture is appropriate for the stated goal of a unified, grant-based policy enforcement point.

The package split is sensible:

- `rbac-core` owns typed authorization primitives
- `rbac-expression` owns policy expression composition

That boundary is clean and should remain stable.

## Structural Model

The architecture is easiest to reason about in four pieces:

1. grant vocabulary
2. typed registry
3. runtime grant context
4. policy expressions

Those four pieces should remain distinct.

The vocabulary is structural and source-agnostic. It may be local, generated, or shared from another package. The runtime grant context is dynamic and context-sensitive. The expressions sit on top and describe business rules independently from the framework that invokes them.

## Architectural Strengths

### 1. Layering is simple

There is one clear dependency direction:

- `rbac-expression` depends on `rbac-core`
- `rbac-core` depends on nothing domain-specific

This is a good foundation for future growth.

### 2. The central abstraction is small

The repository does not hide policy checks behind a framework or service abstraction. That keeps enforcement local and transparent in application code.

### 3. Compile-time derivation is used where it matters

The architecture extracts value from TypeScript where it is strongest:

- scope names
- grant names
- required context shape for expressions

This is a better use of the type system than trying to encode a whole authorization engine at the type level.

## Architectural Tensions

### 1. `rbac-core` is nominally generic, but the system is semantically token-based

Architecturally, the combined system assumes grants are string-like tokens. If that is true, the boundary should say so explicitly instead of leaving `rbac-core` more generic than the higher layer can really support.

### 2. Runtime behavior and type behavior are not equally visible

The most important part of the system is in its type relationships, not in runtime mechanics. That is fine, but it means documentation and tests need to do extra work to make the architecture understandable to new contributors.

### 3. The current surface is library-oriented, not application-oriented

That is normal for the current maturity level. Still, if the repository grows, there may eventually be room for a thin application adapter layer that accepts plain objects instead of requiring explicit grant state wrappers everywhere.

### 4. Framework integration should stay outside the expression layer

The expression layer should not absorb React hooks, Nest decorators, page loaders, or grant fetching mechanics. Those belong in adapters built on top of the expression system.

This is especially important because one of the strongest potential advantages of the repository is monorepo reuse of the same policy expressions across frontend and backend packages.

## Evolution Path

The cleanest growth path is:

1. stabilize packaging and test confidence
2. clarify public contracts
3. improve ergonomics for consumers and adapters
4. only then add more expressive policy features

Examples of acceptable future growth:

- helper adapters from plain JS data to evaluation context
- more predicate combinators if they preserve readability
- package-level docs and examples
- integration helpers for common application frameworks

Examples of risky growth:

- adding role management into `rbac-core`
- adding persistence concerns into the expression package
- mixing policy definition, storage, and evaluation into one package

## Recommendation

Treat this repository as authorization infrastructure for code, not as an authorization platform.

That framing keeps the architecture sharp, avoids scope creep, and preserves the strongest property of the current design: predictable, typed, local policy enforcement.
