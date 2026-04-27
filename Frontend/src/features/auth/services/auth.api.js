import axios from "axios";

const api = axios.create({
  baseURL: "https://interview-plan-api.onrender.com",
  withCredentials: true
})

console.log("Full login URL:", "https://interview-plan-api.onrender.com/api/auth/login")

export async function register({username, email, password}) {
  console.log("Calling register API...")
  const response = await api.post("/api/auth/register", {
    username,
    email,
    password
  })
  return response.data
}

export async function login({email, password}) {
  console.log("Calling login API with:", {email})
  const response = await api.post("/api/auth/login", {
    email,
    password
  })
  return response.data
}

export async function logout() {
  const response = await api.get("/api/auth/logout")
  return response.data
}

export async function getMe() {
  const response = await api.get("/api/auth/get-me")
  return response.data
}