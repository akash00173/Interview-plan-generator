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

async function generateInterviewReport({resume, selfDescription, jobDescription}){

  const prompt = `You are an expert career coach. Based on the following information, generate a comprehensive interview report.

IMPORTANT: Return a VALID JSON object with this EXACT structure:
{
  "matchScore": 75,
  "technicalQuestions": [
    {"question": "...", "intention": "...", "answer": "..."}
  ],
  "behavioralQuestions": [
    {"question": "...", "intention": "...", "answer": "..."}
  ],
  "skillGaps": [
    {"skill": "...", "severity": "Low|Medium|High"}
  ],
  "preparationPlan": [
    {"day": 1, "focus": "...", "tasks": ["task1", "task2"]}
  ]
}

Candidate's Resume: ${resume}
Candidate's Self-Description: ${selfDescription}
Job Description: ${jobDescription}`

  const response = await ai.models.generateContent({
    model:"gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: interviewSchema
    }
  })

  console.log("=== AI Service Raw Response ===");
  console.log("Raw text length:", response.text.length);
  console.log("Raw text preview:", response.text.substring(0, 500));
  
  let parsedResponse = JSON.parse(response.text);
  console.log("Parsed response keys:", Object.keys(parsedResponse));
  console.log("Technical questions count:", parsedResponse.technicalQuestions?.length || 0);
  console.log("First technical question:", JSON.stringify(parsedResponse.technicalQuestions?.[0], null, 2));
  
  return {
    matchScore: parsedResponse.matchScore || 0,
    technicalQuestions: parsedResponse.technicalQuestions || [],
    behavioralQuestions: parsedResponse.behavioralQuestions || [],
    skillGaps: parsedResponse.skillGaps || [],
    preparationPlan: parsedResponse.preparationPlan || []
  };
}

module.exports = generateInterviewReport