# Intent And Scope

## Core Idea

This repository should be understood as a typed and unified grant-based policy enforcement point for application code.

It is not trying to be a universal RBAC platform.

The goal is:

- provide one consistent way to define grant scopes
- provide one consistent way to evaluate permission predicates
- make invalid policy references fail at compile time where possible
- keep policy checks small, composable, and readable in application code

## Mental Model

The cleanest model for this repository is:

- a grant vocabulary exists somewhere
- the application builds a typed registry from that vocabulary
- runtime grants are loaded dynamically for the current context
- policy expressions are evaluated on demand in application code

The important part is the structure, not the origin of the vocabulary.

The vocabulary may:

- live locally in source code
- be generated from an OpenAPI contract
- be generated from another contract format
- come from a shared schema package

This repository should not assume one mandatory source of truth for the vocabulary. It should assume that a stable vocabulary exists and can be turned into a typed registry.

## What The Library Is

At the moment, the library provides two layers:

- `@levi2ki/rbac-core`
  Minimal typed primitives for grant modules and typed registries.
- `@levi2ki/rbac-expression`
  Predicate-building utilities on top of the registry, such as `has`, `not`, `and`, and `or`.

This makes the library a compile-time safe policy expression layer.

## What The Library Is Not

The current design does not attempt to solve:

- role management
- user-to-role assignment
- persistence
- storage schema
- admin tooling
- multi-tenant policy distribution
- audit logs
- policy versioning
- remote evaluation
- attribute-based access control as a full separate model

None of those absences are flaws by themselves if the intended product remains a policy enforcement point.

## Product Boundary

The cleanest framing is:

- some upstream or local source defines which grants exist
- runtime systems decide which grants are present in the current context
- this library defines how application code refers to those grants and evaluates policy predicates

That boundary is strong and worth preserving.

## Design Principle

The most valuable property in this repository is not feature breadth.

It is the guarantee that policy checks are:

- easy to standardize
- easy to compose
- hard to mistype
- cheap to run
- easy to grep in a codebase

If future work threatens those properties, it should be treated as a design regression even if it adds more capability.
