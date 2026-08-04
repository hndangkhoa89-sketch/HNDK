sed -i "/app.use(express.json());/a \
\
  app.post('/api/login', async (req, res) => {\n    const { username, password } = req.body;\n    if (username === 'admin' && password === '123') {\n      import('jsonwebtoken').then(jwt => {\n        const token = jwt.default.sign({ uid: 'admin-local', email: 'admin@system.local', name: 'Admin' }, 'super-secret-admin-key');\n        res.json({ token });\n      });\n    } else {\n      res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });\n    }\n  });" server.ts
