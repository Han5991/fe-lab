import fs from 'node:fs';
import * as acorn from 'acorn';
import MagicString from 'magic-string';

/**
 * 파일 하나를 담당하는 클래스
 */
export class Module {
  filePath: string;
  content: string;
  ast: acorn.Node;
  magicString: MagicString;
  dependencies: string[];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.ast = acorn.parse(this.content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
    this.magicString = new MagicString(this.content);
    this.dependencies = [];
  }

  init() {
    // acorn의 타입 정의가 런타임 객체와 완벽히 일치하지 않을 수 있어 타입 단언 사용
    // @ts-ignore: acorn AST types are complex
    this.ast.body.forEach((node: any) => {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        this.dependencies.push(source);
      }
    });
  }
}
