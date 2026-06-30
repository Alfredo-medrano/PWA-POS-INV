
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);

  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js")
        .then((reg) => console.log("✓ Service Worker registrado con éxito:", reg.scope))
        .catch((err) => console.error("✕ Error al registrar el Service Worker:", err));
    });
  }
  