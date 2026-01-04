import path from 'node:path';
import fs from 'node:fs';
import { Module } from './Module.js';

/**
 * 전체 모듈 그래프를 관리하는 클래스
 */
export class Graph {
  entryPath: string;
  modules: Map<string, Module>;
  private nextId = 0;

  constructor(entryPath: string) {
    this.entryPath = entryPath;
    this.modules = new Map();
  }

  build() {
    this.createModule(this.entryPath);
  }

  createModule(filePath: string): Module {
    if (this.modules.has(filePath)) {
      return this.modules.get(filePath)!;
    }

    console.log(`📂 Processing: ${filePath}`);
    const module = new Module(this.nextId++, filePath);
    module.init();

    this.modules.set(filePath, module);

    module.dependencies.forEach(importPath => {
      const absolutePath = this.resolve(importPath, filePath);
      const childModule = this.createModule(absolutePath);
      module.mapping.set(importPath, childModule.id);
    });

    return module;
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

    // 2. 모듈 객체 문자열 생성
    let modulesStr = '';
    this.modules.forEach(module => {
      modulesStr += `
  ${module.id}: function(require, module, exports) {
${module.magicString.toString()}
  },`;
    });

    // 3. 최종 번들 템플릿 (IIFE)
    const entryModule = this.modules.get(this.entryPath)!;
    const bundle = `
(function(modules) {
  const cache = {};

  function require(id) {
    if (cache[id]) return cache[id].exports;

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
      })({${modulesStr}
      });
      `;
      
          // 4. 파일 저장
          const distDir = path.resolve(process.cwd(), 'dist');
          if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
      
          // [CJS] bundle.cjs 생성 (Standalone)
          fs.writeFileSync(path.join(distDir, 'bundle.cjs'), bundle);
          console.log('📦 Generated CJS Bundle: dist/bundle.cjs');
      
          // [ESM] bundle.mjs 생성 (Standalone)
          this.generateStandaloneESM(distDir, bundle);
      
          return bundle;
        }
      
        /**
         * 엔트리 포인트의 모든 Export 이름을 재귀적으로 수집
         */
        private getEntryExports(module: Module, visited = new Set<number>()): Set<string> {
          if (visited.has(module.id)) return new Set();
          visited.add(module.id);
      
          const exports = new Set(module.exportsList);
      
          // export * from './foo' 처리
          module.exportAllSources.forEach(source => {
            const depId = module.mapping.get(source);
            if (depId !== undefined) {
              const depModule = this.modules.get(this.getModulePathById(depId)!);
              if (depModule) {
                const childExports = this.getEntryExports(depModule, visited);
                childExports.forEach(name => {
                   if (name !== 'default') exports.add(name); 
                });
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
          // 기존 bundleContent는 세미콜론으로 끝나거나 줄바꿈으로 끝남.
          // 안전하게 변수에 담기 위해 약간의 트릭을 씁니다.
          let mjsContent = `
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
      
          fs.writeFileSync(path.join(distDir, 'bundle.mjs'), mjsContent);
          console.log('✨ Generated Standalone ESM: dist/bundle.mjs');
        }
      }
