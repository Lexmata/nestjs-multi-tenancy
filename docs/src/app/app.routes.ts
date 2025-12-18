import { Routes } from '@angular/router';
import { DocsComponent } from './pages/docs/docs.component';
import { PrismaComponent } from './pages/prisma/prisma.component';
import { TypeormComponent } from './pages/typeorm/typeorm.component';
import { DrizzleComponent } from './pages/drizzle/drizzle.component';
import { MikroOrmComponent } from './pages/mikro-orm/mikro-orm.component';
import { SequelizeComponent } from './pages/sequelize/sequelize.component';
import { MongooseComponent } from './pages/mongoose/mongoose.component';
import { KnexComponent } from './pages/knex/knex.component';
import { ApiReferenceComponent } from './pages/api-reference/api-reference.component';

export const routes: Routes = [
  {
    path: '',
    component: DocsComponent,
  },
  {
    path: 'api',
    component: ApiReferenceComponent,
  },
  {
    path: 'examples/prisma',
    component: PrismaComponent,
  },
  {
    path: 'examples/typeorm',
    component: TypeormComponent,
  },
  {
    path: 'examples/drizzle',
    component: DrizzleComponent,
  },
  {
    path: 'examples/mikro-orm',
    component: MikroOrmComponent,
  },
  {
    path: 'examples/sequelize',
    component: SequelizeComponent,
  },
  {
    path: 'examples/mongoose',
    component: MongooseComponent,
  },
  {
    path: 'examples/knex',
    component: KnexComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
