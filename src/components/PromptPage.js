import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PromptPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const giftSuggestion =
    location.state?.giftSuggestion || "No suggestion available.";

  return (
    <div
      className="prompt-page min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#FFF3E0" }}
    >
      <div
        className="p-8 rounded-lg shadow-lg max-w-xl w-full"
        style={{ backgroundColor: "#FFE0B2", color: "#3E2723" }}
      >
        <h1 className="text-3xl font-bold mb-6 text-center">Suggested Gift</h1>
        <p className="text-lg text-center">{giftSuggestion}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 w-full py-3 rounded font-medium"
          style={{
            backgroundColor: "#5D4037",
            color: "#FFF3E0",
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default PromptPage;
