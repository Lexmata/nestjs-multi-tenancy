import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  title: string;
  path: string;
  fragment?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="fixed top-0 left-0 w-[280px] h-screen bg-sidebar-bg border-r border-border flex flex-col z-50 transition-transform duration-300"
      [class.translate-x-0]="isOpen()"
      [class.-translate-x-full]="!isOpen()"
      [class.lg:translate-x-0]="true"
    >
      <!-- Header -->
      <div class="p-6 border-b border-border">
        <a routerLink="/" class="flex items-center gap-3 no-underline">
          <span class="text-3xl">🏢</span>
          <div class="flex flex-col">
            <span class="font-bold text-lg text-text-primary tracking-tight">Multi-Tenant</span>
            <span class="text-xs text-primary font-semibold uppercase tracking-wider"
              >for NestJS</span
            >
          </div>
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4">
        @for (section of navSections; track section.title) {
          <div class="px-4 mb-6">
            <h3
              class="text-[0.7rem] font-bold uppercase tracking-widest text-sidebar-section px-3 mb-2"
            >
              {{ section.title }}
            </h3>
            <ul class="list-none">
              @for (item of section.items; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    [fragment]="item.fragment"
                    routerLinkActive="bg-primary text-white font-semibold"
                    [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                    class="block px-3 py-2 text-sidebar-text text-sm rounded-md transition-all duration-200 hover:text-text-primary hover:bg-sidebar-hover no-underline"
                    (click)="linkClicked.emit()"
                  >
                    {{ item.title }}
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-border flex items-center justify-between">
        <a
          href="https://github.com/Lexmata/nestjs-multi-tenancy"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-2 text-sidebar-text text-sm no-underline hover:text-text-primary transition-colors"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          <span>GitHub</span>
        </a>
        <span class="bg-primary text-white text-xs font-semibold px-2 py-1 rounded">v0.1.0</span>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  isOpen = input(false);
  linkClicked = output<void>();

  navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { title: 'Introduction', path: '/', fragment: 'introduction' },
        { title: 'Installation', path: '/', fragment: 'installation' },
        { title: 'Quick Start', path: '/', fragment: 'quick-start' },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { title: 'Basic Configuration', path: '/', fragment: 'basic-config' },
        { title: 'Async Configuration', path: '/', fragment: 'async-config' },
        { title: 'Options Reference', path: '/', fragment: 'options' },
      ],
    },
    {
      title: 'Extraction Strategies',
      items: [
        { title: 'Header Strategy', path: '/', fragment: 'header-strategy' },
        { title: 'Subdomain Strategy', path: '/', fragment: 'subdomain-strategy' },
        { title: 'Path Strategy', path: '/', fragment: 'path-strategy' },
        { title: 'Query Strategy', path: '/', fragment: 'query-strategy' },
        { title: 'Custom Strategy', path: '/', fragment: 'custom-strategy' },
      ],
    },
    {
      title: 'Features',
      items: [
        { title: 'Decorators', path: '/', fragment: 'decorators' },
        { title: 'Guards', path: '/', fragment: 'guards' },
        { title: 'Context Service', path: '/', fragment: 'context-service' },
        { title: 'Tenant Resolver', path: '/', fragment: 'tenant-resolver' },
        { title: 'Route Exclusions', path: '/', fragment: 'route-exclusions' },
      ],
    },
    {
      title: 'Examples',
      items: [
        { title: 'Database Connection', path: '/', fragment: 'example-database' },
        { title: 'Tenant Repository', path: '/', fragment: 'example-repository' },
        { title: 'JWT Integration', path: '/', fragment: 'example-jwt' },
      ],
    },
  ];
}
