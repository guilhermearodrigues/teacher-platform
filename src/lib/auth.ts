import { supabase } from './supabase'

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
}

export class AuthService {
  private static instance: AuthService
  private refreshPromise: Promise<AuthTokens> | null = null

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async getValidAccessToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      if (!session) {
        return null
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0

      if (expiresAt - now < 300) {
        return await this.refreshAccessToken()
      }

      return session.access_token
    } catch (error) {
      console.error('Error getting valid access token:', error)
      return null
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      try {
        const tokens = await this.refreshPromise
        return tokens.access_token
      } catch (error) {
        this.refreshPromise = null
        throw error
      }
    }

    this.refreshPromise = this.performTokenRefresh()

    try {
      const tokens = await this.refreshPromise
      return tokens.access_token
    } catch (error) {
      console.error('Token refresh failed:', error)
      return null
    } finally {
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    const { data, error } = await supabase.auth.refreshSession()

    if (error || !data.session) {
      throw new Error(`Token refresh failed: ${error?.message || 'No session'}`)
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      return payload.exp < now
    } catch (error) {
      console.error('Error parsing token:', error)
      return true
    }
  }

  getTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]))
    } catch (error) {
      console.error('Error parsing token payload:', error)
      return null
    }
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getValidAccessToken()

    if (!token) {
      throw new Error('No valid access token available')
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  async signOut(): Promise<void> {
    this.refreshPromise = null
    await supabase.auth.signOut()
  }
}

export const authService = AuthService.getInstance()