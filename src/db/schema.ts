import { relations } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('USER'), // 'ADMIN', 'TOTRUONG', 'USER'
  groupId: text('group_id'),
  password: text('password'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const groups = pgTable('groups', {
  id: text('id').primaryKey(), // MaTo
  name: text('name').notNull(), // TenTo
});

export const members = pgTable('members', {
  id: text('id').primaryKey(), // MaDV
  name: text('name').notNull(), // HoTen
  groupId: text('group_id').references(() => groups.id),
  role: text('role'), // ChucVu
  active: boolean('active').default(true),
});

export const activities = pgTable('activities', {
  id: text('id').primaryKey(), // MaHD
  name: text('name').notNull(), // TenHoatDong
  date: text('date'), // Ngay
  notes: text('notes'), // GhiChu
  status: text('status').default('OPEN'), // 'OPEN' or 'APPROVED'
  createdAt: timestamp('created_at').defaultNow(),
  approvedAt: timestamp('approved_at'),
  approvedBy: text('approved_by'),
});

export const attendance = pgTable('attendance', {
  activityId: text('activity_id').references(() => activities.id).notNull(),
  memberId: text('member_id').references(() => members.id).notNull(),
  present: boolean('present').default(false),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: text('updated_by'),
}, (table) => ({
  pk: primaryKey({ columns: [table.activityId, table.memberId] }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  group: one(groups, {
    fields: [members.groupId],
    references: [groups.id],
  }),
  attendance: many(attendance),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(members),
}));

export const activitiesRelations = relations(activities, ({ many }) => ({
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  activity: one(activities, {
    fields: [attendance.activityId],
    references: [activities.id],
  }),
  member: one(members, {
    fields: [attendance.memberId],
    references: [members.id],
  }),
}));
