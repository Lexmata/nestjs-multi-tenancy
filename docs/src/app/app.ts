import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <!-- Mobile Menu Toggle -->
    <button
      class="fixed top-4 left-4 z-[200] lg:hidden flex flex-col gap-1 p-3 bg-surface border border-border rounded-lg"
      (click)="toggleSidebar()"
      aria-label="Toggle navigation"
    >
      <span
        class="block w-5 h-0.5 bg-text-primary transition-transform"
        [class.rotate-45]="sidebarOpen()"
        [class.translate-y-1.5]="sidebarOpen()"
      ></span>
      <span
        class="block w-5 h-0.5 bg-text-primary transition-opacity"
        [class.opacity-0]="sidebarOpen()"
      ></span>
      <span
        class="block w-5 h-0.5 bg-text-primary transition-transform"
        [class.-rotate-45]="sidebarOpen()"
        [class.-translate-y-1.5]="sidebarOpen()"
      ></span>
    </button>

    <!-- Sidebar -->
    <app-sidebar [isOpen]="sidebarOpen()" (linkClicked)="closeSidebar()" />

    <!-- Main Content -->
    <main class="lg:ml-[280px] min-h-screen">
      <router-outlet />
    </main>

    <!-- Mobile Overlay -->
    @if (sidebarOpen()) {
      <div class="fixed inset-0 bg-black/50 z-40 lg:hidden" (click)="closeSidebar()"></div>
    }
  `,
})
export class App {
  sidebarOpen = signal(false);

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
