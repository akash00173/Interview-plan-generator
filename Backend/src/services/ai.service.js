const axios = require("axios");

async function generateInterviewReport({resume, selfDescription, jobDescription}) {

  const API_KEY = process.env.GOOGLE_API_KEY;
  const prompt = `You are an expert career coach. Create an interview preparation report in this exact JSON format:
{
  "matchScore": 75,
  "technicalQuestions": [{"question": "...", "intention": "...", "answer": "..."}],
  "behavioralQuestions": [{"question": "...", "intention": "...", "answer": "..."}],
  "skillGaps": [{"skill": "...", "severity": "High"}],
  "preparationPlan": [{"day": 1, "focus": "...", "tasks": ["..."]}]
}

Job Description: ${jobDescription}
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}

Respond ONLY with valid JSON, no explanation.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      }
    );

    let text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        matchScore: parsed.matchScore || 0,
        technicalQuestions: parsed.technicalQuestions || [],
        behavioralQuestions: parsed.behavioralQuestions || [],
        skillGaps: parsed.skillGaps || [],
        preparationPlan: parsed.preparationPlan || []
      };
    }
    
    throw new Error("No valid JSON in response");
    
  } catch (error) {
    console.error("AI Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || "Failed to generate report");
  }
}

module.exports = generateInterviewReport;