# ADR-004 — MCP / Apps SDK is an integration boundary

> Historical decision/design context. Personal AI Workspace, PAW and Workspace product references use the former name. See [current product terminology and capability boundaries](../architecture/AGENT_OPERATIONS_PLATFORM.md). Original proposals and acceptance limits remain scoped as written.

**Status:** Accepted

## Decision
MCP / Apps SDK exposes Workspace capabilities to ChatGPT.

It is not the domain model and not the product itself.

Tool availability is not equivalent to durable work state.
