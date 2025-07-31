import { NextApiRequest, NextApiResponse } from 'next'

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tid, host, page, title, referrer } = req.query

  if (!tid || !host || !page) {
    console.warn('Missing required parameters:', { tid: !!tid, host: !!host, page: !!page })
    return res
      .status(200)
      .setHeader('Content-Type', 'image/png')
      .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .setHeader('Access-Control-Allow-Origin', '*')
      .send(TRANSPARENT_PIXEL)
  }

  try {
    const measurementId = process.env.GA_MEASUREMENT_ID
    const apiSecret = process.env.GA_API_SECRET

    if (!measurementId || !apiSecret) {
      console.error('GA environment variables not configured')
      return res
        .status(200)
        .setHeader('Content-Type', 'image/png')
        .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        .setHeader('Access-Control-Allow-Origin', '*')
        .send(TRANSPARENT_PIXEL)
    }

    const clientId = generateClientId(req)
    const sessionId = generateSessionId()
    
    const pageLocation = `https://${host}${page}`
    
    const gaEvent: GAEvent = {
      client_id: clientId,
      events: [{
        name: 'page_view',
        params: {
          page_location: pageLocation,
          page_title: typeof title === 'string' ? title : undefined,
          page_referrer: typeof referrer === 'string' ? referrer : undefined,
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

  return res
    .status(200)
    .setHeader('Content-Type', 'image/png')
    .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .send(TRANSPARENT_PIXEL)
}

function generateClientId(req: NextApiRequest): string {
  const userAgent = req.headers['user-agent'] || ''
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || ''
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