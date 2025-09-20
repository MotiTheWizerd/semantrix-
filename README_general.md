# Semantrix

Lightweight runtime designed to make authoring dynamic HTML snippets inside VS Code less painful. The core is written in TypeScript and ships ready for consumption as an npm package.

## Installation

```bash
npm install semantrix
```

## Usage

```ts
import { render, createElement } from "semantrix";
import { MyComponent } from "./my-component";

document.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("root");
  if (mount) {
    render(createElement(MyComponent, {}), mount);
  }
});
```

## Project Layout

- `src/` - package source code compiled to `dist/`
  - `runtime/` - current Trx manager implementation, events, and supporting modules
  - `index.ts` - public entry point that wires runtime APIs for consumers
- `examples/` - browser demos and archived experiments that exercise the runtime
  - `browser/` - quick-start sample backed by `examples/browser/index.html`
- `docs/` - design notes, including the event flow captured in `docs/event-model.md`
- `tests/` - Vitest suites covering hooks, DOM, and integration flows
- `dist/` - generated build artifacts (gitignored)

## Scripts

- `npm run build` - clean and compile the TypeScript source to ESM + declarations
- `npm test` - execute the Vitest suite (jsdom environment)
- `npm run test:watch` - watch mode for tests
- `npm run examples:serve` - rebuild the package and host the browser example (requires `http-server`)

## Development Notes

- The runtime routes coordination through an `EventHub`. Subscribe via `trxManager.events.on(...)` to observe render queue activity, effect scheduling, and DOM instrumentation. See `docs/event-model.md` for the full contract.
- Component-local state changes now trigger targeted rerenders. The scheduler batches requests per microtask and only re-executes the affected component whenever its DOM node can be replaced in isolation.
- Effects emit `hook:effect-scheduled` and `hook:effect-cleanup` so future tooling can trace lifecycle transitions.
- The TypeScript compiler uses NodeNext resolution so relative imports end with `.js`.
- The package exposes ESM builds via the `exports` field; CommonJS consumers should rely on tooling that understands ESM.
- Examples import the source through the `semantrix` path alias configured in `tsconfig.json`.

## Next Steps

- Emit timing metadata (e.g., duration, timestamp) for render and effect events so tooling can surface performance insights.
- Layer in an integration harness that exercises nested component trees with async effects.
- Prototype a developer overlay that consumes the event stream in `examples/browser` to visualise component and hook lifecycles.

