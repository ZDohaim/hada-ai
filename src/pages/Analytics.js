import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getClickStats } from "../services/clickTracking";

const Analytics = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const clickStats = await getClickStats();
        setStats(clickStats);
      } catch (err) {
        setError("Failed to load analytics data");
        console.error("Error fetching click stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (date) => {
    if (!date || !date.toDate) return "Never";
    return date.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCompanyDisplayName = (company) => {
    const names = {
      mahaly: "Mahaly",
      niceone: "NiceOne",
      jarir: "Jarir",
    };
    return names[company] || company.charAt(0).toUpperCase() + company.slice(1);
  };

  const getCompanyColor = (company) => {
    const colors = {
      mahaly: "#FF6B6B",
      niceone: "#4ECDC4",
      jarir: "#45B7D1",
    };
    return colors[company] || "#8D6E63";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4A373] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5D4037] text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Error: {error}</p>
          <Link
            to="/UserInfo"
            className="px-6 py-3 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723] transition-colors duration-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const companies = ["mahaly", "niceone", "jarir"];
  const totalClicks = stats.total?.totalClicks || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFECB3]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <Link
              to="/UserInfo"
              className="flex items-center text-[#6D4C41] hover:text-[#5D4037] transition-colors duration-300"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </Link>
            <Link
              to="/gift-flow"
              className="px-6 py-3 bg-gradient-to-r from-[#8D6E63] to-[#6D4C41] text-white rounded-xl 
                         hover:from-[#6D4C41] hover:to-[#5D4037] transition-all duration-300 shadow-lg"
            >
              🎁 Generate Gift Ideas
            </Link>
          </div>
          <h1 className="text-4xl font-light text-[#3E2723]">
            Traffic Analytics
          </h1>
        </div>

        {/* Total Stats Card */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#D4A373] border-opacity-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[#3E2723] mb-2">
                Total Clicks Generated
              </h2>
              <div className="text-6xl font-bold text-[#D84315] mb-4">
                {totalClicks.toLocaleString()}
              </div>
              <p className="text-[#5D4037] text-lg">
                Total traffic sent to partner stores
              </p>
              {stats.total?.lastClicked && (
                <p className="text-[#8D6E63] text-sm mt-2">
                  Last click: {formatDate(stats.total.lastClicked)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Company Stats Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {companies.map((company) => {
            const companyStats = stats[company] || { totalClicks: 0 };
            const percentage =
              totalClicks > 0
                ? (companyStats.totalClicks / totalClicks) * 100
                : 0;

            return (
              <div
                key={company}
                className="bg-white rounded-2xl shadow-xl p-6 border border-opacity-20 hover:shadow-2xl transition-all duration-300"
                style={{ borderColor: getCompanyColor(company) }}
              >
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: getCompanyColor(company) }}
                  >
                    {getCompanyDisplayName(company)[0]}
                  </div>

                  <h3 className="text-2xl font-bold text-[#3E2723] mb-2">
                    {getCompanyDisplayName(company)}
                  </h3>

                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ color: getCompanyColor(company) }}
                  >
                    {companyStats.totalClicks.toLocaleString()}
                  </div>

                  <div className="text-[#5D4037] text-sm mb-4">
                    {percentage.toFixed(1)}% of total traffic
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: getCompanyColor(company),
                        width: `${Math.max(percentage, 2)}%`,
                      }}
                    ></div>
                  </div>

                  {companyStats.lastClicked && (
                    <p className="text-[#8D6E63] text-xs">
                      Last click: {formatDate(companyStats.lastClicked)}
                    </p>
                  )}

                  {companyStats.createdAt && (
                    <p className="text-[#8D6E63] text-xs">
                      First click: {formatDate(companyStats.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8 border border-[#D4A373] border-opacity-20">
          <h3 className="text-2xl font-bold text-[#3E2723] mb-4">
            How Traffic Analytics Work
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-[#5D4037] mb-2">
                📊 What We Track
              </h4>
              <ul className="text-[#5D4037] space-y-2">
                <li>• Clicks on product links from gift suggestions</li>
                <li>• Traffic sent to each partner store</li>
                <li>• Product categories clicked</li>
                <li>• User engagement patterns</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-[#5D4037] mb-2">
                🎯 Partner Stores
              </h4>
              <ul className="text-[#5D4037] space-y-2">
                <li>
                  <span
                    className="font-semibold"
                    style={{ color: getCompanyColor("mahaly") }}
                  >
                    Mahaly:
                  </span>{" "}
                  Health, nutrition, food, home scents
                </li>
                <li>
                  <span
                    className="font-semibold"
                    style={{ color: getCompanyColor("niceone") }}
                  >
                    NiceOne:
                  </span>{" "}
                  Beauty, makeup, skincare, perfumes
                </li>
                <li>
                  <span
                    className="font-semibold"
                    style={{ color: getCompanyColor("jarir") }}
                  >
                    Jarir:
                  </span>{" "}
                  Technology, electronics, books
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
