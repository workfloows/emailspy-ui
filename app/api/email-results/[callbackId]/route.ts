import { NextRequest, NextResponse } from 'next/server'

const results = new Map()

export async function POST(request: NextRequest, { params }: { params: { callbackId: string } }) {
  const { callbackId } = params
  const data = await request.json()

  results.set(callbackId, data)

  return NextResponse.json({ status: 'received' })
}

export async function GET(request: NextRequest, { params }: { params: { callbackId: string } }) {
  const { callbackId } = params

  if (results.has(callbackId)) {
    const data = results.get(callbackId)
    results.delete(callbackId) // Remove the result after retrieving it
    return NextResponse.json({ status: 'completed', data })
  } else {
    return NextResponse.json({ status: 'pending' })
  }
}