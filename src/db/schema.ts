import { pgTable, text, boolean, integer, timestamp, uuid, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  role: text('role').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  parentId: uuid('parent_id'),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  modelNumber: text('model_number').notNull(),
  productCode: text('product_code').notNull(),
  barcode: text('barcode').notNull(),
  categoryId: text('category_id').notNull(), // using text to match previous usage logic possibly
  subcategoryId: text('subcategory_id'),
  imageUrl: text('image_url').notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  views: integer('views').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  status: text('status').notNull(),
  totalQuantity: integer('total_quantity').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const updates = pgTable('updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
