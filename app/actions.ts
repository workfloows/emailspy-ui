'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

const ENABLE_RATE_LIMITING = false // Toggle session rate limiting

// Number of requests per session
const RATE_LIMIT = 3
// Time window for rate limiting in milliseconds
const RATE_LIMIT_WINDOW = 300 * 1000 // 5 minutes
// Cleanup interval for expired sessions in milliseconds
const CLEANUP_INTERVAL = 3600 * 1000 // 1 hour

interface RateLimitInfo {
  count: number
  timestamp: number
}

const sessionRateLimitMap = new Map<string, RateLimitInfo>()

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [sessionId, info] of Array.from(sessionRateLimitMap.entries())) {
    if (now - info.timestamp > RATE_LIMIT_WINDOW) {
      sessionRateLimitMap.delete(sessionId)
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL)

function checkRateLimit(identifier: string, limitMap: Map<string, RateLimitInfo>): { allowed: boolean; remainingTime?: number } {
  const now = Date.now()
  const rateLimitInfo = limitMap.get(identifier) || { count: 0, timestamp: now }

  if (now - rateLimitInfo.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitInfo.count = 1
    rateLimitInfo.timestamp = now
    limitMap.set(identifier, rateLimitInfo)
    return { allowed: true }
  } else if (rateLimitInfo.count >= RATE_LIMIT) {
    const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - rateLimitInfo.timestamp)) / 60000) // Convert to minutes
    return { allowed: false, remainingTime }
  } else {
    rateLimitInfo.count++
    limitMap.set(identifier, rateLimitInfo)
    return { allowed: true }
  }
}

export async function checkEmails(domain: string) {
  const cookieStore = cookies()
  let sessionId = cookieStore.get('session_id')?.value

  if (!sessionId) {
    sessionId = uuidv4()
    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })
  }

  // Trigger cleanup before checking rate limit
  cleanupExpiredSessions()

  // Check session-based rate limit
  if (ENABLE_RATE_LIMITING) {
    const sessionCheck = checkRateLimit(sessionId, sessionRateLimitMap)
    if (!sessionCheck.allowed) {
      console.log(`Rate limit exceeded for session ID: ${sessionId}`)
      return { error: `Rate limit exceeded. Please try again in ${sessionCheck.remainingTime} minute${sessionCheck.remainingTime !== 1 ? 's' : ''}.` }
    }
  }

  try {
    // Generate a unique callback ID
    const callbackId = uuidv4()

    // Send initial request to n8n
    // Set N8N_INSTANCE_URL in .env file
    // Remember to set webhook in n8n to POST
    // Default webhook path is (if not changed in the workflow): /emailspy-callback
    const response = await fetch(`${process.env.N8N_INSTANCE_URL}/webhook/emailspy-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        callbackId,
        // If developing locally, set to http://localhost:3000/api/email-results/${callbackId}
        // Variable VERCEL_PROJECT_PRODUCTION_URL is set automatically by Vercel
        callbackUrl: `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/email-results/${callbackId}`,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to initiate email check')
    }

    // Return the callbackId to the client
    return { callbackId }
  } catch (error) {
    console.error('Error:', error)
    return { error: 'An error occurred while initiating the email check. Please try again.' }
  }
}

// Function to check the status of the email check
export async function getEmailCheckStatus(callbackId: string) {
  try {
    // If developing locally, set to http://localhost:3000/api/email-results/${callbackId}
    // Variable VERCEL_PROJECT_PRODUCTION_URL is set automatically by Vercel
    const response = await fetch(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/email-results/${callbackId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch email check status')
    }

    const data = await response.json()

    if (data.status === 'completed') {
      revalidatePath('/')
    }

    return data
  } catch (error) {
    console.error('Error:', error)
    return { error: 'An error occurred while fetching email check status. Please try again.' }
  }
}