import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faChevronDown,
  faChevronRight,
  faCube,
  faCode,
  faCircle,
  faSquare,
  faCog,
  faPlug,
} from '@fortawesome/free-solid-svg-icons';
import apiData from '../../../assets/api.json';

interface TypeDocChild {
  id: number;
  name: string;
  variant?: string;
  kind: number;
  kindString?: string;
  comment?: {
    summary?: { kind: string; text: string }[];
    blockTags?: { tag: string; content: { kind: string; text: string }[] }[];
  };
  flags?: {
    isOptional?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
    isStatic?: boolean;
    isReadonly?: boolean;
  };
  signatures?: TypeDocSignature[];
  children?: TypeDocChild[];
  type?: TypeDocType;
  defaultValue?: string;
  sources?: { fileName: string; line: number; character: number }[];
  parameters?: TypeDocParameter[];
  typeParameters?: TypeDocTypeParameter[];
  extendedTypes?: TypeDocType[];
  implementedTypes?: TypeDocType[];
}

interface TypeDocSignature {
  id: number;
  name: string;
  kind: number;
  comment?: {
    summary?: { kind: string; text: string }[];
    blockTags?: { tag: string; content: { kind: string; text: string }[] }[];
  };
  parameters?: TypeDocParameter[];
  type?: TypeDocType;
  typeParameter?: TypeDocTypeParameter[];
}

interface TypeDocParameter {
  id: number;
  name: string;
  kind: number;
  flags?: { isOptional?: boolean; isRest?: boolean };
  type?: TypeDocType;
  comment?: { summary?: { kind: string; text: string }[] };
  defaultValue?: string;
}

interface TypeDocTypeParameter {
  id: number;
  name: string;
  kind: number;
  type?: TypeDocType;
  default?: TypeDocType;
}

interface TypeDocType {
  type: string;
  name?: string;
  value?: unknown;
  types?: TypeDocType[];
  elementType?: TypeDocType;
  typeArguments?: TypeDocType[];
  declaration?: TypeDocChild;
  target?: TypeDocType | number;
  qualifiedName?: string;
  package?: string;
  operator?: string;
}

type ApiCategory = 'modules' | 'classes' | 'interfaces' | 'types' | 'functions' | 'variables';

@Component({
  selector: 'app-api-reference',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent],
  templateUrl: './api-reference.component.html',
  styleUrl: './api-reference.component.css',
})
export class ApiReferenceComponent implements OnInit {
  // Icons
  faArrowLeft = faArrowLeft;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faCube = faCube;
  faCode = faCode;
  faCircle = faCircle;
  faSquare = faSquare;
  faCog = faCog;
  faPlug = faPlug;

  // State
  expandedItems = signal<Set<string>>(new Set());
  selectedCategory = signal<ApiCategory | 'all'>('all');
  searchQuery = signal<string>('');

  // Parsed API data
  apiChildren = signal<TypeDocChild[]>([]);

  // Kind mappings (TypeDoc kind numbers)
  private readonly kindMap: Record<number, string> = {
    1: 'Module',
    2: 'Namespace',
    4: 'Enum',
    8: 'EnumMember',
    16: 'Variable',
    32: 'Function',
    64: 'Class',
    128: 'Interface',
    256: 'Constructor',
    512: 'Property',
    1024: 'Method',
    2048: 'CallSignature',
    4096: 'IndexSignature',
    8192: 'ConstructorSignature',
    16384: 'Parameter',
    32768: 'TypeLiteral',
    65536: 'TypeParameter',
    131072: 'Accessor',
    262144: 'GetSignature',
    524288: 'SetSignature',
    1048576: 'TypeAlias',
    2097152: 'Reference',
  };

  // Computed filtered items
  filteredItems = computed(() => {
    const children = this.apiChildren();
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase();

    let filtered = children;

    // Filter by category
    if (category !== 'all') {
      const kindNumbers = this.getCategoryKinds(category);
      filtered = filtered.filter((c) => kindNumbers.includes(c.kind));
    }

    // Filter by search
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) || this.getComment(c).toLowerCase().includes(query),
      );
    }

    return filtered;
  });

  // Grouped items by kind
  groupedItems = computed(() => {
    const items = this.filteredItems();
    const groups = new Map<string, TypeDocChild[]>();

    for (const item of items) {
      const kind = this.getKindString(item.kind);
      if (!groups.has(kind)) {
        groups.set(kind, []);
      }
      groups.get(kind)!.push(item);
    }

    // Sort groups by priority
    const order = ['Module', 'Class', 'Interface', 'Type alias', 'Function', 'Variable', 'Enum'];
    return Array.from(groups.entries()).sort((a, b) => {
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  });

  ngOnInit(): void {
    const data = apiData as { children?: TypeDocChild[] };
    if (data.children) {
      // Sort children by name
      const sorted = [...data.children].sort((a, b) => a.name.localeCompare(b.name));
      this.apiChildren.set(sorted);
    }
  }

  getCategoryKinds(category: ApiCategory): number[] {
    switch (category) {
      case 'modules':
        return [1, 2];
      case 'classes':
        return [64];
      case 'interfaces':
        return [128];
      case 'types':
        return [1048576, 4];
      case 'functions':
        return [32];
      case 'variables':
        return [16];
    }
  }

  getKindString(kind: number): string {
    return this.kindMap[kind] || 'Unknown';
  }

  getKindIcon(kind: number) {
    switch (kind) {
      case 1:
      case 2:
        return this.faCube;
      case 64:
        return this.faSquare;
      case 128:
        return this.faCircle;
      case 1048576:
      case 4:
        return this.faCode;
      case 32:
        return this.faPlug;
      default:
        return this.faCog;
    }
  }

  getKindClass(kind: number): string {
    switch (kind) {
      case 1:
      case 2:
        return 'kind-module';
      case 64:
        return 'kind-class';
      case 128:
        return 'kind-interface';
      case 1048576:
      case 4:
        return 'kind-type';
      case 32:
        return 'kind-function';
      default:
        return 'kind-other';
    }
  }

  toggleExpanded(id: string): void {
    const expanded = new Set(this.expandedItems());
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    this.expandedItems.set(expanded);
  }

  isExpanded(id: string): boolean {
    return this.expandedItems().has(id);
  }

  setCategory(category: ApiCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  setSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  getComment(item: TypeDocChild): string {
    if (item.comment?.summary) {
      return item.comment.summary.map((s) => s.text).join('');
    }
    // Check signatures for function comments
    if (item.signatures?.[0]?.comment?.summary) {
      return item.signatures[0].comment.summary.map((s) => s.text).join('');
    }
    return '';
  }

  getExampleCode(item: TypeDocChild): string | null {
    const blockTags = item.comment?.blockTags || item.signatures?.[0]?.comment?.blockTags;
    if (!blockTags) return null;

    const exampleTag = blockTags.find((t) => t.tag === '@example');
    if (exampleTag) {
      return exampleTag.content.map((c) => c.text).join('');
    }
    return null;
  }

  getReturns(item: TypeDocChild): string | null {
    const blockTags = item.signatures?.[0]?.comment?.blockTags;
    if (!blockTags) return null;

    const returnsTag = blockTags.find((t) => t.tag === '@returns');
    if (returnsTag) {
      return returnsTag.content.map((c) => c.text).join('');
    }
    return null;
  }

  getParameters(item: TypeDocChild): TypeDocParameter[] {
    return item.signatures?.[0]?.parameters || item.parameters || [];
  }

  getMethodParamsString(item: TypeDocChild): string {
    const params = this.getParameters(item);
    return params.map((p) => p.name + (this.isOptional(p) ? '?' : '')).join(', ');
  }

  getParamDescription(param: TypeDocParameter): string {
    return param.comment?.summary?.[0]?.text || '';
  }

  formatType(type?: TypeDocType): string {
    if (!type) return 'void';

    switch (type.type) {
      case 'intrinsic':
        return type.name || 'unknown';
      case 'reference':
        if (type.typeArguments) {
          return `${type.name}<${type.typeArguments.map((t) => this.formatType(t)).join(', ')}>`;
        }
        return type.name || 'unknown';
      case 'array':
        return `${this.formatType(type.elementType)}[]`;
      case 'union':
        return type.types?.map((t) => this.formatType(t)).join(' | ') || 'unknown';
      case 'intersection':
        return type.types?.map((t) => this.formatType(t)).join(' & ') || 'unknown';
      case 'literal':
        if (typeof type.value === 'string') {
          return `'${type.value}'`;
        }
        return String(type.value);
      case 'tuple':
        return `[${type.types?.map((t) => this.formatType(t)).join(', ') || ''}]`;
      case 'reflection':
        if (type.declaration?.signatures) {
          const sig = type.declaration.signatures[0];
          const params =
            sig.parameters?.map((p) => `${p.name}: ${this.formatType(p.type)}`).join(', ') || '';
          return `(${params}) => ${this.formatType(sig.type)}`;
        }
        if (type.declaration?.children) {
          const props = type.declaration.children
            .map((c) => `${c.name}: ${this.formatType(c.type)}`)
            .join('; ');
          return `{ ${props} }`;
        }
        return 'object';
      case 'typeOperator':
        return `${type.operator} ${this.formatType(type.target as TypeDocType)}`;
      default:
        return type.name || 'unknown';
    }
  }

  getReturnType(item: TypeDocChild): string {
    const sig = item.signatures?.[0];
    if (sig?.type) {
      return this.formatType(sig.type);
    }
    return 'void';
  }

  getProperties(item: TypeDocChild): TypeDocChild[] {
    return item.children?.filter((c) => c.kind === 512) || [];
  }

  getMethods(item: TypeDocChild): TypeDocChild[] {
    return item.children?.filter((c) => c.kind === 1024 || c.kind === 2048) || [];
  }

  getSourceLink(item: TypeDocChild): string | null {
    const source = item.sources?.[0];
    if (source) {
      return `https://github.com/Lexmata/nestjs-multi-tenancy/blob/main/${source.fileName}#L${source.line}`;
    }
    return null;
  }

  isOptional(item: TypeDocChild | TypeDocParameter): boolean {
    return item.flags?.isOptional || false;
  }

  hasDefault(item: TypeDocChild | TypeDocParameter): boolean {
    return 'defaultValue' in item && item.defaultValue !== undefined;
  }

  getDefault(item: TypeDocChild | TypeDocParameter): string {
    return 'defaultValue' in item && item.defaultValue ? item.defaultValue : '';
  }
}
