export type RuntimeRenderReason = "state-change" | "external" | "effect";
export type RenderFlushScope = "root" | "components";

export type RuntimeEventPayloads = {
  "render:request": { reason: RuntimeRenderReason; component?: Function | null; timestamp: number };
  "render:flush": {
    reasons: RuntimeRenderReason[];
    components: Function[];
    scope: RenderFlushScope;
    timestamp: number;
    duration: number;
  };
  "component:mounted": { component: Function; element: Node; timestamp: number };
  "component:unmounted": { component: Function; timestamp: number };
  "dom:node-created": { vNode: unknown; node: Node; timestamp: number };
  "hook:effect-scheduled": { component: Function; hookIndex: number; dependencies: readonly any[] | null; timestamp: number };
  "hook:effect-cleanup": { component: Function; hookIndex: number; timestamp: number };
};

export type RuntimeEvents = RuntimeEventPayloads;

type Listener<Payload> = (payload: Payload) => void;

export class EventHub<Events extends Record<string, any> = RuntimeEventPayloads> {
  private listeners = new Map<keyof Events, Set<Listener<Events[keyof Events]>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const listenersForEvent = this.listeners.get(event)!;
    listenersForEvent.add(listener as Listener<Events[keyof Events]>);

    return () => {
      listenersForEvent.delete(listener as Listener<Events[keyof Events]>);
      if (listenersForEvent.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const listenersForEvent = this.listeners.get(event);
    if (!listenersForEvent) {
      return;
    }

    for (const listener of listenersForEvent) {
      (listener as Listener<Events[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

