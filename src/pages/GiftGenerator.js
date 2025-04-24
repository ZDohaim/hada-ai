// Full updated GiftGenerator.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Dropdown from "../components/Dropdown";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  generateGiftSuggestions,
  testOpenAIConnection,
} from "../services/gptService";

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
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);

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

    try {
      const gptPreferences = {
        category,
        budget,
        age: recipientAge,
        gender,
        relationship,
        occasion,
        interests: preferences === "Other" ? otherPreference : preferences,
        giftType,
        avoid,
        effortLevel,
        extraNotes,
      };

      const suggestions = await generateGiftSuggestions(gptPreferences);
      setGiftSuggestions(suggestions.gifts);
      localStorage.setItem(
        "giftSuggestions",
        JSON.stringify(suggestions.gifts)
      );
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

  return (
    <div
      className="gift-generator-page min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#FFF3E0" }}
    >
      <div
        className="p-8 rounded-lg shadow-lg max-w-xl w-full"
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
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: "#3E2723" }}>
              Gift Suggestions
            </h3>
            {giftSuggestions.map((gift, index) => (
              <div
                key={index}
                className="p-4 rounded"
                style={{
                  backgroundColor: "#FFEFD5",
                  border: "1px solid #D7CCC8",
                }}
              >
                <h4 className="font-bold" style={{ color: "#3E2723" }}>
                  {gift.name}
                </h4>
                <p className="font-medium" style={{ color: "#5D4037" }}>
                  {gift.price}
                </p>
                <p className="mt-2" style={{ color: "#8D6E63" }}>
                  {gift.description}
                </p>
                <p className="mt-2" style={{ color: "#A1887F" }}>
                  {gift.reasoning}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
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
              {apiTestResult.openaiResponse && (
                <pre
                  className="mt-2 p-2 rounded text-xs overflow-auto"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.05)",
                    maxHeight: "100px",
                  }}
                >
                  {JSON.stringify(apiTestResult.openaiResponse, null, 2)}
                </pre>
              )}
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
