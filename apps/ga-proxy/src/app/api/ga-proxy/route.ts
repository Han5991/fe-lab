import { NextRequest, NextResponse } from 'next/server'

interface GAEvent {
  client_id: string
  events: Array<{
    name: string
    params: {
      page_location: string
      page_title?: string
      page_referrer?: string
      engagement_time_msec: number
      session_id: string
    }
  }>
}

const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || searchParams.get('s')
  const title = searchParams.get('title') || searchParams.get('t')

  if (!slug) {
    console.warn('Missing required slug parameter')
    return new NextResponse(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  try {
    const measurementId = process.env.GA_MEASUREMENT_ID
    const apiSecret = process.env.GA_API_SECRET

    if (!measurementId || !apiSecret) {
      console.error('GA environment variables not configured')
      return new NextResponse(TRANSPARENT_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const clientId = generateClientId(request)
    const sessionId = generateSessionId()
    
    const pageLocation = `https://velog.io/@rewq5991/${slug}`
    
    const gaEvent: GAEvent = {
      client_id: clientId,
      events: [{
        name: 'page_view',
        params: {
          page_location: pageLocation,
          page_title: title || undefined,
          page_referrer: undefined,
          engagement_time_msec: 1,
          session_id: sessionId
        }
      }]
    }

    const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`
    
    const gaResponse = await fetch(gaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gaEvent),
    })

    if (!gaResponse.ok) {
      console.error('GA API error:', gaResponse.status, await gaResponse.text())
    } else {
      console.log('GA event sent successfully:', pageLocation)
    }

  } catch (error) {
    console.error('Error sending GA event:', error)
  }

  return new NextResponse(TRANSPARENT_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function generateClientId(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
  const seed = `${userAgent}${ip}${Date.now()}`
  
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return Math.abs(hash).toString() + '.' + Math.floor(Date.now() / 1000)
}

function generateSessionId(): string {
  return Math.floor(Date.now() / 1000).toString()
}