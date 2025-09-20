export interface ComponentEffectEntry {
  dependencies: readonly any[] | null;
  cleanup: (() => void) | null;
}

export interface ComponentFragmentBoundary {
  start: Comment;
  end: Comment;
}

export interface ComponentData {
  component: Function;
  hooks: any[];
  effects: ComponentEffectEntry[];
  element: Node | null;
  fragment: ComponentFragmentBoundary | null;
  props: any;
}

export class ComponentManager {
  private components = new Map<Function, ComponentData>();
  private currentComponent: ComponentData | null = null;
  private currentComponentRef: Function | null = null;
  private currentHookIndex = 0;

  setCurrentComponent(component: Function, props: any = {}): ComponentData {
    if (!this.components.has(component)) {
      this.components.set(component, {
        component,
        hooks: [],
        effects: [],
        element: null,
        fragment: null,
        props: {}
      });
    }

    const componentData = this.components.get(component)!;
    componentData.component = component;
    componentData.props = props;
    this.currentComponent = componentData;
    this.currentComponentRef = component;
    this.currentHookIndex = 0;
    return componentData;
  }

  getCurrentComponent(): ComponentData | null {
    return this.currentComponent;
  }

  getCurrentComponentRef(): Function | null {
    return this.currentComponentRef;
  }

  getComponentData(component: Function): ComponentData | undefined {
    return this.components.get(component);
  }

  updateElement(component: Function, element: Node | null): void {
    const data = this.components.get(component);
    if (data) {
      data.element = element;
      if (element !== null) {
        data.fragment = null;
      }
    }
  }

  updateFragment(component: Function, fragment: ComponentFragmentBoundary | null): void {
    const data = this.components.get(component);
    if (data) {
      data.fragment = fragment;
      if (fragment !== null) {
        data.element = null;
      }
    }
  }

  removeComponent(component: Function): void {
    this.components.delete(component);
    if (this.currentComponentRef === component) {
      this.clearCurrentComponent();
    }
  }

  getCurrentHookIndex(): number {
    return this.currentHookIndex++;
  }

  clearCurrentComponent(): void {
    this.currentComponent = null;
    this.currentComponentRef = null;
    this.currentHookIndex = 0;
  }

  cleanup(): void {
    this.components.forEach(componentData => {
      componentData.effects.forEach(effect => {
        if (effect?.cleanup) {
          effect.cleanup();
        }
      });
    });
    this.components.clear();
    this.clearCurrentComponent();
  }
}
