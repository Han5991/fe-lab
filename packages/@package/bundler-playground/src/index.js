import { Button } from '@package/sample-lib';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

console.log('🧪 Bundler Playground: Consumer Mode');

try {
  // 1. 라이브러리에서 가져온 컴포넌트 확인
  console.log('1. Importing Button from @package/sample-lib...');
  if (typeof Button !== 'function') {
    throw new Error('Button is not a function! Check named exports.');
  }

  // 2. 렌더링 테스트 (React + Library Integration)
  console.log('2. Rendering Button...');
  const html = renderToStaticMarkup(React.createElement(Button));
  console.log('🖼️ Rendered HTML:', html);

  if (html === '<button>Click me</button>') {
    console.log('🎉 Test PASSED: Externals working correctly!');
  } else {
    throw new Error(
      `HTML mismatch. Expected "<button>Click me</button>", got "${html}"`,
    );
  }
} catch (err) {
  console.error('❌ Test FAILED:', err);
  process.exit(1);
}
