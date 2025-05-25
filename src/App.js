import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import GiftFlow from "./pages/GiftFlow";
import Login from "./components/Login";
import UserInfo from "./pages/UserInfo";
import ManageContacts from "./pages/ManageContacts";
import PromptPage from "./components/PromptPage";
import "./styles/global.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/gift-flow" element={<GiftFlow />} />
        <Route path="/login" element={<Login />} />
        <Route path="/UserInfo" element={<UserInfo />} />
        <Route path="/manage-contacts" element={<ManageContacts />} />
        <Route path="/prompt-page" element={<PromptPage />} />
      </Routes>
    </Router>
  );
}

export default App;
