import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import mime from 'mime-types';

export async function GET(request: NextRequest) {
  // 개발 모드에서만 동작하도록 제한
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const imagePath = searchParams.get('path');

  if (!imagePath) {
    return new NextResponse('Path is required', { status: 400 });
  }

  // 보안: 상위 디렉토리 접근 방지 (../../ 등)
  const safePath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, '');

  // apps/blog/posts 디렉토리를 기준으로 설정
  // process.cwd()는 apps/blog/web 이므로 ../posts 로 접근
  const postsDir = path.join(process.cwd(), '../posts');
  const fullPath = path.join(postsDir, safePath);

  try {
    if (!fs.existsSync(fullPath)) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const contentType = mime.lookup(fullPath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving local image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
