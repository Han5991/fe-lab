import { Newsreader, Noto_Serif_KR, JetBrains_Mono } from 'next/font/google';

export const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const notoSerifKr = Noto_Serif_KR({
  // Noto_Serif_KR의 Next.js subset 타입은 ['latin', 'latin-ext', 'vietnamese',
  // 'cyrillic']만 받고, 한글 자형은 default subset으로 자동 포함됩니다.
  // (Noto Serif "KR"이라 한글이 본 글리프임. latin은 라틴 문자 보조용.)
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});
