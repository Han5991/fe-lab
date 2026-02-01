import { name } from './dist/bundle.mjs';
import * as bundle from './dist/bundle.mjs';

console.log('\n📦 [ESM Mode Test]');
console.log('--------------------------------');

// 1. Named Import 확인
console.log('Imported name:', name);

if (name === 'Universe') {
  console.log('✅ Success: Named Import가 정상 작동합니다.');
} else {
  console.error('❌ Failed: name 값이 다릅니다.');
}

// 2. Module Namespace 확인
console.log('Namespace keys:', Object.keys(bundle));

if ('name' in bundle) {
  console.log('✅ Success: Namespace Import도 정상 작동합니다.');
}

console.log('--------------------------------\n');
