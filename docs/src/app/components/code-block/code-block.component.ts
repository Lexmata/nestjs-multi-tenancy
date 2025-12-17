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
