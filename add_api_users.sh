cat << 'INNEREOF' > patch_server.js
const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const postUserCode = `
  app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { username, password, role, groupId } = req.body;
      const email = \`\${username}@system.local\`;
      const uid = \`\${username}-local\`;
      
      const result = await db.insert(users).values({
        uid,
        email,
        name: username,
        role: role || 'USER',
        groupId: groupId || null,
        password,
        active: true
      }).returning();
      
      res.json(result[0]);
    } catch (err: any) {
      console.error(err);
      if (err.code === '23505') {
        res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
      } else {
        res.status(500).json({ error: 'Database error', cause: err.message });
      }
    }
  });

  app.delete('/api/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      if (req.params.uid === 'admin-local' || req.params.uid === req.dbUser?.uid) {
        res.status(400).json({ error: 'Không thể xóa tài khoản này' });
        return;
      }
      await db.delete(users).where(eq(users.uid, req.params.uid));
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Database error', cause: err.message });
    }
  });
`;

code = code.replace("  app.get('/api/teachers',", postUserCode + "\n  app.get('/api/teachers',");

// Now we also need to update the login route to check the database
const loginReplacement = `
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      // First check hardcoded admin
      if (username === 'admin' && password === '123') {
        import('jsonwebtoken').then(jwt => {
          const token = jwt.default.sign({ uid: 'admin-local', email: 'admin@system.local', name: 'Admin' }, 'super-secret-admin-key');
          res.json({ token });
        });
        return;
      }
      
      // Check database
      const email = \`\${username}@system.local\`;
      const existingUser = await db.select().from(users).where(and(eq(users.email, email), eq(users.password, password)));
      
      if (existingUser.length > 0) {
        const u = existingUser[0];
        if (!u.active) {
          res.status(403).json({ error: 'Tài khoản đã bị khóa' });
          return;
        }
        import('jsonwebtoken').then(jwt => {
          const token = jwt.default.sign({ uid: u.uid, email: u.email, name: u.name }, 'super-secret-admin-key');
          res.json({ token });
        });
      } else {
        res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
      }
    } catch(err) {
      res.status(500).json({ error: 'Lỗi server' });
    }
  });
`;

// Replace the existing login route
// Because it spans multiple lines, we'll use string manipulation
const loginStart = code.indexOf("app.post('/api/login', async (req, res) => {");
const loginEnd = code.indexOf("  // API Routes", loginStart);

if (loginStart !== -1 && loginEnd !== -1) {
  code = code.substring(0, loginStart) + loginReplacement + code.substring(loginEnd);
}

fs.writeFileSync('server.ts', code);
INNEREOF
node patch_server.js
