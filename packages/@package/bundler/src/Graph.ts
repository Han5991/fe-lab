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
    this.modules.forEach((module, filePath) => {
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

  // 엔트리 포인트 실행
  require(${entryModule.id});
})({${modulesStr}
});
`;

    // 4. 파일 저장
    const distDir = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
    fs.writeFileSync(path.join(distDir, 'bundle.js'), bundle);

    return bundle;
  }
}
