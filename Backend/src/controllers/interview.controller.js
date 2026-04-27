const pdfParse = require('pdf-parse');
const generateInterviewReport = require("../services/ai.service")
const InterviewReportModel = require("../models/interviewReport.model")

async function generateInterviewReportController(req, res) {
  try {
    let resumeText = "";
    
    // Parse PDF if uploaded
    if (req.file) {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text;
    }

    const { selfDescription, jobDescription, title } = req.body;

    console.log("=== DEBUG INFO ===");
    console.log("Resume text length:", resumeText?.length || 0);
    console.log("Resume text preview:", resumeText?.substring(0, 200) || "none");
    console.log("selfDescription:", selfDescription);
    console.log("jobDescription:", jobDescription);
    console.log("title:", title);

    // Must have either resume or selfDescription
    if (!resumeText && !selfDescription) {
      return res.status(400).json({ 
        message: "Either resume file or self-description is required" 
      });
    }

    if (!jobDescription) {
      return res.status(400).json({ 
        message: "Job description is required" 
      });
    }

    // Use selfDescription as fallback if no resume
    const candidateInfo = resumeText || selfDescription;

    console.log("Calling AI service with candidate info length:", candidateInfo.length);
    const interviewReportByAi = await generateInterviewReport({
      resume: candidateInfo,
      selfDescription: candidateInfo,
      jobDescription
    });

    console.log("AI Response received:");
    console.log(JSON.stringify(interviewReportByAi, null, 2));

    const interviewReport = await InterviewReportModel.create({
      user: req.user.id,
      resume: resumeText,
      selfDescription,
      jobDescription,
      title: title || "Untitled Position",
      matchScore: interviewReportByAi.matchScore,
      technicalQuestions: interviewReportByAi.technicalQuestions || [],
      behavioralQuestions: interviewReportByAi.behavioralQuestions || [],
      skillGaps: interviewReportByAi.skillGaps || [],
      preparationPlan: interviewReportByAi.preparationPlan || []
    });

    res.status(201).json({
      message: "Interview report generated successfully",
      interviewReport
    });
  } catch (error) {
    console.error("Error generating interview report:", error);
    res.status(500).json({ 
      message: "Failed to generate interview report", 
      error: error.message 
    });
  }
}

async function getInterviewReportByIdController(req, res){
  const {interviewId} = req.params

  const interviewReport = await InterviewReportModel.findOne({_id: interviewId, user: req.user.id})
  if(!interviewReport){
    return res.status(404).json({message: "Interview report not found"})
  }
  res.status(200).json({message:"Interview Report generated successfully",  interviewReport})
}

async function getAllInterviewReportsController(req, res){
  const interviewReports = await InterviewReportModel.find({user: req.user.id}).sort({createdAt: -1}).select("-resume -selfDescription -jobDescription")
  res.status(200).json({message: "Interview reports retrieved successfully", interviewReports})
}

async function generateResumePdfController(req, res) {
  try {
    const { interviewReportId } = req.params
    const interviewReport = await InterviewReportModel.findById(interviewReportId)
    
    if (!interviewReport) {
      return res.status(404).json({ message: "Interview report not found" })
    }
    
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument()
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=interview_plan_${interviewReportId}.pdf`)
    
    doc.pipe(res)
    
    doc.fontSize(20).text('Interview Preparation Plan', { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).text(`Match Score: ${interviewReport.matchScore}%`)
    doc.moveDown()
    
    doc.fontSize(16).text('Technical Questions:')
    doc.fontSize(12)
    interviewReport.technicalQuestions.forEach((q, i) => {
      doc.text(`${i + 1}. ${q.question}`)
      doc.text(`   Intent: ${q.intention}`)
      doc.text(`   Answer: ${q.answer}`)
      doc.moveDown(0.5)
    })
    
    doc.moveDown()
    doc.fontSize(16).text('Behavioral Questions:')
    doc.fontSize(12)
    interviewReport.behavioralQuestions.forEach((q, i) => {
      doc.text(`${i + 1}. ${q.question}`)
      doc.text(`   Intent: ${q.intention}`)
      doc.text(`   Answer: ${q.answer}`)
      doc.moveDown(0.5)
    })
    
    doc.moveDown()
    doc.fontSize(16).text('Skill Gaps:')
    doc.fontSize(12)
    interviewReport.skillGaps.forEach((gap) => {
      doc.text(`- ${gap.skill} (${gap.severity})`)
    })
    
    doc.moveDown()
    doc.fontSize(16).text('Preparation Plan:')
    doc.fontSize(12)
    interviewReport.preparationPlan.forEach((day) => {
      doc.text(`Day ${day.day}: ${day.focus}`)
      day.tasks.forEach((task) => {
        doc.text(`  - ${task}`)
      })
      doc.moveDown(0.5)
    })
    
    doc.end()
  } catch (error) {
    console.error("Error generating PDF:", error)
    res.status(500).json({ message: "Failed to generate PDF", error: error.message })
  }
}

module.exports = {
  generateInterviewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController
}