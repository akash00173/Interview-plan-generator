const axios = require("axios");

const interviewSchema = {
  type: "OBJECT",
  properties: {
    matchScore: { type: "NUMBER" },
    technicalQuestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          intention: { type: "STRING" },
          answer: { type: "STRING" }
        },
        required: ["question", "intention", "answer"]
      }
    },
    behavioralQuestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          intention: { type: "STRING" },
          answer: { type: "STRING" }
        },
        required: ["question", "intention", "answer"]
      }
    },
    skillGaps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          skill: { type: "STRING" },
          severity: { type: "STRING" }
        },
        required: ["skill", "severity"]
      }
    },
    preparationPlan: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "NUMBER" },
          focus: { type: "STRING" },
          tasks: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["day", "focus", "tasks"]
      }
    }
  },
  required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan"]
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(prompt, maxRetries = 3) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}...`);
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: interviewSchema
        }
      });
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.log("Error:", error.response?.data || error.message);
      if (error.response?.status === 429) {
        const waitTime = (attempt + 1) * 10000;
        console.log(`Rate limited, waiting ${waitTime/1000} seconds...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

async function generateInterviewReport({resume, selfDescription, jobDescription}){

  const prompt = `Generate interview preparation report as JSON with:
- matchScore (0-100)
- technicalQuestions (5 array items with question, intention, answer)
- behavioralQuestions (5 items)
- skillGaps (3 items with skill, severity)
- preparationPlan (5 days with day, focus, tasks)

Job: ${jobDescription}
Resume: ${resume || "Not provided"}
Self: ${selfDescription || "Not provided"}

Return ONLY valid JSON, no other text.`;

  console.log("=== Generating Interview Report ===");
  
  const responseText = await generateWithRetry(prompt);
  const parsedResponse = JSON.parse(responseText);

  return {
    matchScore: parsedResponse.matchScore || 0,
    technicalQuestions: parsedResponse.technicalQuestions || [],
    behavioralQuestions: parsedResponse.behavioralQuestions || [],
    skillGaps: parsedResponse.skillGaps || [],
    preparationPlan: parsedResponse.preparationPlan || []
  };
}

module.exports = generateInterviewReport