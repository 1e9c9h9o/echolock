import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Mock logout - just return success
  return NextResponse.json({
    message: 'Logout successful'
  })
}
