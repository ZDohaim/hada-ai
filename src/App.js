import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import GiftGenerator from './pages/GiftGenerator';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create-prompt" element={<GiftGenerator />} />
      </Routes>
    </Router>
  );
}

export default App;
