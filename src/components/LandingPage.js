import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div
      className="landing-page h-screen flex items-center justify-center"
      style={{ backgroundColor: '#FFF3E0' }} // Lightest shade for the background
    >
      <div className="text-center">
        <h1
          className="text-5xl font-bold mb-6"
          style={{ color: '#3E2723' }} // Dark brown for the title
        >
          Hada.ai
        </h1>
        <p
          className="text-lg mb-8"
          style={{ color: '#8D6E63' }} // Medium brown for the subtitle
        >
          Discover the perfect gift with AI
        </p>
        <Link
          to="/create-prompt"
          className="px-6 py-3 rounded font-medium"
          style={{
            backgroundColor: '#D4A373', // Tan background for the button
            color: '#FFF3E0', // Light yellow text
            transition: 'background-color 0.3s ease',
          }}
          onMouseOver={(e) =>
            (e.target.style.backgroundColor = '#3E2723') // Dark brown on hover
          }
          onMouseOut={(e) =>
            (e.target.style.backgroundColor = '#D4A373') // Reset to tan on mouse out
          }
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
