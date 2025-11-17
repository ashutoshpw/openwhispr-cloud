import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  created_time: timestamp('created_time').defaultNow().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  first_name: varchar('first_name', { length: 255 }),
  last_name: varchar('last_name', { length: 255 }),
  gender: varchar('gender', { length: 50 }),
  profile_image_url: varchar('profile_image_url', { length: 500 }),
  user_id: varchar('user_id', { length: 255 }).unique().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  created_time: timestamp('created_time').defaultNow().notNull(),
  payment: varchar('payment', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  amount: varchar('amount', { length: 255 }).notNull(),
  payment_time: varchar('payment_time', { length: 255 }).notNull(),
  payment_date: varchar('payment_date', { length: 255 }).notNull(),
  receipt_email: varchar('receipt_email', { length: 255 }).notNull(),
  receipt_url: varchar('receipt_url', { length: 500 }).notNull(),
  payment_details: varchar('payment_details', { length: 5000 }).notNull(),
  billing_details: varchar('billing_details', { length: 5000 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
