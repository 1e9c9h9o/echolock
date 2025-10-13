// Shared in-memory user storage for mock auth
export const users = new Map<string, { email: string; password: string }>()

// Pre-populate with a demo user
users.set('demo@echolock.xyz', {
  email: 'demo@echolock.xyz',
  password: 'password123'
})
