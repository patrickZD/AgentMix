/// <reference types="vite/client" />
/// <reference types="react" />

// Injected by Vite (see vite.config.ts `define`): the package.json version at
// build time, used as the app-version fallback outside the Tauri webview.
declare const __APP_VERSION__: string;

declare namespace React {}
declare namespace JSX {
  type Element = React.JSX.Element
  type ElementType = React.JSX.ElementType
  type IntrinsicElements = React.JSX.IntrinsicElements
  type IntrinsicAttributes = React.JSX.IntrinsicAttributes
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
  type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>
}

declare module "lucide-react" {
  export * from "lucide-react/dist/lucide-react.suffixed";
}
