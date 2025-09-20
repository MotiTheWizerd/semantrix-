import { describe, it, expect, vi } from "vitest";

import { TrxManager } from "../src/runtime/core/manager.js";

function Fragment({ children }: { children?: any }) {
  return children;
}

describe("TrxManager integration", () => {
  it("queues render requests and flushes once per microtask", async () => {
    const manager = new TrxManager();
    const { createElement, useState, render } = manager;
    const flushListener = vi.fn();
    manager.events.on("render:flush", flushListener);

    const container = document.createElement("div");
    let update: ((value: number) => void) | undefined;

    function Counter() {
      const [count, setCount] = useState(0);
      update = setCount;
      return createElement("div", null, count);
    }

    render(createElement(Counter, {}), container);

    update?.(1);
    update?.(2);

    await Promise.resolve();
    await Promise.resolve();

    expect(flushListener).toHaveBeenCalledTimes(1);
    const payload = flushListener.mock.calls[0][0];
    expect(payload).toMatchObject({
      reasons: ["state-change"],
      scope: "root",
      components: [],
      timestamp: expect.any(Number),
      duration: expect.any(Number)
    });
    expect(container.textContent).toBe("2");
  });

  it("keeps parent components stable when a child updates state", async () => {
    const manager = new TrxManager();
    const { createElement, useState, render } = manager;
    const container = document.createElement("div");
    const flushListener = vi.fn();
    manager.events.on("render:flush", flushListener);

    const parentRender = vi.fn();
    let bumpChild: (() => void) | undefined;

    function Child() {
      const [value, setValue] = useState(0);
      bumpChild = () => setValue(prev => prev + 1);
      return createElement("p", null, value);
    }

    function Parent() {
      parentRender();
      return createElement("section", null,
        createElement(Child, {}),
        createElement("span", null, "static")
      );
    }

    render(createElement(Parent, {}), container);

    parentRender.mockClear();
    flushListener.mockClear();

    bumpChild?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(parentRender).not.toHaveBeenCalled();
    expect(container.querySelector("p")?.textContent).toBe("1");
    expect(container.querySelector("span")?.textContent).toBe("static");

    expect(flushListener).toHaveBeenCalledTimes(1);
    const payload = flushListener.mock.calls[0][0];
    expect(payload.scope).toBe("components");
    expect(payload.components).toEqual([Child]);
    expect(typeof payload.timestamp).toBe("number");
    expect(typeof payload.duration).toBe("number");
  });

  it("rerenders fragment components without falling back to the root", async () => {
    const manager = new TrxManager();
    const { createElement, useState, render } = manager;
    const container = document.createElement("div");
    const flushListener = vi.fn();
    manager.events.on("render:flush", flushListener);

    let pushItem: (() => void) | undefined;

    function List() {
      const [items, setItems] = useState<number[]>([0, 1]);
      pushItem = () => setItems(values => [...values, values.length]);
      return createElement(
        Fragment,
        null,
        ...items.map(item => createElement("li", { key: item }, `Item ${item}`))
      );
    }

    function Shell() {
      return createElement("ul", null, createElement(List, {}));
    }

    render(createElement(Shell, {}), container);
    flushListener.mockClear();

    pushItem?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(flushListener).toHaveBeenCalledTimes(1);
    const payload = flushListener.mock.calls[0][0];
    expect(payload.scope).toBe("components");
    expect(payload.components).toEqual([List]);
    expect(typeof payload.timestamp).toBe("number");
    expect(typeof payload.duration).toBe("number");
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  it("emits lifecycle events on mount and unmount", () => {
    const manager = new TrxManager();
    const { createElement, useEffect, render } = manager;
    const mounts = vi.fn();
    const unmounts = vi.fn();
    const effectCleanups = vi.fn();

    manager.events.on("component:mounted", mounts);
    manager.events.on("component:unmounted", unmounts);
    manager.events.on("hook:effect-cleanup", effectCleanups);

    const container = document.createElement("div");

    function Effectful() {
      useEffect(() => () => {}, []);
      return createElement("span", null, "hello");
    }

    render(createElement(Effectful, {}), container);
    render(createElement("div", null, "bye"), container);

    expect(mounts).toHaveBeenCalledTimes(1);
    expect(mounts.mock.calls[0][0]).toMatchObject({
      component: Effectful,
      timestamp: expect.any(Number)
    });
    expect(unmounts).toHaveBeenCalledWith(expect.objectContaining({
      component: Effectful,
      timestamp: expect.any(Number)
    }));
    expect(effectCleanups).toHaveBeenCalledWith(expect.objectContaining({
      component: Effectful,
      hookIndex: 0,
      timestamp: expect.any(Number)
    }));
  });
});


