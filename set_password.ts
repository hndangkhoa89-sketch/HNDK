import { adminAuth } from './src/lib/firebase-admin.ts';

async function setPassword() {
  try {
    const email = 'hndangkhoa89@gmail.com';
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, {
      password: 'password123'
    });
    console.log('Password updated successfully for ' + email);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.log('User not found. Creating new user...');
      await adminAuth.createUser({
        email: 'hndangkhoa89@gmail.com',
        password: 'password123',
        emailVerified: true
      });
      console.log('User created successfully');
    } else {
      console.error('Error:', err);
    }
  }
}

setPassword();
