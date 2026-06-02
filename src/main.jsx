import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import JoinScreen from "./JoinScreen.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <JoinScreen>
        <App />
      </JoinScreen>
    </AuthGate>
  </React.StrictMode>
);
