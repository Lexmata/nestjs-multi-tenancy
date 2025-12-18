import { Injectable } from '@nestjs/common';

interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
}

// In-memory database
const users: User[] = [
  { id: '1', tenantId: 'acme', email: 'admin@acme.com', name: 'Acme Admin' },
  { id: '2', tenantId: 'acme', email: 'user@acme.com', name: 'Acme User' },
  { id: '3', tenantId: 'globex', email: 'admin@globex.com', name: 'Globex Admin' },
];

@Injectable()
export class UsersService {
  findAll(tenantId: string): User[] {
    return users.filter((user) => user.tenantId === tenantId);
  }

  findOne(tenantId: string, id: string): User | undefined {
    return users.find((user) => user.tenantId === tenantId && user.id === id);
  }

  create(tenantId: string, data: { email: string; name?: string }): User {
    const user: User = {
      id: String(users.length + 1),
      tenantId,
      email: data.email,
      name: data.name || '',
    };
    users.push(user);
    return user;
  }
}
