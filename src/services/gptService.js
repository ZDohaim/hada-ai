import axios from "axios";

export const generateGiftSuggestions = async (preferences) => {
  try {
    const response = await axios.post(
      "http://localhost:5001/api/generate-gift",
      preferences
    );
    return response.data;
  } catch (error) {
    console.error("Error generating gift suggestions:", error);
    throw new Error(
      error.response?.data?.error || "Failed to generate gift suggestions"
    );
  }
};

export const testOpenAIConnection = async () => {
  try {
    const response = await axios.get("http://localhost:5001/api/test-openai");
    return response.data;
  } catch (error) {
    console.error("Error testing OpenAI connection:", error);
    throw new Error(
      error.response?.data?.error || "Failed to connect to OpenAI API"
    );
  }
};
