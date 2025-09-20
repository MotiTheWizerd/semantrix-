import { createElement, useState, useRef, useEffect, render, events } from "semantrix";

function DiagnosticsPanel() {
  const [stats, setStats] = useState({
    flushes: 0,
    componentFlushes: 0,
    lastScope: "root" as "root" | "components",
    lastDuration: 0,
    lastComponentCount: 0
  });

  useEffect(() => {
    const offFlush = events.on("render:flush", payload => {
      setStats(prev => ({
        flushes: prev.flushes + 1,
        componentFlushes: prev.componentFlushes + (payload.scope === "components" ? 1 : 0),
        lastScope: payload.scope,
        lastDuration: Math.round(payload.duration),
        lastComponentCount: payload.components.length
      }));
    });

    return () => {
      offFlush();
    };
  }, []);

  return (
    <section className="diagnostics">
      <h2>Render Diagnostics</h2>
      <p>Total flushes: {stats.flushes}</p>
      <p>Component-scoped flushes: {stats.componentFlushes}</p>
      <p>Last scope: {stats.lastScope}</p>
      <p>Last duration: {stats.lastDuration}ms</p>
      <p>Components updated: {stats.lastComponentCount}</p>
    </section>
  );
}

function HelloWorld() {
  return (
    <div>
      <h1>Hello World!</h1>
      <p>This is JSX working with the Semantrix runtime.</p>
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h2>Counter: {count}</h2>
      <button onClick={() => setCount(value => value + 1)}>Increment</button>
    </div>
  );
}

function RefExample() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <h3>useRef Example</h3>
      <input
        ref={inputRef}
        value={text}
        onInput={(e) => setText((e.target as HTMLInputElement).value)}
        placeholder="Type something..."
      />
      <button onClick={focusInput}>Focus Input</button>
      <p>You typed: {text}</p>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <DiagnosticsPanel />
      <HelloWorld />
      <Counter />
      <RefExample />
    </div>
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (container) {
    render(<App />, container);
  } else {
    console.error("Root element not found");
  }
});

console.log("Semantrix diagnostics example loaded!");
