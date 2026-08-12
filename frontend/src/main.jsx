import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import ErrorBoundary from "./components/ErrorBoundary";

import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
