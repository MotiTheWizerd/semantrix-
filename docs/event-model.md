# Runtime Event Model

This document captures the event-driven boundaries we will introduce around the Semantrix runtime. The goal is to decouple components, hook state, and rendering so that future features (e.g., async scheduling, devtools introspection) can subscribe to lifecycle changes without modifying core modules.

## Actors & Responsibilities

- **ComponentManager** - tracks component instances, hook slots, and associates rendered DOM nodes.
- **HookManager** - manages hook execution order and emits lifecycle events when state transitions happen.
- **DOMManager** - converts virtual nodes into real DOM nodes, dispatching structural change events.
- **RenderManager** - owns the active root tree and reacts to render requests by reconciling DOM output.
- **EventHub** - lightweight pub/sub layer shared between the managers.

## Event Channels

| Event | Publisher | Payload | Consumers | Purpose |
|-------|-----------|---------|-----------|---------|
| `render:request` | HookManager / TrxManager | `{ reason: 'state-change' | 'external' | 'effect', component?: Function | null, timestamp: number }` | TrxManager | Adds a render to the microtask queue (scoped to component when provided) |
| `render:flush` | TrxManager | `{ reasons: RuntimeRenderReason[], components: Function[], scope: 'root' | 'components', timestamp: number, duration: number }` | RenderManager, tooling | Signals when queued renders are flushed |
| `component:mounted` | RenderManager | `{ component, element, timestamp }` | Tooling | Observes first mount of a function component |
| `component:unmounted` | RenderManager | `{ component }` | HookManager, tooling | Allows cleanup on teardown |
| `hook:effect-scheduled` | HookManager | `{ component, hookIndex, dependencies, timestamp }` | Tooling | Traces effect registrations |
| `hook:effect-cleanup` | HookManager / RenderManager | `{ component, hookIndex, timestamp }` | Tooling | Tracks effect disposal before re-run or unmount |
| `dom:node-created` | DOMManager | `{ vNode, node, timestamp }` | Tooling | Trace DOM hydration |

> Additional events (e.g., `hook:effect-error`) can be layered on later without touching existing modules.

## Flow Overview

1. `RenderManager.render` mounts a root tree and sets `ComponentManager` context.
2. As function components execute, `HookManager` pulls hook slots from `ComponentManager`.
3. When `useState` updates, `HookManager` publishes `render:request` with the owning component; the `TrxManager` batches requests per microtask and emits `render:flush` before delegating to the renderer.
4. `RenderManager` re-runs only the components flagged in the flush. If a component cannot be surgically replaced (e.g., it renders a fragment), the manager falls back to a full root render.
5. DOM mutations are produced by `DOMManager`, which emits `dom:node-created` for instrumentation.

The EventHub abstraction keeps modules loosely coupled while preserving synchronous behaviour for now. Later iterations can swap the hub with a queued scheduler without disrupting module APIs.


