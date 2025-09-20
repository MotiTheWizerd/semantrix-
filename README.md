# Semantrix

[![npm version](https://badge.fury.io/js/semantrix.svg)](https://badge.fury.io/js/semantrix)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

> A lightweight, React-like DOM runtime designed specifically for VS Code extensions. Built with TypeScript and optimized for dynamic HTML generation in constrained environments.

## ✨ Features

- 🚀 **Lightweight**: Minimal bundle size perfect for VS Code extensions
- ⚡ **Performance-First**: Smart rendering with targeted updates and microtask batching
- 🎯 **React-like API**: Familiar hooks (`useState`, `useEffect`, `useRef`) and JSX support
- 🔍 **Observable**: Comprehensive event system for debugging and tooling
- 📦 **TypeScript-First**: Full type safety with comprehensive JSX definitions
- 🎨 **Fragment Support**: Components can return multiple elements seamlessly
- 🛠️ **VS Code Optimized**: Purpose-built for extension development workflows

## 🚀 Quick Start

### Installation

```bash
npm install semantrix
```

### Basic Usage

```tsx
import { render, createElement, useState } from "semantrix";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}

// Mount your app
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (container) {
    render(<Counter />, container);
  }
});
```

## 📖 API Reference

### Core Functions

#### `render(component, container)`
Renders a component into a DOM container.

```tsx
render(<MyComponent />, document.getElementById("root"));
```

#### `createElement(type, props, ...children)`
Creates virtual DOM elements. Usually used via JSX.

```tsx
createElement("div", { className: "container" }, "Hello World");
// or with JSX: <div className="container">Hello World</div>
```

### Hooks

#### `useState<T>(initialValue)`
Manages component state with automatic re-rendering.

```tsx
function MyComponent() {
  const [name, setName] = useState("World");
  
  return <h1>Hello, {name}!</h1>;
}
```

#### `useEffect(callback, dependencies?)`
Handles side effects with automatic cleanup.

```tsx
function MyComponent() {
  useEffect(() => {
    // Side effect
    const timer = setInterval(() => console.log("tick"), 1000);
    
    // Cleanup
    return () => clearInterval(timer);
  }, []); // Empty deps = run once on mount
  
  return <div>Component with effect</div>;
}
```

#### `useRef<T>(initialValue)`
Creates a mutable reference that persists across renders.

```tsx
function MyComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const focusInput = () => {
    inputRef.current?.focus();
  };
  
  return (
    <div>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
}
```

### Event System

Semantrix provides comprehensive observability through its event system:

```tsx
import { events } from "semantrix";

// Monitor render performance
events.on("render:flush", ({ scope, duration, components }) => {
  console.log(`Render completed in ${duration}ms (${scope})`);
});

// Track component lifecycle
events.on("component:mounted", ({ component, element }) => {
  console.log(`Component ${component.name} mounted`);
});

// Debug effects
events.on("hook:effect-scheduled", ({ component, hookIndex, dependencies }) => {
  console.log(`Effect scheduled for ${component.name}`);
});
```

## 🏗️ Architecture

Semantrix is built with a modular, event-driven architecture:

- **TrxManager**: Central orchestrator that coordinates all modules
- **ComponentManager**: Tracks component instances and hook state
- **HookManager**: Manages React-like hooks with dependency tracking
- **RenderManager**: Handles DOM reconciliation and updates
- **DOMManager**: Converts virtual nodes to real DOM elements
- **EventHub**: Provides comprehensive observability

### Smart Rendering Strategy

1. **Targeted Updates**: Only re-renders components that actually changed
2. **Microtask Batching**: Batches multiple state changes into single render cycles
3. **Fragment Support**: Seamless handling of multi-element components
4. **Fallback Strategy**: Falls back to full root render when surgical updates aren't possible

## 🎯 VS Code Extension Usage

Perfect for creating dynamic UI in VS Code extensions:

```tsx
// In your VS Code extension
import { render, createElement, useState } from "semantrix";

function ExtensionPanel() {
  const [status, setStatus] = useState("idle");
  
  return (
    <div className="extension-panel">
      <h3>My Extension</h3>
      <p>Status: {status}</p>
      <button onClick={() => setStatus("running")}>
        Start Process
      </button>
    </div>
  );
}

// Render in WebView
const panel = vscode.window.createWebviewPanel(
  "myExtension",
  "My Extension",
  vscode.ViewColumn.One
);

render(<ExtensionPanel />, panel.webview.document.body);
```

## 🧪 Examples

Check out the [examples directory](./examples/) for:

- **Browser Demo**: Interactive examples with diagnostics panel
- **Counter Component**: Basic state management
- **Ref Example**: DOM element references
- **Performance Monitoring**: Real-time render metrics

Run the browser example:

```bash
npm run examples:serve
# Open http://localhost:3000
```

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## 📦 Development

```bash
# Build the package
npm run build

# Clean build artifacts
npm run clean
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ for the VS Code extension development community. Inspired by React's component model and optimized for extension constraints.

---

**Made for VS Code extensions, but works anywhere you need lightweight, reactive DOM updates.**
