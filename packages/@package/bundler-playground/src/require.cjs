// CommonJS 소비자 경로: exports의 "require" 조건 → dist/index.js(CJS 번들)
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Button, plus } = require('@package/sample-lib');

console.log('🧪 Bundler Playground: CommonJS Consumer Mode');

assert.equal(plus(1, 2), 3);
assert.equal(
  renderToStaticMarkup(React.createElement(Button)),
  '<button>Click me</button>',
);

console.log('🎉 Test PASSED: require() loads the CJS bundle');
