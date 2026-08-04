cat << 'INNEREOF' > patch_server.cjs
const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const deleteActivityCode = `
  app.delete('/api/activities/:id', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      // First delete attendance related to this activity
      await db.delete(attendance).where(eq(attendance.activityId, req.params.id));
      // Then delete the activity
      await db.delete(activities).where(eq(activities.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message });
    }
  });
`;

if (!code.includes("app.delete('/api/activities/:id'")) {
    code = code.replace("  app.put('/api/activities/:id/approval',", deleteActivityCode + "\n  app.put('/api/activities/:id/approval',");
    fs.writeFileSync('server.ts', code);
}
INNEREOF
node patch_server.cjs
