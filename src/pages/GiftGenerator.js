// Full updated GiftGenerator.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Dropdown from "../components/Dropdown";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { testOpenAIConnection } from "../services/gptService";
import { getEnrichedGiftSuggestions } from "../services/combinedGiftService";
import { testNiceOneConnection } from "../services/niceoneService";

const GiftGenerator = () => {
  const [category, setCategory] = useState("");
  const [occasion, setOccasion] = useState("");
  const [budget, setBudget] = useState("");
  const [recipientAge, setRecipientAge] = useState("");
  const [relationship, setRelationship] = useState("");
  const [preferences, setPreferences] = useState("");
  const [otherPreference, setOtherPreference] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("");
  const [giftType, setGiftType] = useState("");
  const [avoid, setAvoid] = useState("");
  const [effortLevel, setEffortLevel] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [giftSuggestions, setGiftSuggestions] = useState(null);
  const [enrichedResults, setEnrichedResults] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [testingNiceOne, setTestingNiceOne] = useState(false);
  const [niceOneTestResult, setNiceOneTestResult] = useState(null);

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setFirstName(userDoc.data().firstName || "User");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setFirstName("");
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserId(null);
      setFirstName("");
      navigate("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setGiftSuggestions(null);
    setEnrichedResults(false);

    try {
      // Parse budget into min/max if it's a range
      let budget_min, budget_max;
      if (budget) {
        // Check if budget contains a hyphen (range)
        if (budget.includes("-")) {
          const [min, max] = budget
            .split("-")
            .map((val) => val.trim().replace(/[^0-9]/g, ""));
          budget_min = min;
          budget_max = max;
        } else {
          // If it's a single value, use it as the max
          budget_max = budget.replace(/[^0-9]/g, "");
        }
      }

      const gptPreferences = {
        category,
        budget,
        budget_min,
        budget_max,
        age: recipientAge,
        gender,
        relationship,
        occasion,
        interests: preferences === "Other" ? otherPreference : preferences,
        giftType,
        avoid,
        effortLevel,
        extraNotes,
        enrichWithProducts: true, // Flag to indicate we want to enrich with NiceOne products
      };

      console.log("Sending preferences:", gptPreferences);
      const result = await getEnrichedGiftSuggestions(gptPreferences);
      setGiftSuggestions(result.gifts);
      setEnrichedResults(result.enriched || false);

      // Store the results in localStorage
      localStorage.setItem("giftSuggestions", JSON.stringify(result.gifts));
    } catch (err) {
      setError("Failed to generate gift suggestions. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTestingApi(true);
    setApiTestResult(null);
    setError(null);

    try {
      const result = await testOpenAIConnection();
      setApiTestResult(result);
      console.log("OpenAI test result:", result);
    } catch (err) {
      setError(
        "Failed to connect to OpenAI API. Please check your server configuration."
      );
      console.error(err);
    } finally {
      setTestingApi(false);
    }
  };

  const handleTestNiceOne = async () => {
    setTestingNiceOne(true);
    setNiceOneTestResult(null);
    setError(null);

    try {
      const result = await testNiceOneConnection();
      setNiceOneTestResult(result);
      console.log("NiceOne API test result:", result);
    } catch (err) {
      setError(
        "Failed to connect to NiceOne API. Please check your server configuration."
      );
      console.error(err);
    } finally {
      setTestingNiceOne(false);
    }
  };

  // Render product card for NiceOne products
  const renderProductCard = (product) => {
    if (!product) return null;

    // Debug the product structure
    console.log("Rendering product:", product);

    // Make sure all product fields are properly handled as potential objects
    const productName =
      typeof product.name === "object"
        ? JSON.stringify(product.name)
        : product.name || "Product";

    const price =
      typeof product.price === "object"
        ? product.price.price_formated ||
          product.price.original_price ||
          JSON.stringify(product.price)
        : product.price || "Price unavailable";

    const special = product.special
      ? typeof product.special === "object"
        ? product.special.price_formated ||
          product.special.original_price ||
          JSON.stringify(product.special)
        : product.special
      : null;

    return (
      <div
        className="p-4 rounded border product-card"
        style={{
          backgroundColor: "white",
          border: "1px solid #E0E0E0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          transition: "transform 0.2s",
          cursor: "pointer",
        }}
        onClick={() =>
          window.open(
            product.url ||
              `https://niceonesa.com/product/${product.product_id}`,
            "_blank"
          )
        }
      >
        <div className="flex flex-col items-center">
          <div className="product-image w-full h-48 flex items-center justify-center mb-3">
            {product.image ? (
              <img
                src={product.image}
                alt={productName}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="bg-gray-200 w-full h-full flex items-center justify-center text-gray-500">
                No Image
              </div>
            )}
          </div>
          <h4
            className="font-medium text-center mb-2"
            style={{ color: "#3E2723" }}
          >
            {productName}
          </h4>
          <div className="flex justify-between w-full items-center">
            <span className="font-bold" style={{ color: "#D84315" }}>
              {price}
            </span>
            {special && (
              <span
                className="text-sm line-through"
                style={{ color: "#9E9E9E" }}
              >
                {special}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="gift-generator-page min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#FFF3E0" }}
    >
      <div
        className="p-8 rounded-lg shadow-lg max-w-4xl w-full"
        style={{ backgroundColor: "#FFE0B2", color: "#3E2723" }}
      >
        <h1
          className="text-3xl font-bold mb-6 text-center cursor-pointer hover:underline"
          style={{ color: "#3E2723" }}
          onClick={() => navigate(`/UserInfo`)}
        >
          Customize Your Gift {firstName}
        </h1>

        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Category"
              options={[
                "Electronics",
                "Fashion",
                "Books",
                "Home Decor",
                "Sports Equipment",
                "Beauty Products",
                "Toys",
                "Experiences",
                "Art & Crafts",
              ]}
              selected={category}
              setSelected={setCategory}
            />
            <Dropdown
              label="Occasion"
              options={[
                "Birthday",
                "Anniversary",
                "Graduation",
                "Wedding",
                "New Baby",
                "Housewarming",
                "Holiday",
                "Thank You",
              ]}
              selected={occasion}
              setSelected={setOccasion}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Recipient Age"
              options={[
                "Child (0-12)",
                "Teenager (13-19)",
                "Young Adult (20-30)",
                "Adult (31-50)",
                "Senior (50+",
              ]}
              selected={recipientAge}
              setSelected={setRecipientAge}
            />
            <Dropdown
              label="Relationship"
              options={[
                "Family (Parent/Sibling)",
                "Friend",
                "Significant Other",
                "Coworker",
                "Neighbor",
                "Other",
              ]}
              selected={relationship}
              setSelected={setRelationship}
            />
          </div>

          <Dropdown
            label="Gender"
            options={["Male", "Female", "Non-binary", "Prefer not to say"]}
            selected={gender}
            setSelected={setGender}
          />

          <Dropdown
            label="Preferences"
            options={[
              "Tech-Savvy",
              "Fitness Enthusiast",
              "Fashion Lover",
              "Bookworm",
              "DIY Enthusiast",
              "Gamer",
              "Foodie",
              "Nature Lover",
              "Minimalist",
              "Other",
            ]}
            selected={preferences}
            setSelected={setPreferences}
          />

          {preferences === "Other" && (
            <input
              type="text"
              placeholder="Please specify preference"
              value={otherPreference}
              onChange={(e) => setOtherPreference(e.target.value)}
              className="w-full p-3 rounded"
              style={{
                backgroundColor: "#FFEFD5",
                color: "#5D4037",
                border: "1px solid #D7CCC8",
                fontSize: "16px",
              }}
            />
          )}

          <input
            type="text"
            placeholder="Enter your budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full p-3 rounded"
            style={{
              backgroundColor: "#FFEFD5",
              color: "#5D4037",
              border: "1px solid #D7CCC8",
              fontSize: "16px",
            }}
          />

          <input
            type="text"
            placeholder="Things to avoid (optional)"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            className="w-full p-3 rounded"
            style={{
              backgroundColor: "#FFEFD5",
              color: "#5D4037",
              border: "1px solid #D7CCC8",
              fontSize: "16px",
            }}
          />

          <Dropdown
            label="Effort Level"
            options={["Simple", "Custom & Thoughtful", "Surprise Me"]}
            selected={effortLevel}
            setSelected={setEffortLevel}
          />

          <textarea
            placeholder="Other notes, details, or anything else you'd like to add"
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            className="w-full p-3 rounded"
            rows={3}
            style={{
              backgroundColor: "#FFEFD5",
              color: "#5D4037",
              border: "1px solid #D7CCC8",
              fontSize: "16px",
            }}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded font-medium"
            style={{
              backgroundColor: "#5D4037",
              color: "#FFF3E0",
              transition: "background-color 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#3E2723")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#5D4037")}
          >
            {loading ? "Generating..." : "Generate Gift"}
          </button>
        </form>

        {error && (
          <div
            className="mt-4 p-3 rounded"
            style={{
              backgroundColor: "#FFCDD2",
              color: "#B71C1C",
              border: "1px solid #EF9A9A",
            }}
          >
            {error}
          </div>
        )}

        {giftSuggestions && (
          <div className="mt-6">
            <h3
              className="text-xl font-semibold mb-4"
              style={{ color: "#3E2723" }}
            >
              Gift Suggestions
            </h3>

            {/* Display message if no enriched results */}
            {!enrichedResults && (
              <p className="mb-4 text-center" style={{ color: "#5D4037" }}>
                Showing gift ideas without product matches. Try different search
                terms for product results.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {giftSuggestions.map((gift, index) => {
                // If we have a product match, display it
                if (gift.product) {
                  return (
                    <div key={index} className="flex flex-col">
                      {/* Product match */}
                      {renderProductCard(gift.product)}

                      {/* Product name from GPT (smaller text) */}
                      <p
                        className="text-sm mt-2 text-center"
                        style={{ color: "#795548" }}
                      >
                        Based on:{" "}
                        {typeof gift.name === "object"
                          ? gift.name.category ||
                            gift.name.modifier ||
                            JSON.stringify(gift.name)
                          : gift.name || gift.category || "Gift suggestion"}
                      </p>
                    </div>
                  );
                }

                // If no product match but the gift has alternatives from fallback search
                else if (gift.alternatives && gift.alternatives.length > 0) {
                  return (
                    <div key={index} className="flex flex-col">
                      {renderProductCard(gift.alternatives[0])}
                      <p
                        className="text-sm mt-2 text-center"
                        style={{ color: "#795548" }}
                      >
                        Alternative for:{" "}
                        {typeof gift.name === "object"
                          ? gift.name.category ||
                            gift.name.modifier ||
                            JSON.stringify(gift.name)
                          : gift.name || gift.category || "Gift suggestion"}
                      </p>
                    </div>
                  );
                }

                // No product matches at all, just show a simple card with gift name
                else {
                  return (
                    <div
                      key={index}
                      className="p-4 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: "#FFEFD5",
                        border: "1px solid #D7CCC8",
                        minHeight: "150px",
                      }}
                    >
                      <div className="text-center">
                        <h4
                          className="font-bold text-lg"
                          style={{ color: "#3E2723" }}
                        >
                          {typeof gift.name === "object"
                            ? gift.name.category ||
                              gift.name.modifier ||
                              JSON.stringify(gift.name)
                            : gift.name || gift.category || "Gift suggestion"}
                        </h4>
                        <p className="text-sm text-gray-500 mt-2">
                          No product matches found
                        </p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* Show alternatives section if we have enriched results */}
            {enrichedResults && (
              <div className="mt-8">
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: "#3E2723" }}
                >
                  More Gift Ideas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {giftSuggestions.flatMap((gift) =>
                    (gift.alternatives || []).map((alt, altIndex) => (
                      <div
                        key={`alt-${gift.name}-${altIndex}`}
                        className="mb-4"
                      >
                        {renderProductCard(alt)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center space-x-4">
          <button
            onClick={handleTestOpenAI}
            disabled={testingApi}
            className="px-4 py-2 text-sm rounded"
            style={{
              backgroundColor: "#8D6E63",
              color: "#FFF3E0",
            }}
          >
            {testingApi ? "Testing..." : "Test OpenAI Connection"}
          </button>

          <button
            onClick={handleTestNiceOne}
            disabled={testingNiceOne}
            className="px-4 py-2 text-sm rounded"
            style={{
              backgroundColor: "#8D6E63",
              color: "#FFF3E0",
            }}
          >
            {testingNiceOne ? "Testing..." : "Test NiceOne Connection"}
          </button>

          {apiTestResult && (
            <div
              className="mt-2 p-3 rounded"
              style={{
                backgroundColor: apiTestResult.success ? "#C8E6C9" : "#FFCDD2",
                color: apiTestResult.success ? "#2E7D32" : "#B71C1C",
                border: apiTestResult.success
                  ? "1px solid #A5D6A7"
                  : "1px solid #EF9A9A",
              }}
            >
              {apiTestResult.message}
            </div>
          )}

          {niceOneTestResult && (
            <div
              className="mt-2 p-3 rounded"
              style={{
                backgroundColor: niceOneTestResult.success
                  ? "#C8E6C9"
                  : "#FFCDD2",
                color: niceOneTestResult.success ? "#2E7D32" : "#B71C1C",
                border: niceOneTestResult.success
                  ? "1px solid #A5D6A7"
                  : "1px solid #EF9A9A",
              }}
            >
              {niceOneTestResult.message}
            </div>
          )}
        </div>

        <p className="text-center mt-4">
          {userId ? (
            <button
              className="text-mediumBrown underline hover:text-darkBrown"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login" className="text-mediumBrown underline">
              Sign In/Sign Up
            </Link>
          )}
        </p>
      </div>
    </div>
  );
};

export default GiftGenerator;
