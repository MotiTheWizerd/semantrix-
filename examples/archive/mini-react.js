// Mini React - Lightweight JSX, useState, useEffect implementation
// Author: Claude
// Size: ~3KB minified

class MiniReact {
  constructor() {
    this.currentComponent = null;
    this.currentHookIndex = 0;
    this.components = new Map();
    this.rootContainer = null;
    this.rootComponent = null;
  }

  // JSX createElement function (this is what JSX compiles to)
  createElement(type, props, ...children) {
    const flatChildren = children.flat().filter(child => 
      child !== null && child !== undefined && child !== false
    );

    return {
      type,
      props: props || {},
      children: flatChildren.map(child => 
        typeof child === 'object' ? child : String(child)
      )
    };
  }

  // Convert virtual DOM to real DOM
  createDOMElement(vNode) {
    // Handle text nodes
    if (typeof vNode === 'string' || typeof vNode === 'number') {
      return document.createTextNode(String(vNode));
    }

    // Handle function components
    if (typeof vNode.type === 'function') {
      return this.renderFunctionComponent(vNode);
    }

    // Handle regular HTML elements
    const element = document.createElement(vNode.type);
    
    // Set props/attributes
    if (vNode.props) {
      Object.entries(vNode.props).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
          // Event handlers
          const eventName = key.slice(2).toLowerCase();
          element.addEventListener(eventName, value);
        } else if (key !== 'children') {
          element.setAttribute(key, value);
        }
      });
    }

    // Render children
    vNode.children.forEach(child => {
      if (child) {
        element.appendChild(this.createDOMElement(child));
      }
    });

    return element;
  }

  // Render function components
  renderFunctionComponent(vNode) {
    const component = vNode.type;
    const props = vNode.props;

    // Set up component context for hooks
    if (!this.components.has(component)) {
      this.components.set(component, {
        hooks: [],
        effects: [],
        element: null
      });
    }

    const componentData = this.components.get(component);
    this.currentComponent = componentData;
    this.currentHookIndex = 0;

    // Run the component function
    const result = component(props);
    
    // Create DOM element from result
    const domElement = this.createDOMElement(result);
    componentData.element = domElement;

    this.currentComponent = null;
    this.currentHookIndex = 0;

    return domElement;
  }

  // useState hook
  useState(initialValue) {
    if (!this.currentComponent) {
      throw new Error('useState must be called inside a function component');
    }

    const hookIndex = this.currentHookIndex++;
    const hooks = this.currentComponent.hooks;

    // Initialize hook if it doesn't exist
    if (hooks[hookIndex] === undefined) {
      hooks[hookIndex] = {
        type: 'state',
        value: typeof initialValue === 'function' ? initialValue() : initialValue
      };
    }

    const hook = hooks[hookIndex];
    
    const setState = (newValue) => {
      const updatedValue = typeof newValue === 'function' 
        ? newValue(hook.value) 
        : newValue;
      
      if (hook.value !== updatedValue) {
        hook.value = updatedValue;
        this.rerender();
      }
    };

    return [hook.value, setState];
  }

  // useEffect hook
  useEffect(callback, dependencies) {
    if (!this.currentComponent) {
      throw new Error('useEffect must be called inside a function component');
    }

    const hookIndex = this.currentHookIndex++;
    const effects = this.currentComponent.effects;

    const hasNoDependencies = dependencies === undefined;
    const hasEmptyDependencies = Array.isArray(dependencies) && dependencies.length === 0;

    // Get previous effect
    const prevEffect = effects[hookIndex];
    
    // Check if dependencies changed
    let hasChanged = !prevEffect;
    if (prevEffect && !hasNoDependencies && !hasEmptyDependencies) {
      hasChanged = dependencies.some((dep, index) => 
        dep !== prevEffect.dependencies[index]
      );
    }

    // Run effect if needed
    if (hasChanged || hasNoDependencies) {
      // Cleanup previous effect
      if (prevEffect && prevEffect.cleanup) {
        prevEffect.cleanup();
      }

      // Run new effect
      const cleanup = callback();
      
      effects[hookIndex] = {
        dependencies: hasNoDependencies ? null : [...(dependencies || [])],
        cleanup: typeof cleanup === 'function' ? cleanup : null
      };
    } else if (!prevEffect) {
      // First run with empty dependencies
      effects[hookIndex] = {
        dependencies: hasEmptyDependencies ? [] : null,
        cleanup: null
      };
      
      if (hasEmptyDependencies) {
        const cleanup = callback();
        effects[hookIndex].cleanup = typeof cleanup === 'function' ? cleanup : null;
      }
    }
  }

  // Render the app
  render(component, container) {
    this.rootContainer = container;
    this.rootComponent = component;
    
    // Clear container
    container.innerHTML = '';
    
    // Render component
    const domElement = this.createDOMElement(component);
    container.appendChild(domElement);
  }

  // Rerender the entire app (simple approach)
  rerender() {
    if (this.rootContainer && this.rootComponent) {
      // Simple full rerender - in a real implementation you'd do diffing
      this.render(this.rootComponent, this.rootContainer);
    }
  }

  // Cleanup all effects (useful for unmounting)
  cleanup() {
    this.components.forEach(componentData => {
      componentData.effects.forEach(effect => {
        if (effect && effect.cleanup) {
          effect.cleanup();
        }
      });
    });
    this.components.clear();
  }
}

// Create global instance
const miniReact = new MiniReact();

// Export functions that will be used globally
const createElement = miniReact.createElement.bind(miniReact);
const useState = miniReact.useState.bind(miniReact);
const useEffect = miniReact.useEffect.bind(miniReact);
const render = miniReact.render.bind(miniReact);

// For ES modules
export { createElement, useState, useEffect, render };

// For browser globals
if (typeof window !== 'undefined') {
  window.MiniReact = {
    createElement,
    useState,
    useEffect,
    render
  };
}

// For CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createElement,
    useState,
    useEffect,
    render
  };
}
