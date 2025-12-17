import {
  Component,
  input,
  effect,
  ElementRef,
  viewChild,
  AfterViewInit,
  signal,
} from '@angular/core';

declare const hljs: {
  highlightElement: (element: HTMLElement) => void;
  highlight: (code: string, options: { language: string }) => { value: string };
};

@Component({
  selector: 'app-code-block',
  standalone: true,
  templateUrl: './code-block.component.html',
  styleUrl: './code-block.component.css',
})
export class CodeBlockComponent implements AfterViewInit {
  code = input.required<string>();
  language = input('typescript');
  title = input<string>();

  codeElement = viewChild<ElementRef<HTMLElement>>('codeElement');
  copied = signal(false);

  constructor() {
    effect(() => {
      const code = this.code();
      const lang = this.language();
      const el = this.codeElement();
      if (el && code) {
        this.highlightCode(el.nativeElement, code, lang);
      }
    });
  }

  ngAfterViewInit() {
    const el = this.codeElement();
    if (el) {
      this.highlightCode(el.nativeElement, this.code(), this.language());
    }
  }

  private highlightCode(element: HTMLElement, code: string, language: string) {
    if (typeof hljs === 'undefined') {
      // Fallback: just set text content without highlighting
      element.textContent = code;
      return;
    }

    // Use hljs.highlight for better control
    try {
      const result = hljs.highlight(code, { language: this.mapLanguage(language) });
      element.innerHTML = result.value;
      element.classList.add('hljs');
    } catch {
      // If language not supported, try auto-detection via highlightElement
      element.textContent = code;
      element.removeAttribute('data-highlighted');
      hljs.highlightElement(element);
    }
  }

  private mapLanguage(lang: string): string {
    // Map common aliases
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      prisma: 'sql',
      sh: 'bash',
      shell: 'bash',
    };
    return languageMap[lang] || lang;
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
