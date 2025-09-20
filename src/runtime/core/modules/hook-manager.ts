import { EventHub, RuntimeEvents, RuntimeRenderReason } from "../events/event-hub.js";
import { now } from "../utils/time.js";
import { ComponentManager } from "./component-manager.js";

export class HookManager {
  constructor(
    private readonly componentManager: ComponentManager,
    private readonly events: EventHub<RuntimeEvents>
  ) {}

  private requestRender(reason: RuntimeRenderReason, component: Function | null): void {
    this.events.emit("render:request", { reason, component, timestamp: now() });
  }

  useState<T>(initialValue: T | (() => T)): [T, (newValue: T | ((prev: T) => T)) => void] {
    const currentComponent = this.componentManager.getCurrentComponent();
    const componentRef = this.componentManager.getCurrentComponentRef();
    if (!currentComponent || !componentRef) {
      throw new Error("useState must be called inside a function component");
    }

    const hookIndex = this.componentManager.getCurrentHookIndex();
    const hooks = currentComponent.hooks;

    if (hooks[hookIndex] === undefined) {
      hooks[hookIndex] = {
        type: "state",
        value: typeof initialValue === "function" ? (initialValue as () => T)() : initialValue
      };
    }

    const hook = hooks[hookIndex];

    const setState = (newValue: T | ((prev: T) => T)) => {
      const updatedValue = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(hook.value)
        : newValue;

      const hasChanged = !Object.is(hook.value, updatedValue);
      if (hasChanged) {
        hook.value = updatedValue;
        this.requestRender("state-change", componentRef);
      }
    };

    return [hook.value, setState];
  }

  useRef<T>(initialValue: T): { current: T } {
    const currentComponent = this.componentManager.getCurrentComponent();
    if (!currentComponent) {
      throw new Error("useRef must be called inside a function component");
    }

    const hookIndex = this.componentManager.getCurrentHookIndex();
    const hooks = currentComponent.hooks;

    if (hooks[hookIndex] === undefined) {
      hooks[hookIndex] = {
        type: "ref",
        value: { current: initialValue }
      };
    }

    return hooks[hookIndex].value;
  }

  useEffect(callback: () => void | (() => void), dependencies?: readonly any[]): void {
    const currentComponent = this.componentManager.getCurrentComponent();
    const componentRef = this.componentManager.getCurrentComponentRef();
    if (!currentComponent || !componentRef) {
      throw new Error("useEffect must be called inside a function component");
    }

    const hookIndex = this.componentManager.getCurrentHookIndex();
    const effects = currentComponent.effects;

    const hasNoDependencies = dependencies === undefined;
    const hasEmptyDependencies = Array.isArray(dependencies) && dependencies.length === 0;

    const prevEffect = effects[hookIndex];

    let hasChanged = !prevEffect;
    if (prevEffect && !hasNoDependencies && !hasEmptyDependencies) {
      const prevDeps = prevEffect.dependencies;
      const nextDeps = dependencies as readonly any[];
      hasChanged = !Array.isArray(prevDeps)
        || prevDeps.length !== nextDeps.length
        || nextDeps.some((dep, index) => dep !== prevDeps[index]);
    }

    const emitCleanup = () => {
      if (prevEffect?.cleanup) {
        this.events.emit("hook:effect-cleanup", { component: componentRef, hookIndex, timestamp: now() });
        prevEffect.cleanup();
      }
    };

    const makeSnapshot = (): readonly any[] | null => {
      if (dependencies === undefined) {
        return null;
      }
      return [...dependencies];
    };

    if (hasChanged || hasNoDependencies) {
      emitCleanup();
      const dependencySnapshot = makeSnapshot();
      this.events.emit("hook:effect-scheduled", {
        component: componentRef,
        hookIndex,
        dependencies: dependencySnapshot,
        timestamp: now()
      });

      const cleanup = callback();
      effects[hookIndex] = {
        dependencies: dependencySnapshot,
        cleanup: typeof cleanup === "function" ? cleanup : null
      };
    } else if (!prevEffect) {
      const dependencySnapshot = hasEmptyDependencies ? [] : null;
      effects[hookIndex] = {
        dependencies: dependencySnapshot,
        cleanup: null
      };

      if (hasEmptyDependencies) {
        this.events.emit("hook:effect-scheduled", {
          component: componentRef,
          hookIndex,
          dependencies: dependencySnapshot,
          timestamp: now()
        });
        const cleanup = callback();
        effects[hookIndex].cleanup = typeof cleanup === "function" ? cleanup : null;
      }
    }
  }
}
