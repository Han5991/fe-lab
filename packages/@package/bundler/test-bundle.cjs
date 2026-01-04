const bundle = require('./dist/bundle.cjs');

console.log('\n📦 [Library Mode Test]');
console.log('--------------------------------');

// 1. 번들 파일이 내보낸(export) 값 확인
console.log('Exported:', bundle);

// 2. 실제로 값을 잘 가져왔는지 검증
if (bundle.name === 'Universe') {
  console.log('✅ Success: name 모듈의 값을 정확히 가져왔습니다.');
} else {
  console.error('❌ Failed: name 값이 다릅니다.');
}

console.log('--------------------------------\n');
