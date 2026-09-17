# ADR-003 — ChatGPT-native first

> Historical decision/design context. Personal AI Workspace, PAW and Workspace product references use the former name. See [current product terminology and capability boundaries](../architecture/AGENT_OPERATIONS_PLATFORM.md). Original proposals and acceptance limits remain scoped as written.

**Status:** Accepted

## Decision
ChatGPT is the primary interaction and reasoning host for the first product path.

The Workspace integrates with ChatGPT rather than rebuilding a parallel general-purpose chat product.

## Constraint
The Workspace backend and state model remain conceptually separable from ChatGPT so a future secondary client is possible.
