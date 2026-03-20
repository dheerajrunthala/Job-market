import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

// ─── Setup ───────────────────────────────────────────────
const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = "super-secret-key"; // fine for learning, never do this in production

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Extend Express Request to carry our user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; role: string } | null;
    }
  }
}

// ─── Auth Middleware ──────────────────────────────────────
// "Soft" auth — attaches user if token exists, otherwise sets null
async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true },
      });
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}

// "Hard" auth — returns 401 if not logged in
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

app.use(attachUser);

// ─── Auth Routes ─────────────────────────────────────────

// POST /api/auth/signup
app.post("/api/auth/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, name, isAdmin } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password, // plaintext to match seed data — never do this in production
        name,
        role: isAdmin ? "ADMIN" : "USER",
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { httpOnly: true, maxAge: 86400000 }); // 24h

    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { httpOnly: true, maxAge: 86400000 });

    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("token");
  return res.json({ success: true });
});

// GET /api/auth/me — returns current user with appliedJobs & ownedJobs
app.get("/api/auth/me", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.json(null);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      appliedJobs: { include: { company: true } },
      ownedJobs: { include: { company: true } },
    },
  });

  if (!user) return res.json(null);

  // Strip password from response
  const { password, ...safeUser } = user;
  return res.json(safeUser);
});

// ─── Job Routes ──────────────────────────────────────────

// GET /api/jobs?query=... — search jobs, includes isApplied per user
app.get("/api/jobs", async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string) || "";

    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { company: { name: { contains: query } } },
        ],
      },
      include: {
        company: true,
        applicants: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to add isApplied and remove raw applicants list
    const result = jobs.map((job) => {
      const { applicants, ...rest } = job;
      return {
        ...rest,
        isApplied: req.user
          ? applicants.some((a) => a.id === req.user!.id)
          : false,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to search jobs" });
  }
});

// POST /api/jobs — create a job (auth required)
app.post("/api/jobs", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, companyName, location, type, remote, salary } = req.body;

    // Find or create the company
    let company = await prisma.company.findFirst({ where: { name: companyName } });
    if (!company) {
      company = await prisma.company.create({ data: { name: companyName } });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        type,
        remote,
        salary,
        companyId: company.id,
        ownerId: req.user!.id,
      },
      include: { company: true },
    });

    return res.json(job);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create job" });
  }
});

// DELETE /api/jobs/:id — delete a job (auth required)
app.delete("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.job.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete job" });
  }
});

// POST /api/jobs/:id/apply — apply for a job (auth required)
app.post("/api/jobs/:id/apply", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.job.update({
      where: { id },
      data: { applicants: { connect: { id: req.user!.id } } },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to apply" });
  }
});

// DELETE /api/jobs/:id/apply — cancel application (auth required)
app.delete("/api/jobs/:id/apply", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.job.update({
      where: { id },
      data: { applicants: { disconnect: { id: req.user!.id } } },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to cancel application" });
  }
});

// ─── Start Server ────────────────────────────────────────
app.listen(4000, () => {
  console.log("REST API running on http://localhost:4000");
});
