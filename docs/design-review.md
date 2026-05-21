# Design Review

## Overall Assessment

The idea is good.

The design is strongest when framed as a developer-facing, grant-based policy enforcement point instead of a complete RBAC solution. Under that framing, the current API is coherent and appropriately narrow.

## What Works Well

### 1. Clear separation of concerns

`rbac-core` is intentionally small and type-oriented, while `rbac-expression` focuses on policy predicates. That split makes the mental model easy to understand.

### 2. Compile-time safety has real value

The registry-driven grant strings are the main differentiator of the library. If a consumer writes `task.EDIT`, the system can validate that `task` exists and that `EDIT` belongs to that module. That is exactly the kind of failure that should happen before runtime.

### 3. Policy checks are composable

`has`, `not`, `and`, and `or` are enough to express a surprising amount of application policy without turning the API into a framework.

### 4. The runtime model is cheap

Evaluation is simple array membership checks and boolean composition. For a policy enforcement point inside application code, that is a good default.

## Design Risks

### 1. The runtime role of `registry` is ambiguous

`createExpression(registry)` reads as if the registry is part of runtime behavior, but in practice the main value is in its type information. That is fine, but it should be explicit in documentation and naming.

### 2. The role of the vocabulary source should stay abstract

The system becomes weaker if it is framed too tightly around one acquisition path, such as OpenAPI codegen. The underlying concept is a stable grant vocabulary, not a specific way of obtaining it.

That distinction matters because it keeps the library reusable across:

- generated contract-driven code
- locally declared grant sets
- shared schema packages

### 3. Runtime grant state is part of the product contract

The API now exposes a package-owned grant state model instead of `fp-ts/Option`. That is a better fit for a reusable library because it keeps the important semantics explicit without forcing consumers into one functional toolkit.

The next product decision is narrower:

- whether the current `resolved | unresolved` model is enough
- whether future adapters need a richer state model such as `error` or `unknown`

### 4. The library currently optimizes for correctness more than for ergonomics

That is the right bias for an early policy library, but public adoption usually depends on both. The next stage should focus on making the correct path easier to use, not on adding more operators.

## Recommendation

Keep the product boundary narrow:

- typed scopes
- typed grants
- composable predicates
- stable evaluation semantics

Do not expand into full RBAC management unless there is a separate package or a separate product need. The current concept is strongest as infrastructure for policy enforcement, not as a full authorization platform.
