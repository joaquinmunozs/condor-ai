import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./App.css";
import Layout from "./Layout";
import Home from "./pages/Home";
import Planes from "./pages/Planes";
import DiagnosticoQuiz from "./pages/DiagnosticoQuiz";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="planes" element={<Planes />} />
          <Route path="diagnostico" element={<DiagnosticoQuiz />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
