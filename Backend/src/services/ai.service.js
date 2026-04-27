const axios = require("axios");

async function generateInterviewReport({resume, selfDescription, jobDescription}) {

  const API_KEY = process.env.GOOGLE_API_KEY;
  
  const prompt = `Create interview prep JSON with matchScore, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan. Job: ${jobDescription.substring(0, 300)}`;

  try {
    // Try flash-2.0 model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      matchScore: parsed.matchScore || 0,
      technicalQuestions: parsed.technicalQuestions || [],
      behavioralQuestions: parsed.behavioralQuestions || [],
      skillGaps: parsed.skillGaps || [],
      preparationPlan: parsed.preparationPlan || []
    };
    
  } catch (error) {
    console.error("Error:", error.response?.data?.error?.message || error.message);
    throw new Error(error.response?.data?.error?.message || "AI failed");
  }
}

module.exports = generateInterviewReport;