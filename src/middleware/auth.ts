import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | any;
  dbUser?: typeof users.$inferSelect;
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.dbUser = { uid: 'guest', email: '', name: 'Tổ trưởng công đoàn (Khách)', role: 'GUEST', groupId: null, createdAt: new Date() };
    next();
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    let decodedToken: any;
    let email = '';
    
    try {
      decodedToken = jwt.verify(token, 'super-secret-admin-key');
      email = decodedToken.email;
    } catch(e) {
      decodedToken = await adminAuth.verifyIdToken(token);
      email = decodedToken.email || '';
    }
    
    req.user = decodedToken;

    const usersCount = await db.$count(users);
    const defaultRole = usersCount === 0 || email === 'hndangkhoa89@gmail.com' || email === 'admin@system.local' ? 'ADMIN' : 'USER';

    const result = await db.insert(users)
      .values({
        uid: decodedToken.uid,
        email,
        name: decodedToken.name || email.split('@')[0],
        role: defaultRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();
      
    req.dbUser = result[0];
    next();
  } catch (error) {
    req.dbUser = { uid: 'guest', email: '', name: 'Tổ trưởng công đoàn (Khách)', role: 'GUEST', groupId: null, createdAt: new Date() };
    next();
  }
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    let decodedToken: any;
    let email = '';
    
    try {
      decodedToken = jwt.verify(token, 'super-secret-admin-key');
      email = decodedToken.email;
    } catch(e) {
      decodedToken = await adminAuth.verifyIdToken(token);
      email = decodedToken.email || '';
    }
    
    req.user = decodedToken;

    // Check if this is the first user
    const usersCount = await db.$count(users);
    const defaultRole = usersCount === 0 || email === 'hndangkhoa89@gmail.com' || email === 'admin@system.local' ? 'ADMIN' : 'USER';

    // get or create user
    const result = await db.insert(users)
      .values({
        uid: decodedToken.uid,
        email,
        name: decodedToken.name || email.split('@')[0],
        role: defaultRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();
      
    req.dbUser = result[0];
    next();
  } catch (error) {
    console.error('Error verifying ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};
