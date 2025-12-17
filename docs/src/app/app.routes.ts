import { Routes } from '@angular/router';
import { DocsComponent } from './pages/docs/docs.component';
import { PrismaComponent } from './pages/prisma/prisma.component';

export const routes: Routes = [
  {
    path: '',
    component: DocsComponent,
  },
  {
    path: 'examples/prisma',
    component: PrismaComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
