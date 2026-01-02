import path from 'node:path';
import { Module } from './Module.js';

/**
 * 전체 모듈 그래프를 관리하는 클래스
 */
export class Graph {
  entryPath: string;
  modules: Map<string, Module>;

  constructor(entryPath: string) {
    this.entryPath = entryPath;
    this.modules = new Map();
  }

  build() {
    this.createModule(this.entryPath);
  }

  createModule(filePath: string): Module {
    // 1. 이미 방문한 파일이면 스킵
    if (this.modules.has(filePath)) {
      return this.modules.get(filePath)!;
    }

    // 2. 새로운 모듈 생성 및 파싱
    console.log(`📂 Processing: ${filePath}`);
    const module = new Module(filePath);
    module.init();

    // 3. 맵에 등록
    this.modules.set(filePath, module);

    // 4. 의존성 재귀 탐색
    module.dependencies.forEach(importPath => {
      const absolutePath = this.resolve(importPath, filePath);
      this.createModule(absolutePath);
    });

    return module;
  }

  resolve(importPath: string, importer: string): string {
    const baseDir = path.dirname(importer);
    // TODO: 확장자 처리 로직 추가 필요 (.js, .ts 등)
    return path.resolve(baseDir, importPath);
  }
}
