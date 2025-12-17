import { Component, output, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBars, faChevronDown, faBook, faRocket } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

interface DropdownItem {
  title: string;
  path: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, FaIconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  menuToggled = output<void>();

  // Icons
  faBars = faBars;
  faChevronDown = faChevronDown;
  faGithub = faGithub;
  faBook = faBook;
  faRocket = faRocket;

  isScrolled = false;
  examplesOpen = false;

  navLinks = [
    { title: 'Docs', path: '/', fragment: 'introduction' },
    { title: 'Quick Start', path: '/', fragment: 'quick-start' },
    { title: 'Configuration', path: '/', fragment: 'basic-config' },
  ];

  exampleItems: DropdownItem[] = [
    {
      title: 'Prisma 7',
      path: '/examples/prisma',
      icon: '◮',
      description: 'Client Extensions for automatic tenant filtering',
    },
    {
      title: 'TypeORM',
      path: '/examples/typeorm',
      icon: 'T',
      description: 'Base repository pattern with QueryBuilder',
    },
    {
      title: 'Drizzle ORM',
      path: '/examples/drizzle',
      icon: '🌧',
      description: 'Lightweight queries with prepared statements',
    },
    {
      title: 'MikroORM',
      path: '/examples/mikro-orm',
      icon: 'M',
      description: 'Global filters with Unit of Work pattern',
    },
  ];

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 10;
  }

  toggleExamples() {
    this.examplesOpen = !this.examplesOpen;
  }

  closeExamples() {
    this.examplesOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.examples-dropdown')) {
      this.examplesOpen = false;
    }
  }
}
