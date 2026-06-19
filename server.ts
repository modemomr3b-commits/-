import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index";
import { users, products, categories, orders, orderItems, updates } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // PRODUCTS
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
      res.json(allProducts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/products", async (req, res) => {
    try {
      const inserted = await db.insert(products).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      const updated = await db.update(products).set(req.body).where(eq(products.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      await db.delete(products).where(eq(products.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CATEGORIES
  app.get("/api/categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(categories).orderBy(categories.order);
      res.json(allCategories);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/categories", async (req, res) => {
    try {
      const inserted = await db.insert(categories).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/categories/:id", async (req, res) => {
    try {
      const updated = await db.update(categories).set(req.body).where(eq(categories.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await db.delete(categories).where(eq(categories.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // USERS
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, req.params.id));
      res.json(user.length > 0 ? user[0] : null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/users", async (req, res) => {
    try {
      const inserted = await db.insert(users).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/users/:id", async (req, res) => {
    try {
      const updated = await db.update(users).set(req.body).where(eq(users.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/users/:id", async (req, res) => {
    try {
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ORDERS
  app.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      res.json(allOrders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/orders", async (req, res) => {
    try {
      const inserted = await db.insert(orders).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/orders/:id", async (req, res) => {
    try {
      const updated = await db.update(orders).set(req.body).where(eq(orders.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await db.delete(orders).where(eq(orders.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // UPDATES / NOTIFICATIONS
  app.get("/api/updates", async (req, res) => {
    try {
      const allUpdates = await db.select().from(updates).orderBy(desc(updates.createdAt));
      res.json(allUpdates);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/updates", async (req, res) => {
    try {
      const inserted = await db.insert(updates).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/updates/:id", async (req, res) => {
    try {
      await db.delete(updates).where(eq(updates.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
