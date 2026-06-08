import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startSync } from "./sync";
import { startHotkeys } from "./hotkeys";
import { startHistory } from "./history";

startSync();
startHotkeys();
startHistory();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
