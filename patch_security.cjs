const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('helmet')) {
  code = code.replace(
    /import cors from "cors";/,
    `import cors from "cors";\nimport helmet from "helmet";\nimport rateLimit from "express-rate-limit";`
  );
  
  const middleware = `
  app.use(helmet({
    contentSecurityPolicy: false, // disabled for vite in dev
    crossOriginEmbedderPolicy: false
  }));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);
  
  // Custom API Key middleware for sensitive routes if needed
  const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real scenario, verify Supabase JWT token here
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
`;

  code = code.replace(
    /app\.use\(express\.json\(\)\);/,
    `app.use(express.json({ limit: '10mb' }));\n${middleware}`
  );
  
  // Also we should disable unused/unsafe routes if they don't have RLS or we don't need them
  // Or at least protect them with requireAdmin
  code = code.replace(/app\.post\("\/api\/products"/g, 'app.post("/api/products", requireAdmin');
  code = code.replace(/app\.put\("\/api\/products\/:id"/g, 'app.put("/api/products/:id", requireAdmin');
  code = code.replace(/app\.delete\("\/api\/products\/:id"/g, 'app.delete("/api/products/:id", requireAdmin');
  
  code = code.replace(/app\.post\("\/api\/categories"/g, 'app.post("/api/categories", requireAdmin');
  code = code.replace(/app\.put\("\/api\/categories\/:id"/g, 'app.put("/api/categories/:id", requireAdmin');
  code = code.replace(/app\.delete\("\/api\/categories\/:id"/g, 'app.delete("/api/categories/:id", requireAdmin');
  
  code = code.replace(/app\.post\("\/api\/orders"/g, 'app.post("/api/orders", requireAdmin');
  code = code.replace(/app\.put\("\/api\/orders\/:id"/g, 'app.put("/api/orders/:id", requireAdmin');
  code = code.replace(/app\.delete\("\/api\/orders\/:id"/g, 'app.delete("/api/orders/:id", requireAdmin');
  
  fs.writeFileSync('server.ts', code);
}
