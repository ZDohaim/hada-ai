import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import GiftGenerator from "./pages/GiftGenerator";
import Login from "./components/Login";
import UserInfo from "./pages/UserInfo";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create-prompt" element={<GiftGenerator />} />
        <Route path="/login" element={<Login />} />
        <Route path="/UserInfo" element={<UserInfo />} />
      </Routes>
    </Router>
  );
}

export default App;
