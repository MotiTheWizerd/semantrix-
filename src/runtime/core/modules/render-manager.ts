import { EventHub, RuntimeEvents } from "../events/event-hub.js";
import { ComponentFragmentBoundary, ComponentManager } from "./component-manager.js";
import { DOMManager, VNode } from "./dom-manager.js";
import { now } from "../utils/time.js";

export class RenderManager {
  private rootContainer: HTMLElement | null = null;
  private rootComponent: VNode | null = null;

  constructor(
    private readonly componentManager: ComponentManager,
    private readonly domManager: DOMManager,
    private readonly events: EventHub<RuntimeEvents>
  ) {}

  private notifyMount(component: Function, element: HTMLElement | DocumentFragment): void {
    this.events.emit("component:mounted", { component, element, timestamp: now() });
  }

  private notifyUnmount(component: Function): void {
    this.events.emit("component:unmounted", { component, timestamp: now() });
  }

  private cleanupComponent(component: Function): void {
    const data = this.componentManager.getComponentData(component);
    if (!data) {
      return;
    }

    data.effects.forEach((effect, index) => {
      if (effect?.cleanup) {
        this.events.emit("hook:effect-cleanup", { component, hookIndex: index, timestamp: now() });
        effect.cleanup();
      }
    });

    this.componentManager.removeComponent(component);
  }

  private createFragmentBoundary(component: Function, fragment: DocumentFragment): { fragment: DocumentFragment; boundary: ComponentFragmentBoundary } {
    const label = component.name || "component";
    const start = document.createComment(`trx:${label}:start`);
    const end = document.createComment(`trx:${label}:end`);
    const wrapped = document.createDocumentFragment();
    wrapped.appendChild(start);

    while (fragment.firstChild) {
      wrapped.appendChild(fragment.firstChild);
    }

    wrapped.appendChild(end);

    return {
      fragment: wrapped,
      boundary: { start, end }
    };
  }

  private rerenderFragmentInstance(component: Function, boundary: ComponentFragmentBoundary): boolean {
    const parent = boundary.start.parentNode;
    if (!parent) {
      return false;
    }

    const props = this.componentManager.getComponentData(component)?.props ?? {};
    this.componentManager.setCurrentComponent(component, props);
    const result = component(props);
    const domElement = this.domManager.createDOMElement(result, this.renderFunctionComponent);
    this.componentManager.clearCurrentComponent();

    if (!(domElement instanceof DocumentFragment)) {
      return false;
    }

    const newNodes = Array.from(domElement.childNodes);

    let node: ChildNode | null = boundary.start.nextSibling;
    while (node && node !== boundary.end) {
      const next = node.nextSibling;
      parent.removeChild(node);
      node = next;
    }

    for (const child of newNodes) {
      parent.insertBefore(child, boundary.end);
    }

    return true;
  }

  private rerenderComponentInstance(component: Function): boolean {
    const data = this.componentManager.getComponentData(component);
    if (!data) {
      return false;
    }

    if (data.fragment) {
      return this.rerenderFragmentInstance(component, data.fragment);
    }

    if (!data.element) {
      return false;
    }

    const targetNode = data.element;
    const parent = targetNode.parentNode;
    if (!parent) {
      return false;
    }

    const props = data.props ?? {};
    this.componentManager.setCurrentComponent(component, props);
    const result = component(props);
    const domElement = this.domManager.createDOMElement(result, this.renderFunctionComponent);
    this.componentManager.clearCurrentComponent();

    if (domElement instanceof DocumentFragment) {
      return false;
    }

    parent.replaceChild(domElement, targetNode);
    this.componentManager.updateElement(component, domElement);
    return true;
  }

  renderFunctionComponent = (vNode: VNode): HTMLElement | DocumentFragment => {
    const component = vNode.type as Function;
    const props = vNode.props;

    if (component.name === "Fragment") {
      const fragment = document.createDocumentFragment();
      const children = props.children || [];
      const childArray = Array.isArray(children) ? children : [children];

      childArray.forEach((child: any) => {
        if (child) {
          const childElement = this.domManager.createDOMElement(child, this.renderFunctionComponent);
          fragment.appendChild(childElement);
        }
      });

      return fragment as any;
    }

    const componentData = this.componentManager.setCurrentComponent(component, props);
    const wasFragment = Boolean(componentData.fragment);
    const currentElement = componentData.element;
    const isFirstMount = !currentElement && !wasFragment;
    const result = component(props);
    const renderedNode = this.domManager.createDOMElement(result, this.renderFunctionComponent);

    if (renderedNode instanceof DocumentFragment) {
      const { fragment, boundary } = this.createFragmentBoundary(component, renderedNode);
      this.componentManager.updateFragment(component, boundary);
      this.componentManager.updateElement(component, null);
      this.componentManager.clearCurrentComponent();

      if (isFirstMount) {
        this.notifyMount(component, fragment);
      }

      return fragment;
    }

    this.componentManager.updateFragment(component, null);
    this.componentManager.updateElement(component, renderedNode);
    this.componentManager.clearCurrentComponent();

    if (isFirstMount) {
      this.notifyMount(component, renderedNode);
    }

    return renderedNode;
  };

  render(component: VNode, container: HTMLElement): void {
    const previousRoot = this.rootComponent;
    const previousFn = previousRoot && typeof previousRoot.type === "function"
      ? (previousRoot.type as Function)
      : null;
    const nextFn = typeof component.type === "function" ? (component.type as Function) : null;

    if (previousFn && previousFn !== nextFn) {
      this.cleanupComponent(previousFn);
      this.notifyUnmount(previousFn);
    } else if (previousFn && !nextFn) {
      this.cleanupComponent(previousFn);
      this.notifyUnmount(previousFn);
    }

    this.rootContainer = container;
    this.rootComponent = component;

    container.innerHTML = "";

    const domElement = this.domManager.createDOMElement(component, this.renderFunctionComponent);
    container.appendChild(domElement);
  }

  rerender(): void {
    if (this.rootContainer && this.rootComponent) {
      this.render(this.rootComponent, this.rootContainer);
    }
  }

  rerenderComponents(components: Function[]): void {
    const visited = new Set<Function>();
    let fallbackToRoot = false;

    for (const component of components) {
      if (visited.has(component)) {
        continue;
      }
      visited.add(component);

      if (this.rootComponent && typeof this.rootComponent.type === "function" && this.rootComponent.type === component) {
        fallbackToRoot = true;
        continue;
      }

      const success = this.rerenderComponentInstance(component);
      if (!success) {
        fallbackToRoot = true;
      }
    }

    if (fallbackToRoot) {
      this.rerender();
    }
  }
}
