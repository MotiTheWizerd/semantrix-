import { EventHub, RenderFlushScope, RuntimeEvents, RuntimeRenderReason } from "./events/event-hub.js";
import { ComponentManager } from "./modules/component-manager.js";
import { HookManager } from "./modules/hook-manager.js";
import { RenderManager } from "./modules/render-manager.js";
import { DOMManager } from "./modules/dom-manager.js";
import { now } from "./utils/time.js";

export class TrxManager {
  private readonly eventHub: EventHub<RuntimeEvents>;
  private readonly componentManager: ComponentManager;
  private readonly hookManager: HookManager;
  private readonly renderManager: RenderManager;
  private readonly domManager: DOMManager;
  private unsubscribeRender?: () => void;
  private renderQueued = false;
  private pendingReasons = new Set<RuntimeRenderReason>();
  private pendingComponents = new Set<Function>();
  private rootInvalidated = false;

  constructor() {
    this.eventHub = new EventHub();
    this.componentManager = new ComponentManager();
    this.domManager = new DOMManager(this.eventHub);
    this.renderManager = new RenderManager(this.componentManager, this.domManager, this.eventHub);
    this.hookManager = new HookManager(this.componentManager, this.eventHub);

    this.unsubscribeRender = this.eventHub.on("render:request", ({ reason, component }) => {
      this.enqueueRender(reason, component ?? null);
    });

    this.createElement = this.domManager.createElement.bind(this.domManager);
    this.useState = this.hookManager.useState.bind(this.hookManager);
    this.useEffect = this.hookManager.useEffect.bind(this.hookManager);
    this.useRef = this.hookManager.useRef.bind(this.hookManager);
    this.render = this.renderManager.render.bind(this.renderManager);
  }

  public createElement: typeof this.domManager.createElement;
  public useState: typeof this.hookManager.useState;
  public useEffect: typeof this.hookManager.useEffect;
  public useRef: typeof this.hookManager.useRef;
  public render: typeof this.renderManager.render;

  requestRender(reason: RuntimeRenderReason = "external", component?: Function | null): void {
    this.eventHub.emit("render:request", { reason, component: component ?? null, timestamp: now() });
  }

  cleanup(): void {
    this.unsubscribeRender?.();
    this.renderQueued = false;
    this.pendingReasons.clear();
    this.pendingComponents.clear();
    this.rootInvalidated = false;
    this.componentManager.cleanup();
    this.eventHub.clear();
  }

  get events(): EventHub<RuntimeEvents> {
    return this.eventHub;
  }

  private enqueueRender(reason: RuntimeRenderReason, component: Function | null): void {
    this.pendingReasons.add(reason);

    if (component) {
      this.pendingComponents.add(component);
    } else {
      this.rootInvalidated = true;
    }

    if (this.renderQueued) {
      return;
    }

    this.renderQueued = true;
    queueMicrotask(() => {
      const reasons = Array.from(this.pendingReasons);
      const components = Array.from(this.pendingComponents);
      const shouldRenderRoot = this.rootInvalidated || components.length === 0;
      const scope: RenderFlushScope = shouldRenderRoot ? "root" : "components";

      this.pendingReasons.clear();
      this.pendingComponents.clear();
      this.rootInvalidated = false;
      this.renderQueued = false;

      if (reasons.length === 0) {
        return;
      }

      const startedAt = now();

      if (shouldRenderRoot) {
        this.renderManager.rerender();
      } else {
        this.renderManager.rerenderComponents(components);
      }

      const duration = Math.max(0, now() - startedAt);
      this.eventHub.emit("render:flush", {
        reasons,
        components: scope === "components" ? components : [],
        scope,
        timestamp: startedAt,
        duration
      });
    });
  }
}
