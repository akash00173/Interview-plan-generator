import axios from "axios";

const api = axios.create({
  baseURL: "https://interview-plan-api.onrender.com",
  withCredentials: true
})

api.interceptors.request.use(config => {
  console.log("Full request URL:", config.baseURL + config.url)
  return config
})

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
  console.log("Attempting login to:", "https://interview-plan-api.onrender.com/api/auth/login")
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