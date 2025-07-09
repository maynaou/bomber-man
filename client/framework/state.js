import { updateElement } from "./dom.js";

const hookStates = [];
let hookIndex = 0;
let effectIndex = 0;


export function useState(initialValue) {
  
  const currentIndex = hookIndex;
  // Initialize state if this is the first render
  if (hookStates[currentIndex] === undefined) {
    hookStates[currentIndex] = initialValue;
  }

  const setState = (newValue) => {
    // Use functional update if newValue is a function
    hookStates[currentIndex] = typeof newValue === 'function'
      ? newValue(hookStates[currentIndex]) // Pass the current state
      : newValue;
    renderApp(); // Re-render the app to reflect the state change
  };

  const value = hookStates[currentIndex];
  
  hookIndex++; // Move to the next hook index
  return [value, setState];
}

let rootEl;
let appFn;
let oldVNode = null;

export function renderAppFn(fn, mountPoint) {
  rootEl = mountPoint;
  // mountPoint = newVNode;
  appFn = fn;
  renderApp();
}

export function renderApp() {
  
  hookIndex = 0;
  effectIndex = 0;
  const newVNode = appFn();
  // console.log(newVNode);
  if (!rootEl) throw new Error("Mount point not set");
  updateElement(rootEl, newVNode, oldVNode);
  oldVNode = newVNode;
}