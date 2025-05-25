import React from "react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div
      className="landing-page min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "#FFF3E0" }}
    >
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-gradient-to-br from-amber-200 to-amber-300"></div>
        <div className="absolute bottom-32 right-32 w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-200"></div>
      </div>

      <div className="text-center p-8 relative z-10 max-w-4xl mx-auto">
        {/* Main Logo with Arabic */}
        <div className="animate-fade-in-up">
          <h1
            className="text-6xl md:text-7xl font-bold mb-2 tracking-wider"
            style={{
              color: "#3E2723",
              fontFamily: "'Playfair Display', serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Hada.ai
          </h1>
          <div
            className="text-3xl md:text-4xl mb-6 opacity-80"
            style={{
              color: "#5D4037",
              fontFamily: "'Playfair Display', serif",
              direction: "rtl",
            }}
          >
            هدايـــاـي
          </div>
        </div>

        {/* Elegant divider */}
        <div className="animate-fade-in-up animation-delay-200 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-32"></div>
            <div className="mx-4 w-2 h-2 rounded-full bg-amber-400 shadow-lg"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent w-32"></div>
          </div>
        </div>

        {/* Premium tagline */}
        <div className="animate-fade-in-up animation-delay-400">
          <p
            className="text-xl md:text-2xl mb-12 font-light tracking-wide leading-relaxed"
            style={{ color: "#8D6E63" }}
          >
            Luxury gifting, curated by intelligence.
          </p>
        </div>

        {/* Enhanced CTA Buttons */}
        <div className="animate-fade-in-up animation-delay-600 flex flex-col sm:flex-row justify-center gap-6">
          <Link
            to="/gift-flow"
            className="group px-8 py-4 rounded-full font-medium text-lg tracking-wide transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: "#5D4037",
              color: "#FFF3E0",
              background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
            }}
          >
            <span className="relative z-10">Quick Gift Finder</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </Link>

          <Link
            to="/login"
            className="group px-8 py-4 rounded-full font-medium text-lg tracking-wide transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl border-2 border-opacity-30"
            style={{
              backgroundColor: "rgba(212, 163, 115, 0.1)",
              color: "#5D4037",
              borderColor: "#D4A373",
              backdropFilter: "blur(10px)",
            }}
          >
            <span className="relative z-10">Login</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
          </Link>
        </div>

        {/* Subtle call-to-action hint */}
        <div className="animate-fade-in-up animation-delay-800 mt-12">
          <p className="text-sm opacity-60" style={{ color: "#8D6E63" }}>
            Discover thoughtful gifts, effortlessly chosen
          </p>
        </div>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap");

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(30px);
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hover effects for buttons */
        .group:hover {
          transform: scale(1.05) translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
