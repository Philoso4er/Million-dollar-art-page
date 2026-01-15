import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Admin is now handled from /admin folder through routing, not imports.
// DO NOT IMPORT ADMIN HERE.

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
