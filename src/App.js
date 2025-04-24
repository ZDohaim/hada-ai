import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import GiftGenerator from "./pages/GiftGenerator";
import Login from "./components/Login";
import UserInfo from "./pages/UserInfo";
import PromptPage from "./components/PromptPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/gift-generator" element={<GiftGenerator />} />
        <Route path="/login" element={<Login />} />
        <Route path="/UserInfo" element={<UserInfo />} />
        <Route path="/prompt-page" element={<PromptPage />} />
      </Routes>
    </Router>
  );
}

export default App;
