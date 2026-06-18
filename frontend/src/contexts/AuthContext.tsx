'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      setIsLoading(false)

      // Silent background validation
      api.get('/user')
        .then((res) => {
          const userData = res.data.data ?? res.data
          setUser(userData)
          localStorage.setItem('auth_user', JSON.stringify(userData))
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          setToken(null)
          setUser(null)
          setIsLoading(true) // Force redirect since token is invalid
        })
    } else if (savedToken) {
      // Fallback if token exists but no cached user details
      setToken(savedToken)
      api.get('/user')
        .then((res) => {
          const userData = res.data.data ?? res.data
          setUser(userData)
          localStorage.setItem('auth_user', JSON.stringify(userData))
          setIsLoading(false)
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
          setToken(null)
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setToken(null)
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
