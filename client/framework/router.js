
let routes = {};
let notFoundComponent = () => h("div", {}, "404 Not Found");

export function getCurrentPath() {
  
  return window.location.hash || "#/";
}

export function defineRoutes(routeMap, notFound) {
  routes = routeMap;
  if (notFound) notFoundComponent = notFound;
}
