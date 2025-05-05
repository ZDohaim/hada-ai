// src/services/gptService.js
import axios from "axios";

const API_URL = "http://localhost:5001";

export const generateGiftSuggestions = async (preferences) => {
  try {
    console.log("Sending preferences to API:", preferences);
    const response = await axios.post(
      `${API_URL}/api/generate-gift`,
      preferences
    );
    console.log("Successful response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error generating gift suggestions:", error);
    // Log the full error response
    if (error.response) {
      console.error("Server response data:", error.response.data);
      console.error("Server response status:", error.response.status);
      console.error("Server response headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received:", error.request);
    }

    throw new Error(
      error.response?.data?.error ||
        (error.response?.status === 429
          ? "Rate limit exceeded"
          : "Failed to generate gift suggestions")
    );
  }
};

export const testOpenAIConnection = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/test-openai`);
    return response.data;
  } catch (error) {
    console.error("Error testing OpenAI connection:", error);
    if (error.response) {
      console.error("Server response data:", error.response.data);
    }
    throw new Error(
      error.response?.data?.error || "Failed to connect to OpenAI API"
    );
  }
};
