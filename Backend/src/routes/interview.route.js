const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const upload = require("../middlewares/file.middleware")
const interviewRouter = express.Router()
const interviewController = require("../controllers/interview.controller")

// Simple test route that returns mock data
interviewRouter.post("/mock", (req, res) => {
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

interviewRouter.post("/", authMiddleware.authUser, upload.single('resume'), interviewController.generateInterviewReportController)

interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)

interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)

interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)


module.exports = interviewRouter;