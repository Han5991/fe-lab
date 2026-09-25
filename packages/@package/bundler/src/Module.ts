import fs from 'node:fs';
import * as acorn from 'acorn';
import type * as ESTree from 'estree';
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
 * 선언 패턴이 만드는 바인딩 이름을 모두 모은다.
 * `const a = 1, b = 2`는 둘, `const { x, y: [z], ...rest } = o`는 x·z·rest다.
 */
function collectBoundNames(pattern: ESTree.Pattern, names: string[] = []) {
  switch (pattern.type) {
    case 'Identifier':
      names.push(pattern.name);
      break;
    case 'ObjectPattern':
      pattern.properties.forEach(property =>
        collectBoundNames(
          property.type === 'RestElement' ? property.argument : property.value,
          names,
        ),
      );
      break;
    case 'ArrayPattern':
      pattern.elements.forEach(element => {
        if (element) collectBoundNames(element, names);
      });
      break;
    case 'RestElement':
      collectBoundNames(pattern.argument, names);
      break;
    case 'AssignmentPattern':
      collectBoundNames(pattern.left, names);
      break;
    default:
      // MemberExpression은 선언 패턴에 올 수 없다
      break;
  }
  return names;
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
  mapping: Map<string, number | string> = new Map();
  exportsList: string[] = [];
  exportAllSources: string[] = [];
  /** transform() 동안: 최상위 함수 선언 이름과, 모듈 맨 위로 올릴 export 대입문 */
  private hoistedFunctions = new Set<string>();
  private hoistedExports: string[] = [];

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
      // 1. Import 분석
      if (node.type === 'ImportDeclaration') {
        if (node.source && typeof node.source.value === 'string') {
          this.dependencies.push(node.source.value);
        }
      }

      // 2. Export Named 분석 (export const a = 1;)
      else if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach(d => {
              this.exportsList.push(...collectBoundNames(d.id));
            });
          } else if (
            (node.declaration.type === 'FunctionDeclaration' ||
              node.declaration.type === 'ClassDeclaration') &&
            node.declaration.id
          ) {
            this.exportsList.push(node.declaration.id.name);
          }
        } else if (node.specifiers) {
          // export { a, b }
          node.specifiers.forEach(s => {
            this.exportsList.push(this.getSpecifierName(s.exported));
          });
        }

        // Re-export (export { a } from './b') 처리
        if (node.source && typeof node.source.value === 'string') {
          this.dependencies.push(node.source.value);
        }
      }

      // 3. Export Default 분석
      else if (node.type === 'ExportDefaultDeclaration') {
        this.exportsList.push('default');
      }

      // 4. Export All 분석 (export * from './b', export * as ns from './b')
      else if (node.type === 'ExportAllDeclaration') {
        if (node.source && typeof node.source.value === 'string') {
          this.dependencies.push(node.source.value);
          if (node.exported) {
            // export * as ns — 이름 하나(ns)를 내보낼 뿐, 대상의 이름을 펼치지 않는다
            this.exportsList.push(this.getSpecifierName(node.exported));
          } else {
            this.exportAllSources.push(node.source.value);
          }
        }
      }
    });
  }

  /**
   * ESM 문법을 CommonJS 스타일(require/exports)로 변환
   */
  transform() {
    type Action = (node: AcornProgram['body'][number]) => void;

    // 최상위 함수 선언은 호이스팅된다 — ESM에서는 모듈 본문이 돌기 전부터 바인딩이 살아 있어
    // 순환 참조로 먼저 불려 간 모듈도 이 함수를 받는다. 그 export 대입은 모듈 맨 위로 올린다.
    this.hoistedFunctions = new Set(
      this.ast.body.flatMap(node => {
        const declaration =
          node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportDefaultDeclaration'
            ? node.declaration
            : node;
        return declaration?.type === 'FunctionDeclaration' && declaration.id
          ? [declaration.id.name]
          : [];
      }),
    );
    this.hoistedExports = [];

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

    // 이 exports는 ESM에서 번역됐다는 표시 — 기본 가져오기 interop(transformImportDeclaration)이
    // 이 플래그를 보고 모듈 객체 대신 `.default`를 꺼낸다. 없으면 `import greet from`이
    // `{ default: fn }`을 받는다. (CJS 외부 모듈은 플래그가 없으니 모듈 자체를 쓴다)
    this.magicString.prepend(
      `Object.defineProperty(exports, '__esModule', { value: true });\n` +
        this.hoistedExports.map(line => `${line}\n`).join(''),
    );
  }

  /**
   * `exports.name = local;`을 만든다. local이 최상위 함수 선언이면 모듈 맨 위로 올리고
   * 빈 문자열을, 아니면 그 자리에 둘 대입문을 돌려준다.
   */
  private exportAssignment(exportedName: string, localName: string): string {
    const line = `exports.${exportedName} = ${localName};`;
    if (this.hoistedFunctions.has(localName)) {
      this.hoistedExports.push(line);
      return '';
    }
    return line;
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
    const requireCall =
      typeof depId === 'number' ? `require(${depId})` : `require('${depId}')`;

    if (namespaceSpecifier) {
      replacement += `const ${namespaceSpecifier.local.name} = ${requireCall};\n`;
    } else if (defaultSpecifier || namedSpecifiers.length > 0) {
      if (defaultSpecifier) {
        const localName = defaultSpecifier.local.name;
        // Default Import Interop 처리
        // (require 결과에 default가 있으면 쓰고, 없으면 모듈 자체를 사용)
        replacement += `const _${localName}_module = ${requireCall};\n`;
        replacement += `const ${localName} = _${localName}_module && _${localName}_module.__esModule ? _${localName}_module.default : _${localName}_module;\n`;
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
        replacement += `const { ${specifierStr} } = ${requireCall};\n`;
      }
    } else {
      // import './file.js' (Side effect)
      replacement += `${requireCall};\n`;
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
      const requireCall =
        typeof depId === 'number' ? `require(${depId})` : `require('${depId}')`;

      const specifierStr = node.specifiers
        .map(s => {
          const localName = this.getSpecifierName(s.local);
          const exportedName = this.getSpecifierName(s.exported);
          return `exports.${exportedName} = ${requireCall}.${localName};`;
        })
        .join('\n');
      this.magicString.overwrite(node.start, node.end, specifierStr);
    } else if (declaration) {
      this.handleExportDeclaration(node, declaration);
    } else {
      // export { a, b };
      const specifierStr = node.specifiers
        .map(s =>
          this.exportAssignment(
            this.getSpecifierName(s.exported),
            this.getSpecifierName(s.local),
          ),
        )
        .filter(line => line !== '')
        .join('\n');
      this.magicString.overwrite(node.start, node.end, specifierStr);
    }
  }

  private handleExportDeclaration(
    node: AcornNode<ESTree.ExportNamedDeclaration>,
    declaration: ESTree.Declaration,
  ) {
    if (!isAcornSpecificNode(declaration)) return;

    // export const a = 1, b = 2;  export const { x, y } = obj;
    // export function a() {}      export class A {}
    const names =
      declaration.type === 'VariableDeclaration'
        ? declaration.declarations.flatMap(d => collectBoundNames(d.id))
        : (declaration.type === 'FunctionDeclaration' ||
              declaration.type === 'ClassDeclaration') &&
            declaration.id
          ? [declaration.id.name]
          : [];

    // `export ` 키워드만 떼고 선언은 그대로 둔다
    this.magicString.remove(node.start, declaration.start);
    const assignments = names
      .map(name => this.exportAssignment(name, name))
      .filter(line => line !== '');
    if (assignments.length > 0) {
      this.magicString.appendLeft(node.end, `\n${assignments.join('\n')}`);
    }
  }

  private transformExportAllDeclaration(
    node: AcornNode<ESTree.ExportAllDeclaration>,
  ) {
    if (typeof node.source.value !== 'string') return;
    const depId = this.mapping.get(node.source.value);
    const requireCall =
      typeof depId === 'number' ? `require(${depId})` : `require('${depId}')`;

    if (node.exported) {
      // export * as ns from './a' → 모듈 객체 하나를 ns라는 이름으로
      this.magicString.overwrite(
        node.start,
        node.end,
        `exports.${this.getSpecifierName(node.exported)} = ${requireCall};`,
      );
      return;
    }

    // export * from './a' — ESM처럼 default는 빼고, 이 모듈이 직접 내보낸 이름은
    // 덮어쓰지 않는다(뒤에 오는 로컬 export 대입은 어차피 이 값을 덮는다)
    const source = `_star_${node.start}`;
    this.magicString.overwrite(
      node.start,
      node.end,
      [
        `const ${source} = ${requireCall};`,
        `for (const key in ${source}) {`,
        `  if (key !== 'default' && !Object.prototype.hasOwnProperty.call(exports, key)) {`,
        `    exports[key] = ${source}[key];`,
        `  }`,
        `}`,
      ].join('\n'),
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
        const assignment = this.exportAssignment(
          'default',
          declaration.id.name,
        );
        if (assignment !== '') {
          this.magicString.appendLeft(node.end, `\n${assignment}`);
        }
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
