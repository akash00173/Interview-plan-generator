import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../../auth/services/interview.api.js"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile, title }) => {
        setLoading(true)
        try {
            const res = await generateInterviewReport({ jobDescription, selfDescription, resumeFile, title })
            console.log("generateReport response:", res)
            const reportData = res.interviewReport || res
            setReport(reportData)
            return reportData
        } catch (error) {
            console.error("generateReport error:", error.response?.data || error.message)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        try {
            const res = await getInterviewReportById(interviewId)
            setReport(res.interviewReport)
            return res.interviewReport
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        try {
            const res = await getAllInterviewReports()
            setReports(res.interviewReports)
            return res.interviewReports
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `interview_plan_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
        }
        catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf }

}