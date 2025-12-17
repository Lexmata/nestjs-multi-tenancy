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
};

@Component({
  selector: 'app-code-block',
  standalone: true,
  template: `
    <div class="relative group my-4">
      @if (title()) {
        <div
          class="bg-code-border text-text-secondary text-xs px-4 py-2 rounded-t-lg border border-b-0 border-code-border"
        >
          {{ title() }}
        </div>
      }
      <pre
        class="bg-code-bg border border-code-border rounded-lg overflow-x-auto m-0"
        [class.rounded-t-none]="title()"
        [class.rounded-t-lg]="!title()"
      ><code #codeElement [class]="'language-' + language()" class="block p-4 text-sm leading-relaxed font-mono">{{ code() }}</code></pre>
      <button
        (click)="copyCode()"
        class="absolute top-2 right-2 p-2 bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-text-primary hover:bg-white/20"
        [class.top-10]="title()"
        title="Copy to clipboard"
      >
        @if (copied()) {
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        } @else {
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        }
      </button>
    </div>
  `,
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
      const el = this.codeElement();
      if (el && code && typeof hljs !== 'undefined') {
        setTimeout(() => {
          el.nativeElement.textContent = code;
          hljs.highlightElement(el.nativeElement);
        });
      }
    });
  }

  ngAfterViewInit() {
    const el = this.codeElement();
    if (el && typeof hljs !== 'undefined') {
      hljs.highlightElement(el.nativeElement);
    }
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
