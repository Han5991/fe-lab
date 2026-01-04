import fs from 'node:fs';
import * as acorn from 'acorn';
import * as ESTree from 'estree';
import MagicString from 'magic-string';

// 1. 기초 블록: ESTree 노드에 Acorn의 위치 정보를 합침
type AcornNode<T> = T & acorn.Node;

// 2. 고도화된 Program 타입: body 안의 요소들도 모두 AcornNode임을 보장
interface AcornProgram extends AcornNode<ESTree.Program> {
  body: AcornNode<
    ESTree.Statement | ESTree.Directive | ESTree.ModuleDeclaration
  >[];
}

/**
 * Type Guard: 이제 이 함수를 통과하면 body 내부까지 타입을 보장받습니다.
 */
function isProgram(node: acorn.Node): node is AcornProgram {
  return node.type === 'Program';
}

function isAcornSpecificNode<T extends object>(
  node: T,
): node is T & acorn.Node {
  return (
    typeof node === 'object' &&
    node !== null &&
    'start' in node &&
    'end' in node
  );
}

/**
 * 파일 하나를 담당하는 클래스
 */
export class Module {
  id: number;
  filePath: string;
  content: string;
  ast: AcornProgram;
  magicString: MagicString;
  dependencies: string[];
  mapping: Map<string, number> = new Map();

  constructor(id: number, filePath: string) {
    this.id = id;
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');

    const parsed = acorn.parse(this.content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });

    if (!isProgram(parsed)) {
      throw new Error(
        `Failed to parse ${filePath}: AST root is not a Program.`,
      );
    }

    this.ast = parsed;
    this.magicString = new MagicString(this.content);
    this.dependencies = [];
  }

  init() {
    this.ast.body.forEach(node => {
      if (
        (node.type === 'ImportDeclaration' ||
          node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportAllDeclaration') &&
        node.source &&
        typeof node.source.value === 'string'
      ) {
        this.dependencies.push(node.source.value);
      }
    });
  }

  /**
   * ESM 문법을 CommonJS 스타일(require/exports)로 변환
   */
  transform() {
    type Action = (node: AcornProgram['body'][number]) => void;

    const strategies: Record<string, Action> = {
      ImportDeclaration: node =>
        node.type === 'ImportDeclaration' &&
        this.transformImportDeclaration(node),
      ExportNamedDeclaration: node =>
        node.type === 'ExportNamedDeclaration' &&
        this.transformExportNamedDeclaration(node),
      ExportAllDeclaration: node =>
        node.type === 'ExportAllDeclaration' &&
        this.transformExportAllDeclaration(node),
      ExportDefaultDeclaration: node =>
        node.type === 'ExportDefaultDeclaration' &&
        this.transformExportDefaultDeclaration(node),
    };

    this.ast.body.forEach(node => {
      const execute = strategies[node.type];
      if (execute) {
        execute(node);
      }
    });
  }

  private transformImportDeclaration(
    node: AcornNode<ESTree.ImportDeclaration>,
  ) {
    if (typeof node.source.value !== 'string') return;
    const depId = this.mapping.get(node.source.value);

    const defaultSpecifier = node.specifiers.find(
      (s): s is ESTree.ImportDefaultSpecifier =>
        s.type === 'ImportDefaultSpecifier',
    );
    const namespaceSpecifier = node.specifiers.find(
      (s): s is ESTree.ImportNamespaceSpecifier =>
        s.type === 'ImportNamespaceSpecifier',
    );
    const namedSpecifiers = node.specifiers.filter(
      (s): s is ESTree.ImportSpecifier => s.type === 'ImportSpecifier',
    );

    let replacement = '';
    if (namespaceSpecifier) {
      replacement += `const ${namespaceSpecifier.local.name} = require(${depId});\n`;
    } else if (defaultSpecifier || namedSpecifiers.length > 0) {
      if (defaultSpecifier) {
        replacement += `const ${defaultSpecifier.local.name} = require(${depId}).default;\n`;
      }
      if (namedSpecifiers.length > 0) {
        const specifierStr = namedSpecifiers
          .map(s => {
            const importedName = this.getSpecifierName(s.imported);
            const localName = s.local.name;
            return importedName === localName
              ? importedName
              : `${importedName}: ${localName}`;
          })
          .join(', ');
        replacement += `const { ${specifierStr} } = require(${depId});\n`;
      }
    } else {
      // import './file.js' (Side effect)
      replacement += `require(${depId});\n`;
    }

    this.magicString.overwrite(node.start, node.end, replacement);
  }

  private transformExportNamedDeclaration(
    node: AcornNode<ESTree.ExportNamedDeclaration>,
  ) {
    const declaration = node.declaration;

    if (node.source && typeof node.source.value === 'string') {
      // export { a, b } from './file.js';
      const depId = this.mapping.get(node.source.value);
      const specifierStr = node.specifiers
        .map(s => {
          const localName = this.getSpecifierName(s.local);
          const exportedName = this.getSpecifierName(s.exported);
          return `exports.${exportedName} = require(${depId}).${localName};`;
        })
        .join('\n');
      this.magicString.overwrite(node.start, node.end, specifierStr);
    } else if (declaration) {
      this.handleExportDeclaration(node, declaration);
    } else {
      // export { a, b };
      const specifierStr = node.specifiers
        .map(s => {
          const localName = this.getSpecifierName(s.local);
          const exportedName = this.getSpecifierName(s.exported);
          return `exports.${exportedName} = ${localName};`;
        })
        .join('\n');
      this.magicString.overwrite(node.start, node.end, specifierStr);
    }
  }

  private handleExportDeclaration(
    node: AcornNode<ESTree.ExportNamedDeclaration>,
    declaration: ESTree.Declaration,
  ) {
    // export const a = 1;
    // export function a() {}
    if (declaration.type === 'VariableDeclaration') {
      const firstDeclaration = declaration.declarations[0];
      if (
        firstDeclaration.id.type === 'Identifier' &&
        isAcornSpecificNode(declaration)
      ) {
        const name = firstDeclaration.id.name;
        this.magicString.remove(node.start, declaration.start);
        this.magicString.appendLeft(node.end, `\nexports.${name} = ${name};`);
      }
    } else if (
      declaration.type === 'FunctionDeclaration' ||
      declaration.type === 'ClassDeclaration'
    ) {
      if (declaration.id && isAcornSpecificNode(declaration)) {
        const name = declaration.id.name;
        this.magicString.remove(node.start, declaration.start);
        this.magicString.appendLeft(node.end, `\nexports.${name} = ${name};`);
      }
    }
  }

  private transformExportAllDeclaration(
    node: AcornNode<ESTree.ExportAllDeclaration>,
  ) {
    if (typeof node.source.value !== 'string') return;
    const depId = this.mapping.get(node.source.value);
    this.magicString.overwrite(
      node.start,
      node.end,
      `Object.assign(exports, require(${depId}));`,
    );
  }

  private transformExportDefaultDeclaration(
    node: AcornNode<ESTree.ExportDefaultDeclaration>,
  ) {
    const declaration = node.declaration;
    const start = node.start;

    if (
      (declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ClassDeclaration') &&
      declaration.id
    ) {
      // export default function greet() {}
      if (isAcornSpecificNode(declaration)) {
        this.magicString.remove(start, declaration.start);
        this.magicString.appendLeft(
          node.end,
          `\nexports.default = ${declaration.id.name};`,
        );
      }
    } else {
      // export default function() {} OR export default expression;
      if (isAcornSpecificNode(declaration)) {
        this.magicString.overwrite(
          start,
          declaration.start,
          'exports.default = ',
        );
      }
    }
  }

  private getSpecifierName(node: ESTree.Identifier | ESTree.Literal): string {
    return node.type === 'Identifier' ? node.name : String(node.value);
  }
}
