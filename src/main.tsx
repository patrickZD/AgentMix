import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

// E2E-only: expose a tiny hook so the WebDriver suite can queue the folder the
// native picker would return (it cannot drive the OS dialog). Gated by VITE_E2E
// so it is dead-code-eliminated from production builds; the backing command
// exists only under the cargo `e2e` feature.
if (import.meta.env.VITE_E2E) {
  void import("@tauri-apps/api/core").then(({ invoke }) => {
    (window as unknown as { __agentmixE2E?: unknown }).__agentmixE2E = {
      setNextPick: (path: string) => invoke("e2e_set_next_pick", { path }),
    };
  });
}

createRoot(document.getElementById("root")!).render(<App />);
