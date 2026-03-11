import { Role } from '@generated/prisma/client.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: Role;
    }
    interface Request {
      user?: User;
    }
  }
}
