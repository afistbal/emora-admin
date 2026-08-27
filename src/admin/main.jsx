import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Admin from "./Admin.jsx";
import "./admin.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Admin />
  </BrowserRouter>
);
