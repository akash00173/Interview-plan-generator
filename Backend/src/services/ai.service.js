const axios = require("axios");

async function generateInterviewReport({resume, selfDescription, jobDescription}) {

  const API_KEY = process.env.GOOGLE_API_KEY;
  
  console.log("=== AI Service Debug ===");
  console.log("API Key exists:", !!API_KEY);
  console.log("API Key prefix:", API_KEY?.substring(0, 10));
  
  const prompt = `Create interview prep JSON: {matchScore, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan}. Job: ${jobDescription.substring(0, 200)}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    console.log("Calling Google API...");
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    console.log("Response received:", JSON.stringify(response.data).substring(0, 200));

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error("FULL ERROR:", JSON.stringify(error.response?.data, null, 2));
    throw new Error("AI service failed");
  }
}

module.exports = generateInterviewReport;