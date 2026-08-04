import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { and, eq, sql } from 'drizzle-orm';
import {
  requireAuth,
  optionalAuth,
  requireAdmin,
  JWT_SECRET,
  AuthRequest,
} from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { activities, attendance, groups, members, users } from './src/db/schema.ts';

const fail = (res: express.Response, err: any) => {
  console.error(err);
  res.status(500).json({
    error: 'Lỗi truy cập cơ sở dữ liệu',
    cause: err?.message + (err?.detail ? ' ' + err.detail : ''),
  });
};

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  /* ------------------------------- Đăng nhập ------------------------------ */

  app.post('/api/login', async (req, res) => {
    const username = str(req.body?.username);
    const password = str(req.body?.password);
    try {
      if (username === 'admin' && password === '123') {
        const token = jwt.sign(
          { uid: 'admin-local', email: 'admin@system.local', name: 'Quản trị viên' },
          JWT_SECRET
        );
        res.json({ token });
        return;
      }

      const email = `${username}@system.local`;
      const found = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.password, password)));

      if (found.length === 0) {
        res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
        return;
      }
      const u = found[0];
      if (!u.active) {
        res.status(403).json({ error: 'Tài khoản đã bị khóa' });
        return;
      }
      const token = jwt.sign({ uid: u.uid, email: u.email, name: u.name }, JWT_SECRET);
      res.json({ token });
    } catch (err) {
      fail(res, err);
    }
  });

  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    res.json(req.dbUser);
  });

  /* -------------------------- Dữ liệu dùng chung -------------------------- */

  app.get('/api/dashboard', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const [allActivities, allGroups] = await Promise.all([
        db.select().from(activities).orderBy(activities.id),
        db.select().from(groups).orderBy(groups.name),
      ]);
      res.json({ user: req.dbUser, activities: allActivities, groups: allGroups });
    } catch (err) {
      fail(res, err);
    }
  });

  /** Số liệu tổng quan cho trang Tổng quan. */
  app.get('/api/overview', optionalAuth, async (_req: AuthRequest, res) => {
    try {
      const countsResult = await db.execute(sql`
        select
          (select count(*)::int from groups) as "groupCount",
          (select count(*)::int from members) as "memberCount",
          (select count(*)::int from activities) as "activityCount",
          (select count(*)::int from activities where status = 'APPROVED') as "approvedCount",
          (select count(*)::int from attendance where present = true) as "presentCount"
      `);
      const counts = countsResult.rows[0];

      const perActivity = await db
        .select({
          id: activities.id,
          name: activities.name,
          date: activities.date,
          status: activities.status,
          present: sql<number>`count(${attendance.memberId}) filter (where ${attendance.present})::int`,
        })
        .from(activities)
        .leftJoin(attendance, eq(attendance.activityId, activities.id))
        .groupBy(activities.id, activities.name, activities.date, activities.status)
        .orderBy(activities.id);

      const perGroup = await db
        .select({
          id: groups.id,
          name: groups.name,
          memberCount: sql<number>`count(distinct ${members.id})::int`,
          present: sql<number>`count(${attendance.memberId}) filter (where ${attendance.present})::int`,
        })
        .from(groups)
        .leftJoin(members, eq(members.groupId, groups.id))
        .leftJoin(attendance, eq(attendance.memberId, members.id))
        .groupBy(groups.id, groups.name)
        .orderBy(groups.name);

      res.json({ counts, perActivity, perGroup });
    } catch (err) {
      fail(res, err);
    }
  });

  /* ------------------------------- Hoạt động ------------------------------ */

  app.post('/api/activities', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id, name, date, notes } = req.body;
      const result = await db
        .insert(activities)
        .values({ id, name, date, notes })
        .onConflictDoUpdate({ target: activities.id, set: { name, date, notes } })
        .returning();
      res.json(result[0]);
    } catch (err) {
      fail(res, err);
    }
  });

  app.patch('/api/activities/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name } = req.body;
      const result = await db
        .update(activities)
        .set({ name })
        .where(eq(activities.id, req.params.id))
        .returning();
      res.json(result[0] || { success: true });
    } catch (err) {
      fail(res, err);
    }
  });

  app.delete('/api/activities/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await db.transaction(async (tx) => {
        await tx.delete(attendance).where(eq(attendance.activityId, req.params.id));
        await tx.delete(activities).where(eq(activities.id, req.params.id));
      });
      res.json({ success: true });
    } catch (err) {
      fail(res, err);
    }
  });

  app.put('/api/activities/:id/approval', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const approved = Boolean(req.body?.approved);
      const result = await db
        .update(activities)
        .set({
          status: approved ? 'APPROVED' : 'OPEN',
          approvedAt: approved ? new Date() : null,
          approvedBy: approved ? req.dbUser!.email : null,
        })
        .where(eq(activities.id, req.params.id))
        .returning();
      res.json(result[0]);
    } catch (err) {
      fail(res, err);
    }
  });

  /* ---------------------------- Tổ công đoàn ----------------------------- */

  app.post('/api/groups', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id, name } = req.body;
      const result = await db
        .insert(groups)
        .values({ id, name })
        .onConflictDoUpdate({ target: groups.id, set: { name } })
        .returning();
      res.json(result[0]);
    } catch (err) {
      fail(res, err);
    }
  });

  app.delete('/api/groups/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const groupId = req.params.id;
      await db.transaction(async (tx) => {
        const groupMembers = await tx.select().from(members).where(eq(members.groupId, groupId));
        for (const m of groupMembers) {
          await tx.delete(attendance).where(eq(attendance.memberId, m.id));
        }
        await tx.delete(members).where(eq(members.groupId, groupId));
        await tx.update(users).set({ groupId: null }).where(eq(users.groupId, groupId));
        await tx.delete(groups).where(eq(groups.id, groupId));
      });
      res.json({ success: true });
    } catch (err) {
      fail(res, err);
    }
  });

  /* ------------------------------ Tài khoản ------------------------------ */

  app.get('/api/users', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
    try {
      res.json(await db.select().from(users).orderBy(users.email));
    } catch (err) {
      fail(res, err);
    }
  });

  app.post('/api/users', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { username, password, role, groupId } = req.body;
      const result = await db
        .insert(users)
        .values({
          uid: `${username}-local`,
          email: `${username}@system.local`,
          name: username,
          role: role || 'USER',
          groupId: groupId || null,
          password,
          active: true,
        })
        .returning();
      res.json(result[0]);
    } catch (err: any) {
      // 23505 = unique_violation
      if (err?.code === '23505') {
        res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
        return;
      }
      fail(res, err);
    }
  });

  app.put('/api/users/:uid', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { role, groupId, active } = req.body;
      const result = await db
        .update(users)
        .set({ role, groupId, active })
        .where(eq(users.uid, req.params.uid))
        .returning();
      res.json(result[0]);
    } catch (err) {
      fail(res, err);
    }
  });

  app.delete('/api/users/:uid', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      if (req.params.uid === 'admin-local' || req.params.uid === req.dbUser?.uid) {
        res.status(400).json({ error: 'Không thể xóa tài khoản này' });
        return;
      }
      await db.delete(users).where(eq(users.uid, req.params.uid));
      res.json({ success: true });
    } catch (err) {
      fail(res, err);
    }
  });

  /* --------------------------- Đoàn viên / GV ---------------------------- */

  app.get('/api/teachers', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const [allMembers, allGroups] = await Promise.all([
        db.select().from(members).orderBy(members.name),
        db.select().from(groups).orderBy(groups.name),
      ]);
      res.json({ teachers: allMembers, groups: allGroups });
    } catch (err) {
      fail(res, err);
    }
  });

  app.post('/api/teachers', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id, name, groupId, role } = req.body;
      const result = await db
        .insert(members)
        .values({ id, name, groupId, role, active: true })
        .onConflictDoUpdate({
          target: members.id,
          set: { name, groupId, role, active: true },
        })
        .returning();
      res.json(result[0]);
    } catch (err) {
      fail(res, err);
    }
  });

  app.delete('/api/teachers/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await db.transaction(async (tx) => {
        await tx.delete(attendance).where(eq(attendance.memberId, req.params.id));
        await tx.delete(members).where(eq(members.id, req.params.id));
      });
      res.json({ success: true });
    } catch (err) {
      fail(res, err);
    }
  });

  app.put('/api/teachers/:id/active', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const result = await db
        .update(members)
        .set({ active: Boolean(req.body?.active) })
        .where(eq(members.id, req.params.id))
        .returning();
      res.json(result[0]);
    } catch (err) {
      fail(res, err);
    }
  });

  /* ------------------------------ Điểm danh ------------------------------ */

  app.get('/api/attendance/:activityId', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const activityId = req.params.activityId;
      const groupFilter = req.query.groupId as string | undefined;

      let allMembers = await db.select().from(members).orderBy(members.name);
      if (req.dbUser?.role !== 'ADMIN' && req.dbUser?.groupId) {
        allMembers = allMembers.filter((m) => m.groupId === req.dbUser?.groupId);
      } else if (groupFilter && groupFilter !== 'ALL') {
        allMembers = allMembers.filter((m) => m.groupId === groupFilter);
      }

      const records = await db
        .select()
        .from(attendance)
        .where(eq(attendance.activityId, activityId));
      const map = new Map(records.map((a) => [a.memberId, a]));

      res.json(
        allMembers.map((m) => {
          const att = map.get(m.id);
          return {
            memberId: m.id,
            name: m.name,
            groupId: m.groupId,
            role: m.role,
            active: m.active,
            present: att?.present || false,
            notes: att?.notes || '',
          };
        })
      );
    } catch (err) {
      fail(res, err);
    }
  });

  app.post('/api/attendance/:activityId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const activityId = req.params.activityId;
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

      const act = await db.select().from(activities).where(eq(activities.id, activityId));
      if (!act[0]) {
        res.status(404).json({ error: 'Không tìm thấy hoạt động' });
        return;
      }
      if (act[0].status === 'APPROVED' && req.dbUser?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Hoạt động đã duyệt, không thể sửa' });
        return;
      }

      if (rows.length > 0) {
        await db
          .insert(attendance)
          .values(
            rows.map((row: any) => ({
              activityId,
              memberId: row.memberId,
              present: Boolean(row.present),
              notes: str(row.notes),
              updatedBy: req.dbUser?.email,
            }))
          )
          .onConflictDoUpdate({
            target: [attendance.activityId, attendance.memberId],
            set: {
              present: sql`excluded.present`,
              notes: sql`excluded.notes`,
              updatedBy: sql`excluded.updated_by`,
              updatedAt: new Date(),
            },
          });
      }

      res.json({ success: true, savedAt: new Date() });
    } catch (err) {
      fail(res, err);
    }
  });

  app.get('/api/stats', optionalAuth, async (_req: AuthRequest, res) => {
    try {
      const [presentRecords, allMembers] = await Promise.all([
        db.select().from(attendance).where(eq(attendance.present, true)),
        db.select().from(members),
      ]);
      res.json({ attendance: presentRecords, members: allMembers });
    } catch (err) {
      fail(res, err);
    }
  });

  /* ---------------------- Nhập dữ liệu từ Excel/CSV ---------------------- */

  app.post('/api/import', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const payload = req.body || {};
    const inGroups: any[] = Array.isArray(payload.groups) ? payload.groups : [];
    const inMembers: any[] = Array.isArray(payload.members) ? payload.members : [];
    const inActivities: any[] = Array.isArray(payload.activities) ? payload.activities : [];
    const inAttendance: any[] = Array.isArray(payload.attendance) ? payload.attendance : [];

    const warnings: string[] = [];
    const inserted = { groups: 0, members: 0, activities: 0, attendance: 0 };

    try {
      await db.transaction(async (tx) => {
        // 1. Tổ công đoàn — gộp cả tổ được suy ra từ danh sách đoàn viên
        const groupMap = new Map<string, string>();
        for (const g of inGroups) {
          const id = str(g.id) || str(g.name);
          const name = str(g.name) || id;
          if (id) groupMap.set(id, name);
        }
        for (const m of inMembers) {
          const gid = str(m.groupId);
          if (gid && !groupMap.has(gid)) groupMap.set(gid, gid);
        }
        if (groupMap.size > 0) {
          const values = [...groupMap].map(([id, name]) => ({ id, name }));
          await tx
            .insert(groups)
            .values(values)
            .onConflictDoUpdate({ target: groups.id, set: { name: sql`excluded.name` } });
          inserted.groups = values.length;
        }

        // 2. Đoàn viên
        const memberMap = new Map<string, any>();
        for (const m of inMembers) {
          const id = str(m.id);
          const name = str(m.name);
          if (!id || !name) {
            warnings.push(`Bỏ qua đoàn viên thiếu mã hoặc họ tên: ${JSON.stringify(m)}`);
            continue;
          }
          memberMap.set(id, {
            id,
            name,
            groupId: str(m.groupId) || null,
            role: str(m.role) || 'Đoàn viên',
            active: m.active === undefined ? true : Boolean(m.active),
          });
        }
        if (memberMap.size > 0) {
          const values = [...memberMap.values()];
          await tx
            .insert(members)
            .values(values)
            .onConflictDoUpdate({
              target: members.id,
              set: {
                name: sql`excluded.name`,
                groupId: sql`excluded.group_id`,
                role: sql`excluded.role`,
                active: sql`excluded.active`,
              },
            });
          inserted.members = values.length;
        }

        // 3. Hoạt động
        const activityMap = new Map<string, any>();
        for (const a of inActivities) {
          const id = str(a.id);
          const name = str(a.name);
          if (!id || !name) {
            warnings.push(`Bỏ qua hoạt động thiếu mã hoặc tên: ${JSON.stringify(a)}`);
            continue;
          }
          activityMap.set(id, { id, name, date: str(a.date), notes: str(a.notes) });
        }
        if (activityMap.size > 0) {
          const values = [...activityMap.values()];
          await tx
            .insert(activities)
            .values(values)
            .onConflictDoUpdate({
              target: activities.id,
              set: {
                name: sql`excluded.name`,
                date: sql`excluded.date`,
                notes: sql`excluded.notes`,
              },
            });
          inserted.activities = values.length;
        }

        // 4. Điểm danh — chỉ nhận bản ghi có mã hoạt động và mã đoàn viên hợp lệ
        if (inAttendance.length > 0) {
          const knownMembers = new Set(
            (await tx.select({ id: members.id }).from(members)).map((r) => r.id)
          );
          const knownActivities = new Set(
            (await tx.select({ id: activities.id }).from(activities)).map((r) => r.id)
          );

          const seen = new Set<string>();
          const values: any[] = [];
          for (const a of inAttendance) {
            const activityId = str(a.activityId);
            const memberId = str(a.memberId);
            if (!knownActivities.has(activityId)) {
              warnings.push(`Không có hoạt động "${activityId}", bỏ qua bản ghi điểm danh.`);
              continue;
            }
            if (!knownMembers.has(memberId)) {
              warnings.push(`Không có đoàn viên "${memberId}", bỏ qua bản ghi điểm danh.`);
              continue;
            }
            const key = `${activityId}::${memberId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            values.push({
              activityId,
              memberId,
              present: Boolean(a.present),
              notes: str(a.notes),
              updatedBy: req.dbUser?.email,
            });
          }

          if (values.length > 0) {
            await tx
              .insert(attendance)
              .values(values)
              .onConflictDoUpdate({
                target: [attendance.activityId, attendance.memberId],
                set: {
                  present: sql`excluded.present`,
                  notes: sql`excluded.notes`,
                  updatedBy: sql`excluded.updated_by`,
                  updatedAt: new Date(),
                },
              });
            inserted.attendance = values.length;
          }
        }
      });

      res.json({ success: true, inserted, warnings: warnings.slice(0, 50) });
    } catch (err) {
      fail(res, err);
    }
  });

  /* ------------------------------- Frontend ------------------------------ */

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer();
