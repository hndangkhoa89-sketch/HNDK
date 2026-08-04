import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'cd-attendance-dev-secret';

export interface AuthRequest extends Request {
  user?: any;
  dbUser?: typeof users.$inferSelect;
}

const GUEST: any = {
  uid: 'guest',
  email: '',
  name: 'Khách',
  role: 'GUEST',
  groupId: null,
  active: true,
  createdAt: new Date(),
};

const ADMIN_EMAILS = ['hndangkhoa89@gmail.com', 'admin@system.local'];

/** Đọc token, đồng bộ bản ghi người dùng trong DB và trả về hàng users tương ứng. */
async function resolveUser(token: string) {
  const decoded: any = jwt.verify(token, JWT_SECRET);
  const email: string = decoded.email || '';

  const existing = await db.select().from(users).where(eq(users.uid, decoded.uid));
  if (existing.length > 0) return existing[0];

  const usersCount = await db.$count(users);
  const role = usersCount === 0 || ADMIN_EMAILS.includes(email) ? 'ADMIN' : 'USER';

  const inserted = await db
    .insert(users)
    .values({
      uid: decoded.uid,
      email,
      name: decoded.name || email.split('@')[0],
      role,
    })
    .onConflictDoUpdate({ target: users.uid, set: { email } })
    .returning();

  return inserted[0];
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.dbUser = GUEST;
    next();
    return;
  }
  try {
    req.dbUser = await resolveUser(authHeader.slice(7));
  } catch {
    req.dbUser = GUEST;
  }
  next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Chưa đăng nhập' });
    return;
  }
  try {
    req.dbUser = await resolveUser(authHeader.slice(7));
    next();
  } catch (error) {
    console.error('Token không hợp lệ:', error);
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.dbUser?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Chỉ quản trị viên được thực hiện thao tác này' });
    return;
  }
  next();
};
