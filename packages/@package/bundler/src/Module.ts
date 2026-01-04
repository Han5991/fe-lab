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
  ast: AcornProgram; // 개선된 타입 사용
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
        const source = node.source.value;
        this.dependencies.push(source);
      }
    });
  }

  /**
   * ESM 문법을 CommonJS 스타일(require/exports)로 변환
   */
  transform() {
    this.ast.body.forEach(node => {
      // --- 1. Import Handling ---
      if (node.type === 'ImportDeclaration') {
        if (typeof node.source.value !== 'string') return;
        const depId = this.mapping.get(node.source.value);

        let replacement = '';
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

        if (namespaceSpecifier) {
          replacement += `const ${namespaceSpecifier.local.name} = require(${depId});\n`;
        } else if (defaultSpecifier || namedSpecifiers.length > 0) {
          // 중복 require를 피하기 위해 임시 변수 사용 가능하나, 단순화를 위해 각각 처리
          if (defaultSpecifier) {
            replacement += `const ${defaultSpecifier.local.name} = require(${depId}).default;\n`;
          }
          if (namedSpecifiers.length > 0) {
            const specifierStr = namedSpecifiers
              .map(s => {
                const imported = s.imported;
                const local = s.local;
                const importedName =
                  imported.type === 'Identifier'
                    ? imported.name
                    : String(imported.value);
                return importedName === local.name
                  ? importedName
                  : `${importedName}: ${local.name}`;
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

      // --- 2. Named Export Handling ---
      if (node.type === 'ExportNamedDeclaration') {
        const start = node.start;
        const declaration = node.declaration;

        if (node.source && typeof node.source.value === 'string') {
          // export { a, b } from './file.js';
          const depId = this.mapping.get(node.source.value);
          const specifierStr = node.specifiers
            .map(s => {
              const local = s.local;
              const exported = s.exported;
              const exportedName =
                exported.type === 'Identifier' ? exported.name : exported.value;
              const localName =
                local.type === 'Identifier' ? local.name : String(local.value);
              return `exports.${exportedName} = require(${depId}).${localName};`;
            })
            .join('\n');
          this.magicString.overwrite(node.start, node.end, specifierStr);
        } else if (declaration) {
          // export const a = 1;
          // export function a() {}
          if (declaration.type === 'VariableDeclaration') {
            const firstDeclaration = declaration.declarations[0];
            if (
              firstDeclaration.id.type === 'Identifier' &&
              isAcornSpecificNode(declaration)
            ) {
              const name = firstDeclaration.id.name;
              this.magicString.remove(start, declaration.start);
              this.magicString.appendLeft(
                node.end,
                `\nexports.${name} = ${name};`,
              );
            }
          } else if (
            declaration.type === 'FunctionDeclaration' ||
            declaration.type === 'ClassDeclaration'
          ) {
            if (declaration.id && isAcornSpecificNode(declaration)) {
              const name = declaration.id.name;
              this.magicString.remove(start, declaration.start);
              this.magicString.appendLeft(
                node.end,
                `\nexports.${name} = ${name};`,
              );
            }
          }
        } else {
          // export { a, b };
          const specifierStr = node.specifiers
            .map(s => {
              const local = s.local;
              const exported = s.exported;
              const exportedName =
                exported.type === 'Identifier' ? exported.name : exported.value;
              const localName =
                local.type === 'Identifier' ? local.name : String(local.value);
              return `exports.${exportedName} = ${localName};`;
            })
            .join('\n');
          this.magicString.overwrite(node.start, node.end, specifierStr);
        }
      }

      // --- 3. Default Export Handling ---
      if (node.type === 'ExportAllDeclaration') {
        if (typeof node.source.value !== 'string') return;
        const depId = this.mapping.get(node.source.value);
        this.magicString.overwrite(
          node.start,
          node.end,
          `Object.assign(exports, require(${depId}));`,
        );
      }

      if (node.type === 'ExportDefaultDeclaration') {
        const start = node.start;
        const declaration = node.declaration;

        if (
          declaration.type === 'FunctionDeclaration' ||
          declaration.type === 'ClassDeclaration'
        ) {
          if (declaration.id) {
            // export default function greet() {}
            const name = declaration.id.name;
            if (isAcornSpecificNode(declaration)) {
              this.magicString.remove(start, declaration.start);
              this.magicString.appendLeft(
                node.end,
                `\nexports.default = ${name};`,
              );
            }
          } else {
            // export default function() {}
            if (isAcornSpecificNode(declaration)) {
              this.magicString.overwrite(
                start,
                declaration.start,
                'exports.default = ',
              );
            }
          }
        } else {
          // export default expression;
          if (isAcornSpecificNode(declaration)) {
            this.magicString.overwrite(
              start,
              declaration.start,
              'exports.default = ',
            );
          }
        }
      }
    });
  }
}
