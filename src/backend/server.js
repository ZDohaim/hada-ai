require("dotenv").config(); // ✅ Ensure this is the first line
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());

// Debugging: Check if API Key is Loaded
console.log(
  "OpenAI API Key:",
  process.env.OPENAI_API_KEY ? "Loaded" : "MISSING"
);

app.post("/generate-gift", async (req, res) => {
  try {
    const {
      category,
      occasion,
      budget,
      recipientAge,
      relationship,
      preferences,
      otherPreference,
    } = req.body;

    const prompt = `Suggest a thoughtful gift for a ${recipientAge} in the category of ${category} for a ${occasion} occasion. The budget is ${budget}. The recipient is a ${relationship}. Their preference is ${preferences}. ${
      otherPreference ? `Additional preference: ${otherPreference}.` : ""
    }`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a gift recommendation assistant.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OpenAI API Response:", response.data);
    res.json({ suggestion: response.data.choices[0].message.content.trim() });
  } catch (error) {
    console.error(
      "OpenAI API Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "Failed to generate gift suggestion",
      details: error.response ? error.response.data : error.message,
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
