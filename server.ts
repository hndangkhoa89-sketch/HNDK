import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { activities, attendance, groups, members, users } from './src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

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
      const email = `${username}@system.local`;
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
  // API Routes
  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    res.json(req.dbUser);
  });
  
  app.get('/api/dashboard', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const allActivities = await db.select().from(activities).orderBy(activities.id);
      const allGroups = await db.select().from(groups).orderBy(groups.name);
      
      res.json({
        user: req.dbUser,
        activities: allActivities,
        groups: allGroups,
      });
    } catch (err: any) {
      console.error(err);
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  app.post('/api/activities', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { id, name, date, notes } = req.body;
      const result = await db.insert(activities).values({
        id, name, date, notes
      }).onConflictDoUpdate({
        target: activities.id,
        set: { name, date, notes }
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });


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

  app.put('/api/activities/:id/approval', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { approved } = req.body;
      const status = approved ? 'APPROVED' : 'OPEN';
      const result = await db.update(activities)
        .set({ 
          status, 
          approvedAt: approved ? new Date() : null, 
          approvedBy: approved ? req.dbUser.email : null 
        })
        .where(eq(activities.id, req.params.id))
        .returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });
  
  app.post('/api/groups', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { id, name } = req.body;
      const result = await db.insert(groups).values({
        id, name
      }).onConflictDoUpdate({
        target: groups.id,
        set: { name }
      }).returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  app.delete('/api/groups/:id', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      // Find members in this group
      const groupMembers = await db.select().from(members).where(eq(members.groupId, req.params.id));
      const memberIds = groupMembers.map(m => m.id);
      
      if (memberIds.length > 0) {
        // Find attendance for these members and delete
        for (const mid of memberIds) {
          await db.delete(attendance).where(eq(attendance.memberId, mid));
        }
        // Delete members
        await db.delete(members).where(eq(members.groupId, req.params.id));
      }
      
      // Remove group from users
      await db.update(users).set({ groupId: null }).where(eq(users.groupId, req.params.id));
      
      await db.delete(groups).where(eq(groups.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const allUsers = await db.select().from(users).orderBy(users.email);
      res.json(allUsers);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  app.put('/api/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { role, groupId, active } = req.body;
      const result = await db.update(users)
        .set({ role, groupId, active })
        .where(eq(users.uid, req.params.uid))
        .returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });


  app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { username, password, role, groupId } = req.body;
      const email = `${username}@system.local`;
      const uid = `${username}-local`;
      
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

  app.get('/api/teachers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allMembers = await db.select().from(members).orderBy(members.name);
      const allGroups = await db.select().from(groups).orderBy(groups.name);
      res.json({ teachers: allMembers, groups: allGroups });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });
  
  app.post('/api/teachers', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { id, name, groupId, role } = req.body;
      
      const result = await db.insert(members).values({
        id, name, groupId, role, active: true
      }).onConflictDoUpdate({
        target: members.id,
        set: { name, groupId, role, active: true }
      }).returning();
      
      res.json(result[0]);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });
  
  app.delete('/api/teachers/:id', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      await db.delete(attendance).where(eq(attendance.memberId, req.params.id));
      await db.delete(members).where(eq(members.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  app.put('/api/teachers/:id/active', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const { active } = req.body;
      const result = await db.update(members)
        .set({ active })
        .where(eq(members.id, req.params.id))
        .returning();
      res.json(result[0]);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });
  
  app.get('/api/attendance/:activityId', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const activityId = req.params.activityId;
      const { groupId } = req.query; // 'ALL' or specific group
      
      let allMembers = await db.select().from(members);
      if (req.dbUser?.role !== 'ADMIN' && req.dbUser?.groupId) {
        allMembers = allMembers.filter(m => m.groupId === req.dbUser?.groupId);
      } else if (groupId && groupId !== 'ALL') {
        allMembers = allMembers.filter(m => m.groupId === groupId);
      }
      
      const attRecords = await db.select().from(attendance).where(eq(attendance.activityId, activityId));
      const attMap = new Map(attRecords.map(a => [a.memberId, a]));
      
      const rows = allMembers.map(m => {
        const att = attMap.get(m.id);
        return {
          memberId: m.id,
          name: m.name,
          groupId: m.groupId,
          role: m.role,
          active: m.active,
          present: att?.present || false,
          notes: att?.notes || ''
        };
      });
      
      res.json(rows);
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });
  
  app.post('/api/attendance/:activityId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const activityId = req.params.activityId;
      const rows = req.body.rows;
      
      // verify activity is not approved if user is not admin
      const act = await db.select().from(activities).where(eq(activities.id, activityId));
      if (!act[0]) {
        res.status(404).json({ error: 'Activity not found' });
        return;
      }
      if (act[0].status === 'APPROVED' && req.dbUser?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Cannot modify approved activity' });
        return;
      }
      
      for (const row of rows) {
        await db.insert(attendance).values({
          activityId,
          memberId: row.memberId,
          present: row.present,
          notes: row.notes,
          updatedBy: req.dbUser?.email
        }).onConflictDoUpdate({
          target: [attendance.activityId, attendance.memberId],
          set: {
            present: row.present,
            notes: row.notes,
            updatedBy: req.dbUser?.email,
            updatedAt: new Date()
          }
        });
      }
      
      res.json({ success: true, savedAt: new Date() });
    } catch (err: any) {
      console.error(err);
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  app.get('/api/stats', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const allAttendance = await db.select().from(attendance).where(eq(attendance.present, true));
      const allMembers = await db.select().from(members);
      res.json({ attendance: allAttendance, members: allMembers });
    } catch (err: any) {
      console.error(err); res.status(500).json({ error: 'Database error', cause: err.message + (err.detail ? " " + err.detail : "") });
    }
  });

  // Vite middleware for development
  const httpServer = createHttpServer(app);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
