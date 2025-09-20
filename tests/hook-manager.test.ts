import { describe, it, expect, vi } from "vitest";

import { EventHub, RuntimeEvents } from "../src/runtime/core/events/event-hub.js";
import { ComponentManager } from "../src/runtime/core/modules/component-manager.js";
import { HookManager } from "../src/runtime/core/modules/hook-manager.js";

describe("HookManager", () => {
  const setup = () => {
    const events = new EventHub<RuntimeEvents>();
    const componentManager = new ComponentManager();
    const hookManager = new HookManager(componentManager, events);
    return { events, componentManager, hookManager };
  };

  it("emits a render request when state changes", () => {
    const { events, componentManager, hookManager } = setup();
    const renderListener = vi.fn();
    events.on("render:request", renderListener);

    function TestComponent() {
      return null;
    }

    componentManager.setCurrentComponent(TestComponent);
    const [, setValue] = hookManager.useState(0);
    componentManager.clearCurrentComponent();

    componentManager.setCurrentComponent(TestComponent);
    setValue(1);

    expect(renderListener).toHaveBeenCalledTimes(1);
    expect(renderListener).toHaveBeenCalledWith(expect.objectContaining({
      reason: "state-change",
      component: TestComponent,
      timestamp: expect.any(Number)
    }));
  });

  it("does not emit when new state is identical", () => {
    const { events, componentManager, hookManager } = setup();
    const renderListener = vi.fn();
    events.on("render:request", renderListener);

    function TestComponent() {
      return null;
    }

    componentManager.setCurrentComponent(TestComponent);
    const [, setValue] = hookManager.useState(0);
    componentManager.clearCurrentComponent();

    componentManager.setCurrentComponent(TestComponent);
    setValue(0);

    expect(renderListener).not.toHaveBeenCalled();
  });

  it("emits effect lifecycle events when dependencies change", () => {
    const { events, componentManager, hookManager } = setup();
    const scheduled = vi.fn();
    const cleaned = vi.fn();
    events.on("hook:effect-scheduled", scheduled);
    events.on("hook:effect-cleanup", cleaned);

    function TestComponent() {
      return null;
    }

    componentManager.setCurrentComponent(TestComponent);
    hookManager.useEffect(() => () => {}, [1]);
    componentManager.clearCurrentComponent();

    expect(scheduled).toHaveBeenCalledTimes(1);
    expect(scheduled.mock.calls[0][0]).toMatchObject({
      component: TestComponent,
      hookIndex: 0,
      dependencies: [1],
      timestamp: expect.any(Number)
    });

    componentManager.setCurrentComponent(TestComponent);
    hookManager.useEffect(() => () => {}, [2]);
    componentManager.clearCurrentComponent();

    expect(cleaned).toHaveBeenCalledTimes(1);
    expect(cleaned).toHaveBeenCalledWith(expect.objectContaining({
      component: TestComponent,
      hookIndex: 0,
      timestamp: expect.any(Number)
    }));
    expect(scheduled).toHaveBeenCalledTimes(2);
    expect(scheduled.mock.calls[1][0]).toMatchObject({
      component: TestComponent,
      hookIndex: 0,
      dependencies: [2],
      timestamp: expect.any(Number)
    });
  });

  it("provides stable ref objects across renders", () => {
    const { componentManager, hookManager } = setup();

    function TestComponent() {
      return null;
    }

    componentManager.setCurrentComponent(TestComponent);
    const refA = hookManager.useRef<HTMLDivElement | null>(null);
    componentManager.clearCurrentComponent();

    componentManager.setCurrentComponent(TestComponent);
    const refB = hookManager.useRef<HTMLDivElement | null>(null);

    expect(refB).toBe(refA);
    expect(refA.current).toBeNull();
  });
});
