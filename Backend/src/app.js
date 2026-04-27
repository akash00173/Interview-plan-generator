const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(cors({
  origin: function(origin, callback) {
    return callback(null, true)
  },
  credentials: true
}))

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Simple test route
app.post("/api/test-interview", express.json(), (req, res) => {
  res.json({
    message: "Mock report generated",
    interviewReport: {
      _id: "mock123",
      title: "Test Position",
      matchScore: 75,
      technicalQuestions: [
        { question: "What is React?", intention: "Test basic knowledge", answer: "It's a UI library" }
      ],
      behavioralQuestions: [],
      skillGaps: [],
      preparationPlan: []
    }
  })
})

const authRouter = require("./routes/auth.routes")

const interviewRouter = require("./routes/interview.route")

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports = app;