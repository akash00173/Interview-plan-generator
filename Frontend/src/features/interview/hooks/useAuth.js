import { useContext, useEffect } from "react";
import { AuthContext } from "../../auth/auth.context";
import { login, register, logout, getMe } from "../../auth/services/auth.api"

export const useAuth = () => {
  const { user, setUser, loading, setLoading } = useContext(AuthContext)

  const handleLogin = async ({ email, password }) => {
    setLoading(true)
    try {
      console.log("useAuth: Attempting login for", email)
      const data = await login({ email, password })
      console.log("useAuth: Login response:", data)
      if (data.user) {
        setUser(data.user)
      }
      return data
    } catch (err) { 
      console.error("useAuth Login error:", err.response?.data || err.message)
      throw err
    }
    finally { setLoading(false) }
  }

  const handleRegister = async ({ username, email, password }) => {
    setLoading(true)
    try {
      console.log("useAuth: Attempting register for", email)
      const data = await register({ username, email, password })
      console.log("useAuth: Register response:", data)
      if (data.user) {
        setUser(data.user)
      }
      return data
    } catch (err) { 
      console.error("useAuth Register error:", err.response?.data || err.message)
      throw err
    }
    finally { setLoading(false) }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout()
      setUser(null)
    } catch (err) { 
      console.error("useAuth Logout error:", err)
    }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const getAndSetUser = async () => {
      try {
        console.log("useAuth: Checking existing session...")
        const data = await getMe()
        console.log("useAuth: getMe response:", data)
        if (data.user) {
          setUser(data.user)
        }
      } catch (err) { 
        console.log("useAuth: No session (expected):", err.response?.status)
        setUser(null); 
      } finally {
        setLoading(false)
      }

    }
    getAndSetUser()
  }, [])

  return {
    user,
    loading,
    handleLogin,
    handleRegister,
    handleLogout
  }
}