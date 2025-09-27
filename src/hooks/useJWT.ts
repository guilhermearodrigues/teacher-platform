import { useState, useEffect, useCallback } from 'react'
import { authService } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'

interface UseJWTReturn {
  accessToken: string | null
  isTokenValid: boolean
  refreshToken: () => Promise<void>
  makeAuthRequest: (url: string, options?: RequestInit) => Promise<Response>
  tokenPayload: any
  isLoading: boolean
}

export const useJWT = (): UseJWTReturn => {
  const { session, isAuthenticated } = useAuth()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [tokenPayload, setTokenPayload] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const updateTokenInfo = useCallback((token: string | null) => {
    setAccessToken(token)

    if (token) {
      const isExpired = authService.isTokenExpired(token)
      setIsTokenValid(!isExpired)

      const payload = authService.getTokenPayload(token)
      setTokenPayload(payload)
    } else {
      setIsTokenValid(false)
      setTokenPayload(null)
    }
  }, [])

  useEffect(() => {
    if (session?.access_token) {
      updateTokenInfo(session.access_token)
    } else {
      updateTokenInfo(null)
    }
  }, [session, updateTokenInfo])

  const refreshToken = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    try {
      const newToken = await authService.getValidAccessToken()
      updateTokenInfo(newToken)
    } catch (error) {
      console.error('Token refresh failed:', error)
      updateTokenInfo(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, updateTokenInfo])

  const makeAuthRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    setIsLoading(true)
    try {
      return await authService.makeAuthenticatedRequest(url, options)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isTokenValid && isAuthenticated && accessToken) {
      refreshToken().catch(console.error)
    }
  }, [isTokenValid, isAuthenticated, accessToken, refreshToken])

  return {
    accessToken,
    isTokenValid,
    refreshToken,
    makeAuthRequest,
    tokenPayload,
    isLoading
  }
}