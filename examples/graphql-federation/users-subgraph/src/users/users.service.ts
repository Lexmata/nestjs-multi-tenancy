import { Injectable } from '@nestjs/common';
import { User } from './user.model';

// In-memory database
const users: User[] = [
  { id: '1', tenantId: 'acme', email: 'admin@acme.com', name: 'Acme Admin', role: 'admin' },
  { id: '2', tenantId: 'acme', email: 'user@acme.com', name: 'Acme User', role: 'user' },
  { id: '3', tenantId: 'globex', email: 'admin@globex.com', name: 'Globex Admin', role: 'admin' },
];

@Injectable()
export class UsersService {
  findAll(tenantId: string): User[] {
    return users.filter((user) => user.tenantId === tenantId);
  }

  findOne(tenantId: string, id: string): User | null {
    return users.find((user) => user.tenantId === tenantId && user.id === id) || null;
  }

  create(tenantId: string, data: { email: string; name?: string }): User {
    const user: User = {
      id: String(users.length + 1),
      tenantId,
      email: data.email,
      name: data.name,
      role: 'user',
    };
    users.push(user);
    return user;
  }
}
