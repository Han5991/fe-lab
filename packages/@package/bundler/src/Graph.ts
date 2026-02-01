import path from 'node:path';
import fs from 'node:fs';
import MagicString, { Bundle } from 'magic-string';
import { Module } from './Module.js';

/**
 * 전체 모듈 그래프를 관리하는 클래스
 */
export class Graph {
  entryPath: string;
  modules: Map<string, Module>;
  externals: string[];
  private nextId = 0;

  constructor(entryPath: string, externals: string[] = []) {
    this.entryPath = entryPath;
    this.modules = new Map();
    this.externals = externals;
  }

  build() {
    this.createModule(this.entryPath);
  }

  createModule(filePath: string): Module | null {
    // 1. External 체크
    if (this.isExternal(filePath)) {
      return null;
    }

    if (this.modules.has(filePath)) {
      return this.modules.get(filePath)!;
    }

    console.log(`📂 Processing: ${filePath}`);
    const module = new Module(this.nextId++, filePath);
    module.init();

    this.modules.set(filePath, module);

    module.dependencies.forEach(importPath => {
      // External이면 Resolve를 건너뛰고 importPath 그대로 사용
      if (this.isExternal(importPath)) {
        module.mapping.set(importPath, importPath);
      } else {
        const absolutePath = this.resolve(importPath, filePath);
        const childModule = this.createModule(absolutePath);

        if (childModule) {
          module.mapping.set(importPath, childModule.id);
        }
      }
    });

    return module;
  }

  isExternal(id: string): boolean {
    return this.externals.some(ext => id === ext || id.startsWith(`${ext}/`));
  }

  resolve(importPath: string, importer: string): string {
    const baseDir = path.dirname(importer);
    // 간단한 확장자 처리
    let fullPath = path.resolve(baseDir, importPath);
    if (!fullPath.endsWith('.js')) fullPath += '.js';
    return fullPath;
  }

  /**
   * 최종 번들 생성
   */
  generate(): string {
    // 1. 모든 모듈 변환
    this.modules.forEach(module => module.transform());

    // 2. MagicString.Bundle을 사용해 소스맵과 함께 모듈 합치기
    const bundle = new Bundle({
      separator: '\n',
    });

    const entryModule = this.modules.get(this.entryPath)!;

    // 번들 래퍼 시작 부분
    const wrapperStart = `
(function(modules, externalRequire) {
  const cache = {};

  function require(id) {
    if (cache[id]) return cache[id].exports;

    // 모듈 맵에 id가 없으면 외부 require를 시도 (Externals 지원)
    if (!modules[id]) {
       if (externalRequire) {
         return externalRequire(id);
       }
       throw new Error('Cannot find module \\'' + id + '\\'');
    }

    const module = { exports: {} };
    cache[id] = module;

    // 모듈 실행
    modules[id](require, module, module.exports);

    return module.exports;
  }

  // 엔트리 포인트 실행 및 결과 반환
  const entryExports = require(${entryModule.id});

  // CommonJS 환경 지원 (Node.js) & 결과 반환
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = entryExports;
  }
  return entryExports;
})({`;

    bundle.addSource({
      content: new MagicString(wrapperStart),
    });

    this.modules.forEach(module => {
      bundle.addSource({
        content: new MagicString(
          `  ${module.id}: function(require, module, exports) {`,
        ),
      });

      bundle.addSource({
        filename: path.relative(process.cwd(), module.filePath),
        content: module.magicString,
        separator: '\n',
      });

      bundle.addSource({
        content: new MagicString(`\n  },`),
      });
    });

    // 번들 래퍼 끝 부분
    const wrapperEnd = `
}, typeof require !== 'undefined' ? require : null);
`;
    bundle.addSource({
      content: new MagicString(wrapperEnd),
    });

    // 4. 파일 저장
    const distDir = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

    const code = bundle.toString();
    const map = bundle.generateMap({
      file: 'index.js.map', // 파일명 변경
      includeContent: true,
      hires: true,
    });

    // [CJS] index.js 생성 (bundle.cjs -> index.js)
    fs.writeFileSync(path.join(distDir, 'index.js'), code);
    fs.writeFileSync(path.join(distDir, 'index.js.map'), map.toString());

    // 소스맵 주석 추가
    fs.appendFileSync(
      path.join(distDir, 'index.js'),
      '\n//# sourceMappingURL=index.js.map',
    );

    console.log('📦 Generated CJS Bundle: dist/index.js');
    console.log('🗺️  Generated SourceMap: dist/index.js.map');

    // [ESM] index.mjs 생성
    this.generateStandaloneESM(distDir, code);

    return code;
  }

  /**
   * 엔트리 포인트의 모든 Export 이름을 재귀적으로 수집
   */
  private getEntryExports(
    module: Module,
    visited = new Set<number>(),
  ): Set<string> {
    if (visited.has(module.id)) return new Set();
    visited.add(module.id);

    const exports = new Set(module.exportsList);

    // export * from './foo' 처리
    module.exportAllSources.forEach(source => {
      const depId = module.mapping.get(source);
      // depId가 number인 경우에만 탐색 (External은 탐색 불가)
      if (typeof depId === 'number') {
        const depPath = this.getModulePathById(depId);
        if (depPath) {
          const depModule = this.modules.get(depPath);
          if (depModule) {
            const childExports = this.getEntryExports(depModule, visited);
            childExports.forEach(name => {
              if (name !== 'default') exports.add(name);
            });
          }
        }
      }
    });

    return exports;
  }

  private getModulePathById(id: number): string | undefined {
    for (const [path, module] of this.modules.entries()) {
      if (module.id === id) return path;
    }
    return undefined;
  }

  private generateStandaloneESM(distDir: string, bundleContent: string) {
    const entryModule = this.modules.get(this.entryPath)!;
    const allExports = this.getEntryExports(entryModule);

    // 1. 번들 코드를 변수에 할당 (IIFE 결과 캡처)
    let mjsContent = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __bundle_result__ = ${bundleContent}
`;

    // 2. Default Export 처리
    if (allExports.has('default')) {
      mjsContent += `export default __bundle_result__.default;\n`;
      allExports.delete('default');
    }

    // 3. Named Exports 처리
    if (allExports.size > 0) {
      const names = Array.from(allExports).join(', ');
      mjsContent += `export const { ${names} } = __bundle_result__;\n`;
    }

    fs.writeFileSync(path.join(distDir, 'index.mjs'), mjsContent); // 파일명 변경
    console.log('✨ Generated Standalone ESM: dist/index.mjs');
  }
}
