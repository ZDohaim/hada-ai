import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getEnrichedGiftSuggestions } from "../services/combinedGiftService";
import { useContacts } from "../hooks/useContacts";
import { trackClick } from "../services/clickTracking";

// Reminder Modal Component
const ReminderModal = ({
  showReminderModal,
  setShowReminderModal,
  reminderData,
  setReminderData,
  contacts,
  handleReminderSubmit,
}) => {
  const [localContactName, setLocalContactName] = useState(
    reminderData.contactName
  );
  const [localOccasion, setLocalOccasion] = useState(reminderData.occasion);
  const [localDate, setLocalDate] = useState(reminderData.date);
  const [localSaveForFuture, setLocalSaveForFuture] = useState(
    reminderData.saveForFuture
  );

  const handleContinue = () => {
    setReminderData({
      contactName: localContactName,
      occasion: localOccasion,
      date: localDate,
      saveForFuture: localSaveForFuture,
    });
    handleReminderSubmit();
  };

  const handleSkip = () => {
    setShowReminderModal(false);
    setReminderData({
      contactName: "",
      occasion: "",
      date: "",
      saveForFuture: false,
    });
    handleReminderSubmit();
  };

  if (!showReminderModal) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowReminderModal(false);
          setReminderData({
            contactName: "",
            occasion: "",
            date: "",
            saveForFuture: false,
          });
        }
      }}
    >
      <div
        className="p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-opacity-20 backdrop-blur-sm animate-fade-in-up"
        style={{
          backgroundColor: "rgba(255, 227, 179, 0.95)",
          borderColor: "#D4A373",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-2xl font-bold mb-4 text-center tracking-wide"
          style={{
            color: "#3E2723",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Save for Future Reference?
        </h3>
        <p
          className="text-sm mb-6 text-center leading-relaxed"
          style={{ color: "#5D4037" }}
        >
          Would you like to save this gift search to your contacts for future
          reference?
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#5D4037" }}
            >
              Contact Name
            </label>
            <input
              type="text"
              value={localContactName}
              onChange={(e) => setLocalContactName(e.target.value)}
              placeholder="Enter contact name"
              className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
              style={{
                backgroundColor: "rgba(255, 243, 224, 0.8)",
                borderColor: "#D4A373",
                color: "#3E2723",
              }}
              autoComplete="off"
            />
            {contacts.length > 0 && (
              <div className="mt-3">
                <p className="text-xs mb-2" style={{ color: "#5D4037" }}>
                  Existing contacts:
                </p>
                <div className="flex flex-wrap gap-2">
                  {contacts.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setLocalContactName(contact.name)}
                      className="text-xs px-3 py-1.5 rounded-full border border-opacity-30 hover:scale-105 transition-all duration-300"
                      style={{
                        backgroundColor: "rgba(212, 163, 115, 0.2)",
                        borderColor: "#D4A373",
                        color: "#5D4037",
                      }}
                    >
                      {contact.name}
                    </button>
                  ))}
                  {contacts.length > 5 && (
                    <span
                      className="text-xs px-3 py-1.5"
                      style={{ color: "#5D4037" }}
                    >
                      +{contacts.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#5D4037" }}
            >
              Occasion (Optional)
            </label>
            <input
              type="text"
              value={localOccasion}
              onChange={(e) => setLocalOccasion(e.target.value)}
              placeholder="e.g., Birthday, Anniversary"
              className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
              style={{
                backgroundColor: "rgba(255, 243, 224, 0.8)",
                borderColor: "#D4A373",
                color: "#3E2723",
              }}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#5D4037" }}
            >
              Reminder Date (Optional)
            </label>
            <input
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
              style={{
                backgroundColor: "rgba(255, 243, 224, 0.8)",
                borderColor: "#D4A373",
                color: "#3E2723",
              }}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="saveForFuture"
              checked={localSaveForFuture}
              onChange={(e) => setLocalSaveForFuture(e.target.checked)}
              className="mr-3 h-5 w-5 rounded border-2 border-opacity-30"
              style={{ borderColor: "#D4A373" }}
            />
            <label
              htmlFor="saveForFuture"
              className="text-sm font-medium"
              style={{ color: "#5D4037" }}
            >
              Save this information to my contacts
            </label>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 rounded-full border-2 border-opacity-30 font-medium tracking-wide transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: "transparent",
              color: "#5D4037",
              borderColor: "#D4A373",
            }}
          >
            Skip
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 py-3 rounded-full font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
              color: "#FFF3E0",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const GiftFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [saveContact, setSaveContact] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Reminder modal states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderData, setReminderData] = useState({
    contactName: "",
    occasion: "",
    date: "",
    saveForFuture: false,
  });

  const { contacts, addContact, updateContact } = useContacts();

  // Handle modal keyboard events
  useEffect(() => {
    if (showReminderModal) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setShowReminderModal(false);
          setReminderData({
            contactName: "",
            occasion: "",
            date: "",
            saveForFuture: false,
          });
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showReminderModal]);

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
  const genderOptions = ["Male", "Female"];
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

    if (
      (field === "relationship" || field === "category") &&
      value === "Other"
    ) {
      updatedData.otherSelected = true;
    }

    setFormData(updatedData);

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
    } else {
      if (!user) {
        navigate("/");
      } else {
        navigate("/UserInfo");
      }
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
      };

      await addContact(contactData);
      setSaveContact(false);
    } catch (err) {
      console.error("Error saving contact", err);
      setError("Failed to save contact");
    }
  };

  const handleSubmit = async () => {
    setShowReminderModal(true);
  };

  const handleReminderSubmit = async () => {
    setShowReminderModal(false);
    setLoading(true);
    setError(null);

    if (saveContact && user) {
      await handleSaveContact();
    }

    try {
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
        recipientName: formData.name,
        description: `Looking for a gift for a ${formData.gender} ${formData.recipientAge} years old ${formData.relationship}. 
                     They are interested in ${formData.category}. 
                     Budget is ${formData.budget}.
                     Additional information: ${formData.notes}`,
        enrichWithProducts: true,
      };

      console.log("Sending preferences to API:", gptPreferences);
      const result = await getEnrichedGiftSuggestions(gptPreferences);
      console.log("API response:", result);

      if (result && result.gifts && Array.isArray(result.gifts)) {
        setResults(result.gifts);
      } else if (result && Array.isArray(result)) {
        setResults(result);
      } else if (
        result &&
        typeof result === "object" &&
        Object.keys(result).length > 0
      ) {
        const transformedResults = [];
        for (const key in result) {
          if (typeof result[key] === "object" && result[key] !== null) {
            transformedResults.push(result[key]);
          }
        }
        if (transformedResults.length > 0) {
          setResults(transformedResults);
        } else {
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

      setCurrentStep(steps.length + 1);

      if (reminderData.saveForFuture && reminderData.contactName) {
        await saveReminderData(results || []);
      }
    } catch (err) {
      setError("Failed to generate gift suggestions. Please try again.");
      console.error("API error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveReminderData = async (gifts) => {
    try {
      const existingContact = contacts.find(
        (contact) =>
          contact.name.toLowerCase() === reminderData.contactName.toLowerCase()
      );

      const giftHistory = {
        date: new Date().toISOString(),
        occasion: reminderData.occasion || "Gift Search",
        gifts: gifts.map((gift) => ({
          name: gift.name || gift.title || gift.en_name || "Gift suggestion",
          product: gift.product
            ? {
                name: gift.product.name || gift.product.en_name,
                price: gift.product.price,
                url: gift.product.share_url || gift.product.seo_url_en,
              }
            : null,
        })),
        preferences: {
          category: formData.category,
          budget: formData.budget,
          age: formData.recipientAge,
          gender: formData.gender,
          relationship: formData.relationship,
          notes: formData.notes,
        },
      };

      if (existingContact) {
        const updatedContact = {
          ...existingContact,
          giftHistory: [...(existingContact.giftHistory || []), giftHistory],
        };

        if (reminderData.date) {
          const newDate = {
            label: reminderData.occasion || "Gift Reminder",
            date: reminderData.date,
          };
          updatedContact.dates = [...(existingContact.dates || []), newDate];
        }

        await updateContact(existingContact.id, updatedContact);
      } else {
        const newContact = {
          name: reminderData.contactName,
          relation: formData.relationship || "Friend",
          dates: reminderData.date
            ? [
                {
                  label: reminderData.occasion || "Gift Reminder",
                  date: reminderData.date,
                },
              ]
            : [],
          notes: `Gift preferences: ${formData.category}. ${formData.notes}`,
          giftHistory: [giftHistory],
        };

        await addContact(newContact);
      }

      console.log("✅ Reminder data saved successfully");
    } catch (err) {
      console.error("Error saving reminder data:", err);
    }
  };

  // Render option button
  const OptionButton = ({ value, selected, onClick }) => (
    <button
      className={`group w-full py-4 px-6 rounded-xl text-left transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-opacity-30 font-medium tracking-wide
        ${selected ? "shadow-xl" : "hover:shadow-lg"}`}
      style={{
        backgroundColor: selected ? "#5D4037" : "rgba(255, 243, 224, 0.8)",
        color: selected ? "#FFF3E0" : "#5D4037",
        borderColor: "#D4A373",
        background: selected
          ? "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)"
          : "rgba(255, 243, 224, 0.8)",
      }}
      onClick={onClick}
    >
      {steps[currentStep]?.field === "budget" ? (
        <div className="flex items-center gap-3">
          <img
            src="/Saudi_Riyal_Symbol-2.svg"
            alt="SAR"
            className="w-5 h-5 inline-block"
          />
          <span className="text-lg">{value}</span>
        </div>
      ) : (
        <span className="text-lg">{value}</span>
      )}
      {!selected && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-200 to-amber-300 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      )}
    </button>
  );

  // Gift Card Component
  const GiftCard = ({ gift }) => {
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [selectedProductIndex, setSelectedProductIndex] = useState(0);

    // Get all available products (new multiple products support)
    const allProducts =
      gift.products && gift.products.length > 0
        ? gift.products
        : [gift.product || gift];
    const hasMultipleProducts = allProducts.length > 1;
    const currentProduct =
      allProducts[selectedProductIndex] || allProducts[0] || gift;

    const name =
      currentProduct.name ||
      currentProduct.title ||
      currentProduct.en_name ||
      `${gift.category} ${gift.modifier || ""}`.trim();
    const description =
      currentProduct.description ||
      currentProduct.short_description ||
      `${gift.category} ${gift.modifier || ""}`;

    // Improved image URL handling with source-specific logic
    let imageUrl = null;
    if (
      currentProduct.images &&
      Array.isArray(currentProduct.images) &&
      currentProduct.images.length > 0
    ) {
      imageUrl = currentProduct.images[0];
    } else if (currentProduct.image) {
      imageUrl = currentProduct.image;
    } else if (currentProduct.thumb) {
      imageUrl = currentProduct.thumb;
    } else if (currentProduct.imageUrl) {
      imageUrl = currentProduct.imageUrl;
    }

    // Special handling for Jarir images to ensure proper loading
    if (gift.source === "jarir" && imageUrl) {
      // Ensure the image URL is properly formatted for Jarir
      if (!imageUrl.startsWith("http") && !imageUrl.startsWith("//")) {
        imageUrl = `https://www.jarir.com${imageUrl}`;
      } else if (imageUrl.startsWith("//")) {
        imageUrl = `https:${imageUrl}`;
      }
    }

    const productUrl =
      currentProduct.url ||
      currentProduct.product_url ||
      currentProduct.share_url ||
      currentProduct.link;

    // Determine company from gift source or URL
    const getCompanyFromGift = (gift) => {
      if (gift.source) {
        return gift.source.toLowerCase();
      }
      if (productUrl) {
        if (productUrl.includes("niceone.sa")) return "niceone";
        if (productUrl.includes("jarir.com")) return "jarir";
      }
      return "unknown";
    };

    const handleProductClick = async () => {
      const company = getCompanyFromGift(gift);
      const userId = user?.uid || null;
      await trackClick(company, name, gift.category, userId);
    };

    let price = null;
    let originalPrice = null;

    // Handle Mahaly price structure first
    if (
      currentProduct.sale_price &&
      typeof currentProduct.sale_price === "number"
    ) {
      price = currentProduct.sale_price.toString();
      if (
        currentProduct.regular_price &&
        currentProduct.regular_price !== currentProduct.sale_price
      ) {
        originalPrice = currentProduct.regular_price.toString();
      }
    } else if (
      currentProduct.price &&
      typeof currentProduct.price === "number"
    ) {
      price = currentProduct.price.toString();
    } else if (currentProduct.special && currentProduct.special.length > 0) {
      const specialPrice =
        currentProduct.special[0].priceWithoutCurrency ||
        (typeof currentProduct.special[0].price_formated === "string"
          ? currentProduct.special[0].price_formated.replace(/[^0-9.]/g, "")
          : null);

      const origPrice =
        currentProduct.special[0].originalPriceWithoutCurrency ||
        (typeof currentProduct.special[0].original_price === "string"
          ? currentProduct.special[0].original_price.replace(/[^0-9.]/g, "")
          : null);

      if (specialPrice) price = specialPrice;
      if (origPrice) originalPrice = origPrice;
    } else if (
      typeof currentProduct.price === "object" &&
      currentProduct.price.priceWithoutCurrency
    ) {
      price = currentProduct.price.priceWithoutCurrency;
      if (currentProduct.price.originalPriceWithoutCurrency) {
        originalPrice = currentProduct.price.originalPriceWithoutCurrency;
      }
    } else if (typeof currentProduct.price === "string") {
      price = currentProduct.price.replace(/[^0-9.]/g, "");
    }

    const isLongDescription = description && description.length > 100;
    const truncatedDescription = isLongDescription
      ? `${description.substring(0, 100)}...`
      : description;

    // --- Highlight popular items for Jarir ---
    // Check if current product is popular/trending
    let isPopular = false;
    let popularLabel = "";
    if (gift.source === "jarir" && Array.isArray(currentProduct.tags)) {
      const popTag = currentProduct.tags.find(
        (t) => t.label === "Trending Now" || t.label === "Best Sellers"
      );
      if (popTag) {
        isPopular = true;
        popularLabel = popTag.label;
      }
    }

    return (
      <div
        className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-opacity-20 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
          isPopular ? "ring-2 ring-amber-400" : ""
        }`}
        style={{ borderColor: "#D4A373" }}
      >
        {/* Product Selection Tabs - Only show if multiple products */}
        {hasMultipleProducts && (
          <div
            className="border-b border-opacity-20"
            style={{ borderColor: "#D4A373" }}
          >
            <div className="flex overflow-x-auto scrollbar-hide">
              {allProducts.map((product, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedProductIndex(index)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-300 min-w-0 flex-shrink-0 ${
                    selectedProductIndex === index
                      ? "border-amber-400 text-amber-700 bg-amber-50"
                      : "border-transparent text-gray-600 hover:text-amber-600 hover:bg-amber-25"
                  }`}
                >
                  Option {index + 1}
                  {product.price && (
                    <span className="ml-2 text-xs opacity-75">
                      {typeof product.price === "number"
                        ? `${product.price} SAR`
                        : product.price.toString().includes("SAR")
                        ? product.price
                        : `${product.price} SAR`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-56 overflow-hidden relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-contain bg-white transition-transform duration-300 hover:scale-110"
              style={{
                objectFit: gift.source === "jarir" ? "contain" : "cover",
              }}
              onError={(e) => {
                console.log(
                  "Image failed to load:",
                  imageUrl,
                  "Source:",
                  gift.source
                );
                e.target.onerror = null;
                // Try a different fallback based on source
                if (gift.source === "jarir" && imageUrl.includes("jarir.com")) {
                  // For Jarir, try removing any path prefixes that might be causing issues
                  const cleanImageUrl = imageUrl.replace(
                    /.*\/([^\/]+\.(jpg|jpeg|png|gif|webp)).*$/i,
                    "https://www.jarir.com/media/catalog/product/$1"
                  );
                  if (cleanImageUrl !== imageUrl) {
                    e.target.src = cleanImageUrl;
                    return;
                  }
                }
                // Final fallback
                e.target.parentElement.innerHTML = `
                  <div class="h-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center" style="color: #5D4037">
                    <div class="text-center p-4">
                      <span class="text-5xl mb-3 block">🎁</span>
                      <p class="font-medium text-lg">${
                        gift.category || "Gift"
                      }</p>
                      <p class="text-sm opacity-75 mt-1">${
                        gift.source?.toUpperCase() || "CURATED"
                      }</p>
                    </div>
                  </div>
                `;
              }}
            />
          ) : (
            <div
              className="h-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center"
              style={{ color: "#5D4037" }}
            >
              <div className="text-center p-4">
                <span className="text-5xl mb-3 block">🎁</span>
                <p className="font-medium text-lg">{gift.category || "Gift"}</p>
                <p className="text-sm opacity-75 mt-1">
                  {gift.source?.toUpperCase() || "CURATED"}
                </p>
              </div>
            </div>
          )}
          {/* Source indicator for all recommendations */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full shadow-lg"
              style={{
                backgroundColor: gift.isPlaceholder ? "#E3F2FD" : "#FFE0B2",
                color: gift.isPlaceholder ? "#1976D2" : "#5D4037",
              }}
            >
              {gift.source?.toUpperCase() || "CURATED"}
            </span>
            {/* Popular badge for Jarir */}
            {isPopular && (
              <span className="text-xs font-bold px-2 py-1 rounded shadow bg-amber-400 text-white animate-pulse">
                {popularLabel}
              </span>
            )}
          </div>
          {/* Multiple products indicator */}
          {hasMultipleProducts && (
            <div className="absolute top-3 left-3">
              <span
                className="text-xs font-medium px-2 py-1 rounded-full shadow-lg"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.9)",
                  color: "white",
                }}
              >
                {allProducts.length} Options
              </span>
            </div>
          )}
          {/* Search context indicator for better understanding */}
          {gift.searchContext && (
            <div className="absolute bottom-3 left-3">
              <span
                className="text-xs font-medium px-2 py-1 rounded-full shadow-lg opacity-80"
                style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "white" }}
              >
                {gift.searchContext.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
          <h3
            className="text-xl font-bold mb-3 leading-tight tracking-wide"
            style={{
              color: "#3E2723",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {name}
          </h3>

          {price && (
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center font-bold text-lg"
                style={{ color: "#D84315" }}
              >
                <img
                  src="/Saudi_Riyal_Symbol-2.svg"
                  alt="SAR"
                  className="w-5 h-5 inline-block mr-2"
                />
                <span>{price} SAR</span>
              </div>
              {originalPrice && originalPrice !== price && (
                <span
                  className="text-sm line-through opacity-60"
                  style={{ color: "#8D6E63" }}
                >
                  {originalPrice} SAR
                </span>
              )}
            </div>
          )}

          <div className="mb-6" style={{ color: "#5D4037" }}>
            <p className="leading-relaxed">
              {showFullDescription ? description : truncatedDescription}
            </p>
            {isLongDescription && (
              <button
                className="font-medium mt-2 text-sm hover:underline transition-all duration-300"
                style={{ color: "#3E2723" }}
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? "Show Less" : "Read More"}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {gift.isPlaceholder ? (
              <div
                className="block w-full text-center py-3 rounded-xl font-medium tracking-wide border-2 border-dashed transition-all duration-300"
                style={{
                  borderColor: "#D4A373",
                  color: "#5D4037",
                  backgroundColor: "rgba(212, 163, 115, 0.1)",
                }}
              >
                Explore at {gift.source?.toUpperCase() || "Store"}
              </div>
            ) : productUrl ? (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)",
                  color: "#5D4037",
                }}
                onClick={handleProductClick}
              >
                View Product{" "}
                {hasMultipleProducts
                  ? `(${selectedProductIndex + 1}/${allProducts.length})`
                  : ""}
              </a>
            ) : null}

            {/* Show all products link if multiple options */}
            {hasMultipleProducts && (
              <div className="text-center">
                <span className="text-sm" style={{ color: "#8D6E63" }}>
                  💡 Browse through the tabs above to see all{" "}
                  {allProducts.length} options
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render current step content
  const renderStep = () => {
    if (currentStep >= steps.length) {
      return renderResults();
    }

    const step = steps[currentStep];
    const currentValue = formData[step.field];

    return (
      <div className="animate-fade-in-up">
        <h2
          className="text-3xl md:text-4xl font-bold mb-8 text-center tracking-wide leading-tight"
          style={{
            color: "#3E2723",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {step.title}
        </h2>

        {step.isTextarea ? (
          <div className="max-w-2xl mx-auto">
            <textarea
              name={step.field}
              value={formData[step.field]}
              onChange={handleInputChange}
              placeholder="Share what you know about their interests, hobbies, or preferences..."
              className="w-full p-6 rounded-2xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200 min-h-[150px] text-lg leading-relaxed"
              style={{
                backgroundColor: "rgba(255, 243, 224, 0.8)",
                borderColor: "#D4A373",
                color: "#5D4037",
              }}
            />

            {formData.otherSelected && (
              <div
                className="mt-6 p-6 rounded-2xl border-2 border-opacity-30"
                style={{
                  backgroundColor: "rgba(255, 243, 224, 0.8)",
                  borderColor: "#D4A373",
                }}
              >
                <div className="mb-6">
                  <label
                    className="block mb-3 font-medium text-lg"
                    style={{ color: "#3E2723" }}
                  >
                    Recipient's Name (optional)
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="w-full p-4 rounded-xl border-2 border-opacity-30 focus:border-opacity-60 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-200"
                    style={{
                      backgroundColor: "rgba(255, 243, 224, 0.8)",
                      borderColor: "#D4A373",
                      color: "#3E2723",
                    }}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="saveContact"
                    checked={saveContact}
                    onChange={() => setSaveContact(!saveContact)}
                    className="mr-3 h-5 w-5 rounded border-2"
                    style={{ borderColor: "#D4A373" }}
                  />
                  <label
                    htmlFor="saveContact"
                    className="font-medium"
                    style={{ color: "#3E2723" }}
                  >
                    Save this person to your contacts
                  </label>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between gap-4">
              <button
                onClick={prevStep}
                className="px-8 py-3 rounded-full border-2 border-opacity-30 font-medium tracking-wide transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: "transparent",
                  color: "#5D4037",
                  borderColor: "#D4A373",
                }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-8 py-3 rounded-full font-medium tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl ${
                  loading ? "cursor-not-allowed opacity-60" : "hover:scale-105"
                }`}
                style={{
                  background: loading
                    ? "rgba(139, 110, 99, 0.5)"
                    : "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
                  color: "#FFF3E0",
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-opacity-30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  "Find Perfect Gifts"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              {step.options.map((option) => (
                <OptionButton
                  key={option}
                  value={option}
                  selected={currentValue === option}
                  onClick={() => handleSelect(step.field, option)}
                />
              ))}
            </div>

            <div className="mt-8 flex justify-between gap-4">
              <button
                onClick={prevStep}
                className="px-8 py-3 rounded-full border-2 border-opacity-30 font-medium tracking-wide transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: "transparent",
                  color: "#5D4037",
                  borderColor: "#D4A373",
                }}
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="px-8 py-3 rounded-full font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #D4A373 0%, #8D6E63 100%)",
                  color: "#FFF3E0",
                }}
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
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
          <div className="relative mb-8">
            <div
              className="w-24 h-24 border-4 border-opacity-20 border-t-amber-400 rounded-full animate-spin"
              style={{ borderColor: "#D4A373" }}
            ></div>
            <div
              className="absolute top-2 left-2 w-20 h-20 border-4 border-opacity-30 border-b-amber-500 rounded-full animate-spin"
              style={{
                borderColor: "#FFE0B2",
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl">
              🎁
            </div>
          </div>
          <h3
            className="text-2xl font-bold mb-4 tracking-wide"
            style={{
              color: "#3E2723",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Finding Perfect Gift Suggestions
          </h3>
          <p
            className="text-center max-w-md leading-relaxed"
            style={{ color: "#5D4037" }}
          >
            Our AI is analyzing your preferences and searching through thousands
            of products to find the perfect gifts...
          </p>
          <div className="mt-6 flex space-x-2">
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: "#5D4037",
                animationDelay: "0ms",
              }}
            ></div>
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: "#5D4037",
                animationDelay: "150ms",
              }}
            ></div>
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: "#5D4037",
                animationDelay: "300ms",
              }}
            ></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-10 text-center animate-fade-in-up">
          <div
            className="mb-6 p-6 rounded-2xl border-2"
            style={{
              backgroundColor: "rgba(139, 110, 99, 0.1)",
              borderColor: "#8D6E63",
            }}
          >
            <p className="font-medium" style={{ color: "#5D4037" }}>
              {error}
            </p>
          </div>
          <button
            onClick={() => setCurrentStep(0)}
            className="px-8 py-3 rounded-full font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
              color: "#FFF3E0",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    console.log("Results to render:", results);

    if (!results || results.length === 0) {
      return (
        <div className="py-10 text-center animate-fade-in-up">
          <p className="mb-6 text-xl" style={{ color: "#3E2723" }}>
            No gift suggestions found. Please try different criteria.
          </p>
          <button
            onClick={() => setCurrentStep(0)}
            className="px-8 py-3 rounded-full font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
              color: "#FFF3E0",
            }}
          >
            Start Over
          </button>
        </div>
      );
    }

    const curatedRecommendations = [];

    results.forEach((suggestion) => {
      if (suggestion.product) {
        curatedRecommendations.push({
          ...suggestion.product,
          category: suggestion.category,
          modifier: suggestion.modifier,
          source: suggestion.source,
          searchQuery: suggestion.searchQuery,
          recommendation_id: suggestion.recommendation_id,
          searchContext: suggestion.search_context,
        });
      } else {
        // Create a fallback gift card when product is null
        curatedRecommendations.push({
          name: suggestion.modifier
            ? `${suggestion.category} ${suggestion.modifier}`
            : suggestion.category,
          category: suggestion.category,
          modifier: suggestion.modifier,
          source: suggestion.source || "unknown",
          searchQuery: suggestion.searchQuery,
          recommendation_id: suggestion.recommendation_id,
          searchContext: suggestion.search_context,
          description: suggestion.modifier
            ? `${suggestion.modifier} from ${
                suggestion.store || "our partners"
              }`
            : `${suggestion.category} suggestion from ${
                suggestion.store || "our partners"
              }`,
          // Use a placeholder image based on category
          image: null,
          isPlaceholder: true,
        });
      }
    });

    return (
      <div className="animate-fade-in-up">
        <div className="flex justify-between items-center mb-8">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-wide"
            style={{
              color: "#3E2723",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Curated Gift Recommendations
          </h2>
          <button
            onClick={() => navigate("/UserInfo")}
            className="px-6 py-3 rounded-full font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #D4A373 0%, #8D6E63 100%)",
              color: "#FFF3E0",
            }}
          >
            User Info
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {curatedRecommendations.map((gift, index) => (
            <GiftCard key={`${gift.recommendation_id || index}`} gift={gift} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => setCurrentStep(0)}
            className="px-8 py-3 rounded-full font-medium tracking-wide transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
              color: "#FFF3E0",
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <ReminderModal
        showReminderModal={showReminderModal}
        setShowReminderModal={setShowReminderModal}
        reminderData={reminderData}
        setReminderData={setReminderData}
        contacts={contacts}
        handleReminderSubmit={handleReminderSubmit}
      />
      <div
        className="min-h-screen relative overflow-hidden"
        style={{ backgroundColor: "#FFF3E0" }}
      >
        {/* Background subtle pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-gradient-to-br from-amber-200 to-amber-300"></div>
          <div className="absolute bottom-32 right-32 w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-amber-200"></div>
          <div className="absolute top-1/2 left-10 w-24 h-24 rounded-full bg-gradient-to-br from-amber-150 to-amber-250"></div>
        </div>

        <div
          ref={containerRef}
          className="relative z-10 max-w-4xl mx-auto min-h-screen p-8 flex flex-col"
        >
          {/* Progress bar */}
          <div
            className="w-full h-3 rounded-full mb-12 shadow-inner"
            style={{ backgroundColor: "rgba(215, 204, 200, 0.5)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 shadow-lg"
              style={{
                width: `${(currentStep / steps.length) * 100}%`,
                background: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)",
              }}
            ></div>
          </div>

          {/* Step content */}
          <div className="flex-1 flex flex-col justify-center">
            {renderStep()}
          </div>
        </div>

        <style jsx>{`
          @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap");

          .animate-fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
            opacity: 0;
            transform: translateY(30px);
          }

          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Enhanced focus states */
          input:focus,
          textarea:focus {
            transform: translateY(-2px);
          }

          /* Button hover effects */
          .group:hover {
            transform: scale(1.05) translateY(-2px);
          }
        `}</style>
      </div>
    </>
  );
};

export default GiftFlow;
