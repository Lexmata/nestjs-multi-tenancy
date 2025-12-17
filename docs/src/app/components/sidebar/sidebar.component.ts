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
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
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
        { title: 'Prisma 7 Multi-Tenancy', path: '/', fragment: 'example-prisma' },
      ],
    },
  ];
}
