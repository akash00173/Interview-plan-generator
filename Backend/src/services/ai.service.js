const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY
})

const interviewSchema = {
  type: "OBJECT",
  properties: {
    matchScore: {
      type: "NUMBER",
      description: "A score between 0 and 100"
    },
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

function getMockReport() {
  return {
    matchScore: 75,
    technicalQuestions: [
      { question: "Explain the difference between var, let, and const in JavaScript", intention: "Test JavaScript fundamentals", answer: "var is function-scoped, let and const are block-scoped. const is immutable." },
      { question: "What is React Virtual DOM?", intention: "Test React knowledge", answer: "Virtual DOM is a lightweight copy of actual DOM for efficient updates." },
      { question: "Explain REST API methods", intention: "Test API knowledge", answer: "GET=read, POST=create, PUT=update, DELETE=delete" },
      { question: "What is SQL vs NoSQL?", intention: "Test database knowledge", answer: "SQL=relational, NoSQL=non-relational/document-based" },
      { question: "Explain async/await in JavaScript", intention: "Test async programming", answer: "Syntax for handling Promises in a synchronous-looking way" }
    ],
    behavioralQuestions: [
      { question: "Tell me about yourself", intention: "Self-presentation", answer: "Brief professional summary" },
      { question: "Why do you want to work here?", intention: "Motivation", answer: "Company alignment and interest" },
      { question: "Describe a challenging project", intention: "Problem-solving", answer: "STAR method response" },
      { question: "Where do you see yourself in 5 years?", intention: "Career goals", answer: "Growth and contribution" },
      { question: "What are your strengths?", intention: "Self-awareness", answer: "Relevant technical and soft skills" }
    ],
    skillGaps: [
      { skill: "System Design", severity: "Medium" },
      { skill: "Cloud Services", severity: "Medium" }
    ],
    preparationPlan: [
      { day: 1, focus: "JavaScript Fundamentals", tasks: ["Review var/let/const", "Practice closures", "Understand prototypes"] },
      { day: 2, focus: "React Deep Dive", tasks: ["Study hooks", "Practice state management", "Build small component"] },
      { day: 3, focus: "API & Database", tasks: ["Build REST API", "Practice SQL queries", "Learn MongoDB"] },
      { day: 4, focus: "System Design Basics", tasks: ["Study scalability", "Learn caching", "Understand CDNs"] },
      { day: 5, focus: "Mock Interviews", tasks: ["Practice coding problems", "Do behavioral prep", "Review weak areas"] }
    ]
  };
}

async function generateInterviewReport({resume, selfDescription, jobDescription}){

  const prompt = `Generate interview preparation report. Return JSON with matchScore, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan. 

Job: ${jobDescription}
Resume: ${resume}
Self: ${selfDescription}`;

  console.log("=== Generating Interview Report ===");
  console.log("Job:", jobDescription.substring(0, 100));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: interviewSchema
      }
    });

    const parsedResponse = JSON.parse(response.text);
    
    return {
      matchScore: parsedResponse.matchScore || 0,
      technicalQuestions: parsedResponse.technicalQuestions || [],
      behavioralQuestions: parsedResponse.behavioralQuestions || [],
      skillGaps: parsedResponse.skillGaps || [],
      preparationPlan: parsedResponse.preparationPlan || []
    };
  } catch (error) {
    console.log("AI Error, using mock data:", error.message);
    return getMockReport();
  }
}

module.exports = generateInterviewReport