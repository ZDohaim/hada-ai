import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { getEnrichedGiftSuggestions } from "../services/combinedGiftService";

const GiftFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [saveContact, setSaveContact] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Form data
  const [formData, setFormData] = useState({
    recipientAge: "",
    relationship: "",
    gender: "",
    category: "",
    budget: "",
    notes: "",
    name: "",
    otherSelected: false,
  });

  // Options for each step
  const ageOptions = [
    "0-12",
    "13-17",
    "18-24",
    "25-34",
    "35-44",
    "45-54",
    "55-64",
    "65+",
  ];
  const relationshipOptions = [
    "Friend",
    "Parent",
    "Child",
    "Sibling",
    "Partner",
    "Colleague",
    "Other",
  ];
  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
  const categoryOptions = [
    "Tech",
    "Fashion",
    "Home",
    "Books",
    "Experiences",
    "Food & Drink",
    "Fitness",
    "Beauty",
    "Other",
  ];
  const budgetOptions = ["Under 50", "50-100", "100-250", "250-500", "500+"];

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Steps configuration
  const steps = [
    {
      title: "How old is the gift recipient?",
      field: "recipientAge",
      options: ageOptions,
    },
    {
      title: "What is your relationship to them?",
      field: "relationship",
      options: relationshipOptions,
    },
    {
      title: "What is their gender?",
      field: "gender",
      options: genderOptions,
    },
    {
      title: "What category interests them most?",
      field: "category",
      options: categoryOptions,
    },
    {
      title: "What is your budget?",
      field: "budget",
      options: budgetOptions,
    },
    {
      title: "What do you know about them? What do they like?",
      field: "notes",
      isTextarea: true,
    },
  ];

  const handleSelect = (field, value) => {
    let updatedData = { ...formData, [field]: value };

    // Check if "Other" is selected for relationship or category
    if (
      (field === "relationship" || field === "category") &&
      value === "Other"
    ) {
      updatedData.otherSelected = true;
    }

    setFormData(updatedData);

    // Auto advance to next step after selection (except for textarea and "Other" selections)
    if (field !== "notes" && value !== "Other") {
      setTimeout(() => nextStep(), 400);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 100);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveContact = async () => {
    if (!user) return;

    try {
      const contactData = {
        name: formData.name || "Unnamed Contact",
        relation: formData.relationship,
        gender: formData.gender,
        age: formData.recipientAge,
        interests: formData.category,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      };

      // Add to user's contacts collection
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update contacts array
        await updateDoc(userDocRef, {
          contacts: arrayUnion(contactData),
        });
      } else {
        // Create new document with contacts array
        await setDoc(userDocRef, {
          contacts: [contactData],
        });
      }

      setSaveContact(false);
    } catch (err) {
      console.error("Error saving contact", err);
      setError("Failed to save contact");
    }
  };

  const handleSubmit = async () => {
    if (saveContact && user) {
      await handleSaveContact();
    }

    setLoading(true);
    setError(null);

    try {
      // Parse budget if needed
      let budget_min, budget_max;
      if (formData.budget) {
        if (formData.budget.includes("-")) {
          const [min, max] = formData.budget
            .split("-")
            .map((val) => val.trim().replace(/[^0-9]/g, ""));
          budget_min = min;
          budget_max = max;
        } else if (formData.budget.includes("+")) {
          budget_min = formData.budget.replace(/[^0-9]/g, "");
        } else if (formData.budget.includes("Under")) {
          budget_max = formData.budget.replace(/[^0-9]/g, "");
        } else {
          budget_max = formData.budget.replace(/[^0-9]/g, "");
        }
      }

      const gptPreferences = {
        category: formData.category,
        budget: formData.budget,
        budget_min,
        budget_max,
        age: formData.recipientAge,
        gender: formData.gender,
        relationship: formData.relationship,
        interests: formData.notes,
        enrichWithProducts: true,
      };

      console.log("Sending preferences to API:", gptPreferences);
      const result = await getEnrichedGiftSuggestions(gptPreferences);
      console.log("API response:", result);

      // Check response format and set results accordingly
      if (result && result.gifts && Array.isArray(result.gifts)) {
        // Standard format with gifts property
        setResults(result.gifts);
      } else if (result && Array.isArray(result)) {
        // Direct array format
        setResults(result);
      } else if (
        result &&
        typeof result === "object" &&
        Object.keys(result).length > 0
      ) {
        // Object format - transform to array
        const transformedResults = [];
        for (const key in result) {
          if (typeof result[key] === "object" && result[key] !== null) {
            transformedResults.push(result[key]);
          }
        }
        if (transformedResults.length > 0) {
          setResults(transformedResults);
        } else {
          // Fallback if transformation didn't produce results
          setResults([
            {
              category: formData.category || "Custom",
              modifier: "personalized gift",
              product: {
                name: "Personalized Gift",
                description:
                  "Based on your criteria, we suggest a personalized gift.",
              },
            },
          ]);
        }
      } else {
        // Create fallback results if the API response is not usable
        setResults([
          {
            category: formData.category || "Custom",
            modifier: "personalized gift",
            product: {
              name: "Personalized Gift",
              description:
                "Based on your criteria, we suggest a personalized gift.",
            },
          },
        ]);
        console.warn("API response format unexpected:", result);
      }

      setCurrentStep(steps.length + 1); // Move to results step
    } catch (err) {
      setError("Failed to generate gift suggestions. Please try again.");
      console.error("API error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render option button
  const OptionButton = ({ value, selected, onClick }) => (
    <button
      className={`w-full py-3 px-4 mb-3 rounded-lg text-left transition-all duration-300 
        ${
          selected
            ? "bg-[#5D4037] text-white"
            : "bg-white hover:bg-[#FFE0B2] text-[#5D4037] border border-[#D7CCC8]"
        }`}
      onClick={onClick}
    >
      {steps[currentStep]?.field === "budget" ? (
        <div className="flex items-center gap-2">
          <img
            src="/Saudi_Riyal_Symbol-2.svg"
            alt="SAR"
            className="w-4 h-4 inline-block"
          />
          <span>{value}</span>
        </div>
      ) : (
        value
      )}
    </button>
  );

  // Gift Card Component
  const GiftCard = ({ gift }) => {
    const [showFullDescription, setShowFullDescription] = useState(false);

    // Extract gift information based on structure
    const name =
      gift.name ||
      gift.title ||
      gift.en_name ||
      `${gift.category} ${gift.modifier || ""}`.trim();
    const description =
      gift.description ||
      gift.short_description ||
      `${gift.isAlternative ? "Alternative " : ""}${gift.category} ${
        gift.modifier || ""
      }`;

    // Extract image URL - use direct URL if available, otherwise construct from thumb
    const imageUrl =
      gift.image ||
      gift.thumb ||
      gift.imageUrl ||
      (gift.images && gift.images[0]);

    const productUrl = gift.url || gift.product_url || gift.share_url;

    // Extract price values and format them
    let price = null;
    let originalPrice = null;

    if (gift.special && gift.special.length > 0) {
      // Get numeric values from special pricing
      const specialPrice =
        gift.special[0].priceWithoutCurrency ||
        (typeof gift.special[0].price_formated === "string"
          ? gift.special[0].price_formated.replace(/[^0-9.]/g, "")
          : null);

      const origPrice =
        gift.special[0].originalPriceWithoutCurrency ||
        (typeof gift.special[0].original_price === "string"
          ? gift.special[0].original_price.replace(/[^0-9.]/g, "")
          : null);

      // Format prices
      if (specialPrice) price = specialPrice;
      if (origPrice) originalPrice = origPrice;
    } else if (
      typeof gift.price === "object" &&
      gift.price.priceWithoutCurrency
    ) {
      price = gift.price.priceWithoutCurrency;
      if (gift.price.originalPriceWithoutCurrency) {
        originalPrice = gift.price.originalPriceWithoutCurrency;
      }
    } else if (typeof gift.price === "string") {
      price = gift.price.replace(/[^0-9.]/g, "");
    } else if (typeof gift.price === "number") {
      price = gift.price.toString();
    }

    // Truncate description if longer than 100 characters
    const isLongDescription = description && description.length > 100;
    const truncatedDescription = isLongDescription
      ? `${description.substring(0, 100)}...`
      : description;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Image section with better fallback */}
        <div className="h-48 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log("Image failed to load:", imageUrl);
                e.target.onerror = null;
                e.target.src =
                  "https://via.placeholder.com/400x200?text=Gift+Suggestion";
              }}
            />
          ) : (
            <div className="h-full bg-[#FFCC80] flex items-center justify-center text-[#5D4037]">
              <div className="text-center p-4">
                <span className="text-4xl mb-2">🎁</span>
                <p>{gift.category || "Gift"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-[#3E2723] mb-2">
            {name}
            {gift.isAlternative && (
              <span className="ml-2 text-sm bg-[#FFCC80] text-[#5D4037] px-2 py-1 rounded">
                Alternative
              </span>
            )}
          </h3>

          {/* Price display with original price if available */}
          <div className="flex items-center gap-2 mb-2">
            {price && (
              <div
                className="flex items-center font-medium"
                style={{ color: "#D84315" }}
              >
                <img
                  src="/Saudi_Riyal_Symbol-2.svg"
                  alt="SAR"
                  className="w-4 h-4 inline-block mr-1"
                />
                <span>{price} SAR</span>
              </div>
            )}
            {originalPrice && originalPrice !== price && (
              <span className="text-sm line-through text-gray-500">
                {originalPrice} SAR
              </span>
            )}
          </div>

          {/* Description with read more functionality */}
          <div className="text-gray-600 mb-4">
            <p>{showFullDescription ? description : truncatedDescription}</p>
            {isLongDescription && (
              <button
                className="text-[#5D4037] font-medium mt-1 text-sm hover:underline"
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? "Show Less" : "Read More"}
              </button>
            )}
          </div>

          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 bg-[#FFE0B2] text-[#5D4037] rounded hover:bg-[#FFCC80]"
            >
              View Product
            </a>
          )}
        </div>
      </div>
    );
  };

  // Render current step content
  const renderStep = () => {
    // If we're past the last step, show results
    if (currentStep >= steps.length) {
      return renderResults();
    }

    const step = steps[currentStep];
    const currentValue = formData[step.field];

    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-[#3E2723]">{step.title}</h2>

        {step.isTextarea ? (
          <div>
            <textarea
              name={step.field}
              value={formData[step.field]}
              onChange={handleInputChange}
              placeholder="Type your answer here..."
              className="w-full p-4 rounded-lg border border-[#D7CCC8] bg-white text-[#5D4037] min-h-[120px]"
            />

            {formData.otherSelected && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-[#D7CCC8]">
                <div className="mb-4">
                  <label className="block mb-2 text-[#3E2723]">
                    Recipient's Name (optional)
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="w-full p-3 rounded border border-[#D7CCC8] bg-[#FFEFD5]"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="saveContact"
                    checked={saveContact}
                    onChange={() => setSaveContact(!saveContact)}
                    className="mr-2 h-5 w-5"
                  />
                  <label htmlFor="saveContact" className="text-[#3E2723]">
                    Save this person to your contacts
                  </label>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={prevStep}
                className="px-6 py-2 bg-[#D7CCC8] text-[#5D4037] rounded-lg hover:bg-[#BCAAA4]"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723]"
              >
                Submit
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {step.options.map((option) => (
              <OptionButton
                key={option}
                value={option}
                selected={currentValue === option}
                onClick={() => handleSelect(step.field, option)}
              />
            ))}

            <div className="mt-6 flex justify-between">
              <button
                onClick={prevStep}
                className="px-6 py-2 bg-[#D7CCC8] text-[#5D4037] rounded-lg hover:bg-[#BCAAA4]"
                disabled={currentStep === 0}
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723]"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render results page
  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-[#5D4037] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#3E2723] text-lg">
            Finding perfect gift suggestions...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-10 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => setCurrentStep(0)}
            className="px-6 py-2 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723]"
          >
            Try Again
          </button>
        </div>
      );
    }

    console.log("Results to render:", results);

    if (!results || results.length === 0) {
      return (
        <div className="py-10 text-center">
          <p className="text-[#3E2723] mb-4">
            No gift suggestions found. Please try different criteria.
          </p>
          <button
            onClick={() => setCurrentStep(0)}
            className="px-6 py-2 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723]"
          >
            Start Over
          </button>
        </div>
      );
    }

    // Flatten gift suggestions to include main products and alternatives
    const flattenedGifts = [];

    results.forEach((suggestion) => {
      // Add main product if it exists
      if (suggestion.product) {
        flattenedGifts.push({
          ...suggestion.product,
          category: suggestion.category,
          modifier: suggestion.modifier,
        });
      }

      // Add alternatives if they exist
      if (suggestion.alternatives && Array.isArray(suggestion.alternatives)) {
        suggestion.alternatives.forEach((alt) => {
          if (alt) {
            flattenedGifts.push({
              ...alt,
              category: suggestion.category,
              modifier: suggestion.modifier,
              isAlternative: true,
            });
          }
        });
      }
    });

    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#3E2723]">
            Perfect Gift Suggestions
          </h2>
          <button
            onClick={() => navigate("/gift-generator")}
            className="px-4 py-2 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723] text-sm"
          >
            Advanced Options
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {flattenedGifts.map((gift, index) => (
            <GiftCard key={index} gift={gift} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setCurrentStep(0)}
            className="px-6 py-2 bg-[#5D4037] text-white rounded-lg hover:bg-[#3E2723]"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFF3E0]">
      <div
        ref={containerRef}
        className="max-w-3xl mx-auto min-h-screen p-8 flex flex-col"
      >
        {/* Progress bar */}
        <div className="w-full h-2 bg-[#D7CCC8] rounded-full mb-8">
          <div
            className="h-full bg-[#5D4037] rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col justify-center">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default GiftFlow;
