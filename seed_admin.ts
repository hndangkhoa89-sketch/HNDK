import { adminAuth } from './src/lib/firebase-admin.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  const email = 'admin@system.local';
  const password = '123_system'; // Padded for Firebase rules
  
  try {
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(user.uid, { password });
      console.log('Updated existing admin user.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        user = await adminAuth.createUser({
          email,
          password,
          emailVerified: true
        });
        console.log('Created new admin user.');
      } else {
        throw err;
      }
    }
    
    // Check if user exists in DB
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length === 0) {
      await db.insert(users).values({
        uid: user.uid,
        email: email,
        name: 'Admin',
        role: 'ADMIN'
      });
      console.log('Added admin user to database.');
    } else {
      // Ensure role is admin
      await db.update(users).set({ role: 'ADMIN' }).where(eq(users.email, email));
      console.log('Updated role to admin in database.');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
}

seedAdmin();
