# ADR-001 — Conversation is not the system of record

> Historical decision/design context. Personal AI Workspace, PAW and Workspace product references use the former name. See [current product terminology and capability boundaries](../architecture/AGENT_OPERATIONS_PLATFORM.md). Original proposals and acceptance limits remain scoped as written.

**Status:** Accepted

## Decision
Conversation is an interaction surface. Durable work state must live in the Workspace.

## Consequence
Chat history may inform interpretation, but must not be the sole authoritative store for project lifecycle, tasks, actions, or outcomes.
