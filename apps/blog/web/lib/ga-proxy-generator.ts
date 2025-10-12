interface GAProxyOptions {
  host: string
  page: string
  title?: string
  referrer?: string
  baseUrl?: string
}

export function generateVelogTrackingImage(options: GAProxyOptions): string {
  const { host, page, title, referrer, baseUrl = 'https://your-blog.com' } = options
  
  const params = new URLSearchParams({
    tid: 'velog',
    host: encodeURIComponent(host),
    page: encodeURIComponent(page),
  })
  
  if (title) {
    params.append('title', encodeURIComponent(title))
  }
  
  if (referrer) {
    params.append('referrer', encodeURIComponent(referrer))
  }
  
  return `${baseUrl}/api/ga-proxy?${params.toString()}`
}

export function generateVelogMarkdown(options: GAProxyOptions): string {
  const imageUrl = generateVelogTrackingImage(options)
  return `![](${imageUrl})`
}

export function generateMultipleTrackingImages(posts: Array<{
  slug: string
  title: string
  host?: string
}>): Array<{ slug: string; markdown: string; url: string }> {
  return posts.map(post => {
    const options: GAProxyOptions = {
      host: post.host || 'velog.io',
      page: `/posts/${post.slug}`,
      title: post.title
    }
    
    return {
      slug: post.slug,
      markdown: generateVelogMarkdown(options),
      url: generateVelogTrackingImage(options)
    }
  })
}

export function generateTrackingImageFromUrl(fullUrl: string, baseUrl?: string): string {
  try {
    const url = new URL(fullUrl)
    const options: GAProxyOptions = {
      host: url.hostname,
      page: url.pathname + url.search,
      baseUrl
    }
    
    return generateVelogTrackingImage(options)
  } catch (_error) {
    console.error('Invalid URL provided:', fullUrl)
    throw new Error('Invalid URL format')
  }
}

export const GAProxyUtils = {
  generateVelogTrackingImage,
  generateVelogMarkdown,
  generateMultipleTrackingImages,
  generateTrackingImageFromUrl,
  
  examples: {
    basicUsage: () => generateVelogMarkdown({
      host: 'velog.io',
      page: '/posts/my-awesome-post',
      title: 'My Awesome Post'
    }),
    
    withReferrer: () => generateVelogMarkdown({
      host: 'velog.io',
      page: '/posts/typescript-tips',
      title: 'TypeScript Tips and Tricks',
      referrer: 'https://google.com'
    }),
    
    customDomain: () => generateVelogMarkdown({
      host: 'myblog.com',
      page: '/articles/nextjs-guide',
      title: 'Next.js Complete Guide',
      baseUrl: 'https://analytics.myblog.com'
    })
  }
}