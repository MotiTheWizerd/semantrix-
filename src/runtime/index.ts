import { TrxManager } from "./core/manager.js";

const trxManager = new TrxManager();

export const createElement = trxManager.createElement;
export const useState = trxManager.useState;
export const useEffect = trxManager.useEffect;
export const useRef = trxManager.useRef;
export const render = trxManager.render;
export const requestRender = trxManager.requestRender.bind(trxManager);
export const events = trxManager.events;

// Fragment component for JSX
export function Fragment({ children }: { children?: any }): any {
  return children;
}

export { TrxManager };

// For browser globals
if (typeof window !== "undefined") {
  (window as any).Trx = {
    createElement,
    useState,
    useEffect,
    useRef,
    render,
    Fragment,
    requestRender,
    events
  };
}
