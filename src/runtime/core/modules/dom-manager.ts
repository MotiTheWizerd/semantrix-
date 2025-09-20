import { EventHub, RuntimeEvents } from "../events/event-hub.js";
import { now } from "../utils/time.js";

export interface VNode {
  type: string | Function;
  props: Record<string, any>;
  children: (VNode | string | number)[];
}

export class DOMManager {
  constructor(private readonly events?: EventHub<RuntimeEvents>) {}

  private notifyNodeCreated(vNode: VNode | string | number, node: Node): void {
    this.events?.emit("dom:node-created", { vNode, node, timestamp: now() });
  }

  createElement(type: string | Function, props: Record<string, any> | null, ...children: any[]): VNode {
    const flatChildren = children.flat().filter(child =>
      child !== null && child !== undefined && child !== false
    );

    return {
      type,
      props: props || {},
      children: flatChildren.map(child =>
        typeof child === "object" ? child : String(child)
      )
    };
  }

  createDOMElement(
    vNode: VNode | string | number,
    renderFunctionComponent: (vNode: VNode) => HTMLElement | DocumentFragment
  ): HTMLElement | Text | DocumentFragment {
    if (typeof vNode === "string" || typeof vNode === "number") {
      const textNode = document.createTextNode(String(vNode));
      this.notifyNodeCreated(vNode, textNode);
      return textNode;
    }

    if (typeof vNode.type === "function") {
      const rendered = renderFunctionComponent(vNode);
      this.notifyNodeCreated(vNode, rendered);
      return rendered;
    }

    const element = document.createElement(vNode.type as string);

    if (vNode.props) {
      Object.entries(vNode.props).forEach(([key, value]) => {
        if (key === "className") {
          element.className = value;
        } else if (key === "ref" && value && typeof value === "object" && "current" in value) {
          value.current = element;
        } else if (key.startsWith("on") && typeof value === "function") {
          const eventName = key.slice(2).toLowerCase();
          element.addEventListener(eventName, value);
        } else if (key !== "children") {
          element.setAttribute(key, value);
        }
      });
    }

    vNode.children.forEach(child => {
      if (child) {
        const childElement = this.createDOMElement(child, renderFunctionComponent);
        element.appendChild(childElement);
      }
    });

    this.notifyNodeCreated(vNode, element);
    return element;
  }
}
