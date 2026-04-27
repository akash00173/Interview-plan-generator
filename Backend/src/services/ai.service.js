const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY
})

const interviewSchema = {
  type: "OBJECT",
  properties: {
    matchScore: {
      type: "NUMBER",
      description: "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
    },
    technicalQuestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING", description: "The technical interview question" },
          intention: { type: "STRING", description: "What the interviewer wants to assess with this question" },
          answer: { type: "STRING", description: "Expected good answer to this question" }
        },
        required: ["question", "intention", "answer"]
      },
      description: "Array of 5-8 technical questions with intentions and answers"
    },
    behavioralQuestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING", description: "The behavioral interview question" },
          intention: { type: "STRING", description: "What the interviewer wants to assess with this question" },
          answer: { type: "STRING", description: "Expected good answer to this question" }
        },
        required: ["question", "intention", "answer"]
      },
      description: "Array of 5-8 behavioral questions with intentions and answers"
    },
    skillGaps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          skill: { type: "STRING", description: "The skill gap identified" },
          severity: { type: "STRING", enum: ["Low", "Medium", "High"], description: "How critical this skill gap is" }
        },
        required: ["skill", "severity"]
      },
      description: "Array of 3-5 skill gaps identified"
    },
    preparationPlan: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "NUMBER", description: "Day number in the preparation plan (1, 2, 3, etc.)" },
          focus: { type: "STRING", description: "Main focus/topic for that day" },
          tasks: { type: "ARRAY", items: { type: "STRING" }, description: "Specific tasks to complete that day" }
        },
        required: ["day", "focus", "tasks"]
      },
      description: "Array of 5-7 days preparation plan"
    }
  },
  required: ["matchScore", "technicalQuestions", "behavioralQuestions", "skillGaps", "preparationPlan"]
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(prompt, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}...`);
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: interviewSchema
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.log("Error:", error.message || error.toString());
      const errorMsg = (error.message || error.toString()).toLowerCase();
      if (errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("too many requests") || errorMsg.includes("unavailable")) {
        const waitTime = (attempt + 1) * 15000;
        console.log(`Rate limited, waiting ${waitTime/1000} seconds...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded due to rate limiting");
}

async function generateInterviewReport({resume, selfDescription, jobDescription}){

  const prompt = `You are an expert career coach. Generate a JSON with: matchScore (0-100), technicalQuestions (5 questions), behavioralQuestions (5 questions), skillGaps (3-5), preparationPlan (5 days).

Return only valid JSON like:
{"matchScore":75,"technicalQuestions":[{"question":"...","intention":"...","answer":"..."}],"behavioralQuestions":[],"skillGaps":[],"preparationPlan":[]}

Resume: ${resume}
Job: ${jobDescription}`;

  console.log("=== Generating Interview Report ===");
  
  const parsedResponse = await generateWithRetry(prompt);

  return {
    matchScore: parsedResponse.matchScore || 0,
    technicalQuestions: parsedResponse.technicalQuestions || [],
    behavioralQuestions: parsedResponse.behavioralQuestions || [],
    skillGaps: parsedResponse.skillGaps || [],
    preparationPlan: parsedResponse.preparationPlan || []
  };
}

module.exports = generateInterviewReport