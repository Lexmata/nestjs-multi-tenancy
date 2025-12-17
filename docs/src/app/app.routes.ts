import { Routes } from '@angular/router';
import { DocsComponent } from './pages/docs/docs.component';

export const routes: Routes = [
  {
    path: '',
    component: DocsComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
