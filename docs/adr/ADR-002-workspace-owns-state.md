# ADR-002 — Workspace owns persistent work state

> Historical decision/design context. Personal AI Workspace, PAW and Workspace product references use the former name. See [current product terminology and capability boundaries](../architecture/AGENT_OPERATIONS_PLATFORM.md). Original proposals and acceptance limits remain scoped as written.

**Status:** Accepted

## Decision
The Workspace owns the structured cross-system representation of goals, projects, tasks, resources, actions, outcomes, and lifecycle state.

External systems remain authoritative for their native records.
