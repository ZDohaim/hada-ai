import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Dropdown from "../components/Dropdown";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import db from firebase config

const GiftGenerator = () => {
  const [category, setCategory] = useState("");
  const [occasion, setOccasion] = useState("");
  const [budget, setBudget] = useState("");
  const [recipientAge, setRecipientAge] = useState("");
  const [relationship, setRelationship] = useState("");
  const [preferences, setPreferences] = useState("");
  const [otherPreference, setOtherPreference] = useState("");
  const [firstName, setFirstName] = useState("");
  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();
  const auth = getAuth();

  // Fetch user details from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDocRef = doc(db, "users", user.uid); // Fixed: Added db reference
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setFirstName(userDoc.data().firstName || "User");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setFirstName(""); // Clear name if not logged in
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
    const requestData = {
      category,
      occasion,
      budget,
      recipientAge,
      relationship,
      preferences,
      otherPreference: preferences === "Other" ? otherPreference : null,
    };

    try {
      const response = await fetch("http://localhost:5001/generate-gift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.suggestion) {
        navigate(`/prompt-page`, {
          state: { giftSuggestion: data.suggestion },
        });
      } else {
        console.error("No suggestion received");
      }
    } catch (error) {
      console.error("Error fetching gift suggestion:", error);
    }
  };

  return (
    <div
      className="gift-generator-page min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#FFF3E0" }}
    >
      <div
        className="p-8 rounded-lg shadow-lg max-w-xl w-full"
        style={{
          backgroundColor: "#FFE0B2",
          color: "#3E2723",
        }}
      >
        <h1
          className="text-3xl font-bold mb-6 text-center cursor-pointer hover:underline"
          style={{ color: "#3E2723" }}
          onClick={() => navigate(`/UserInfo`)} // Redirect to UserInfo.js
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
                "Senior (50+)",
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
              placeholder="Please specify your preference"
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
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 rounded font-medium"
            style={{
              backgroundColor: "#5D4037",
              color: "#FFF3E0",
              transition: "background-color 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#3E2723")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#5D4037")}
          >
            Generate Gift
          </button>
        </form>
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
