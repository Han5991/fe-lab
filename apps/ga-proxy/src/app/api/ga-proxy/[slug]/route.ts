import { NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'

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
      
      // 추가 분석 데이터
      browser_name?: string
      browser_version?: string
      operating_system?: string
      device_category?: string
      language?: string
      post_category?: string
      estimated_read_time?: number
      visit_hour?: number
      visit_day_of_week?: number
    }
  }>
}

const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

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
    
    // HTTP 헤더에서 추가 정보 수집
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer')
    const acceptLanguage = request.headers.get('accept-language') || ''
    
    // User-Agent 파싱
    const parser = new UAParser(userAgent)
    const browserInfo = parser.getBrowser()
    const osInfo = parser.getOS()
    const deviceInfo = parser.getDevice()
    
    const pageLocation = `https://velog.io/@rewq5991/${slug}`
    const pageTitle = slugToTitle(slug)
    const now = new Date()
    
    const gaEvent: GAEvent = {
      client_id: clientId,
      events: [{
        name: 'page_view',
        params: {
          page_location: pageLocation,
          page_title: pageTitle,
          page_referrer: referer || undefined,
          engagement_time_msec: 1,
          session_id: sessionId,
          
          // 풍부한 사용자 정보
          browser_name: browserInfo.name || undefined,
          browser_version: browserInfo.version || undefined,
          operating_system: osInfo.name || undefined,
          device_category: getDeviceCategory(deviceInfo.type),
          language: parseLanguage(acceptLanguage),
          post_category: extractCategory(slug),
          estimated_read_time: estimateReadTime(slug),
          visit_hour: now.getHours(),
          visit_day_of_week: now.getDay()
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

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getDeviceCategory(deviceType?: string): string {
  if (!deviceType) return 'desktop'
  if (deviceType === 'mobile') return 'mobile'
  if (deviceType === 'tablet') return 'tablet'
  return 'desktop'
}

function parseLanguage(acceptLanguage: string): string {
  if (!acceptLanguage) return 'ko'
  const primaryLang = acceptLanguage.split(',')[0].split('-')[0]
  return primaryLang || 'ko'
}

function extractCategory(slug: string): string {
  // 슬러그에서 카테고리 추출 (첫 번째 단어 기준)
  const firstWord = slug.split('-')[0].toLowerCase()
  
  const categoryMap: { [key: string]: string } = {
    'react': 'React',
    'nextjs': 'Next.js', 
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'css': 'CSS',
    'html': 'HTML',
    'node': 'Node.js',
    'vue': 'Vue.js',
    'angular': 'Angular'
  }
  
  return categoryMap[firstWord] || 'General'
}

function estimateReadTime(slug: string): number {
  // 슬러그 길이 기반 읽기 시간 추정 (매우 단순)
  const words = slug.split('-').length
  return Math.max(2, Math.min(10, Math.ceil(words / 2))) // 2-10분
}