import { NextRequest, NextResponse } from 'next/server'
import { users } from '../storage'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // For demo purposes: accept any email/password combo (8+ chars)
    // In production, this would check against a real database
    const accessToken = 'mock_access_token_' + Date.now()
    const refreshToken = 'mock_refresh_token_' + Date.now()

    return NextResponse.json({
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: email,
          email: email
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
