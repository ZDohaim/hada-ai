import React from "react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div
      className="landing-page min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#FFF3E0" }} // Lightest shade for the background
    >
      <div className="text-center p-8">
        <h1
          className="text-5xl font-bold mb-6"
          style={{ color: "#3E2723" }} // Dark brown for the title
        >
          Hada.ai
        </h1>
        <p
          className="text-lg mb-8"
          style={{ color: "#8D6E63" }} // Medium brown for the subtitle
        >
          Discover the perfect gift with AI
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/gift-flow"
            className="px-6 py-3 rounded font-medium mb-4 sm:mb-0"
            style={{
              backgroundColor: "#5D4037",
              color: "#FFF3E0",
              transition: "background-color 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#3E2723")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#5D4037")}
          >
            Quick Gift Finder
          </Link>
          <Link
            to="/gift-generator"
            className="px-6 py-3 rounded font-medium"
            style={{
              backgroundColor: "#D4A373",
              color: "#FFF3E0",
              transition: "background-color 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#3E2723")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#D4A373")}
          >
            Advanced Options
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
