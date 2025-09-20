import { describe, it, expect, vi } from "vitest";

import { EventHub, RuntimeEvents } from "../src/runtime/core/events/event-hub.js";
import { DOMManager } from "../src/runtime/core/modules/dom-manager.js";

function mockRenderFunctionComponent() {
  throw new Error("Function components should not be invoked in this test");
}

describe("DOMManager", () => {
  it("creates text nodes for primitive children", () => {
    const events = new EventHub<RuntimeEvents>();
    const domManager = new DOMManager(events);
    const nodeCreated = vi.fn();
    events.on("dom:node-created", nodeCreated);

    const vnode = domManager.createElement("div", null, "hello", 123);
    const element = domManager.createDOMElement(vnode, mockRenderFunctionComponent) as HTMLElement;

    expect(element.tagName).toBe("DIV");
    expect(element.textContent).toBe("hello123");
    expect(nodeCreated).toHaveBeenCalled();
  });

  it("attaches event listeners and refs", () => {
    const events = new EventHub<RuntimeEvents>();
    const domManager = new DOMManager(events);
    const clickHandler = vi.fn();
    const ref = { current: null as HTMLButtonElement | null };

    const vnode = domManager.createElement("button", { onClick: clickHandler, ref }, "Click me");
    const element = domManager.createDOMElement(vnode, mockRenderFunctionComponent) as HTMLButtonElement;

    expect(ref.current).toBe(element);

    element.click();
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });
});
