const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const patchEndpoint = `
  app.patch('/api/activities/:id', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { id } = req.params;
      const { name } = req.body;
      const result = await db.update(activities)
        .set({ name })
        .where(eq(activities.id, id))
        .returning();
      res.json(result[0] || { success: true });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });
`;

code = code.replace(
  "app.delete('/api/activities/:id', requireAuth, async (req: AuthRequest, res) => {",
  patchEndpoint.trim() + "\n\n  app.delete('/api/activities/:id', requireAuth, async (req: AuthRequest, res) => {"
);

fs.writeFileSync('server.ts', code);
