// apps/api/src/routes/referrals.ts
//
// Express routes for the referral program.
// Wire-up:
//   import referralsRouter from "./routes/referrals";
//   app.use("/api/referrals", referralsRouter);

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";

// Pull these from env in real code.
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const REFERRAL_TRIAL_EXTENSION_DAYS = Number(
  process.env.REFERRAL_TRIAL_EXTENSION_DAYS ?? 14
);

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Code generator: 8 chars, no ambiguous (0/O, 1/I/l) chars.
const generateCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 8);

const router = Router();

// ---------------------------------------------------------------------------
// Middleware: require authenticated user, attach user id to req.
// Replace with your existing auth middleware if you already have one.
// ---------------------------------------------------------------------------
interface AuthedRequest extends Request {
  userId?: string;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "missing_token" });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "invalid_token" });
  req.userId = data.user.id;
  next();
}

// ---------------------------------------------------------------------------
// GET /api/referrals/me
// Returns the user's referral code (creates it on first call) and a summary.
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  // Read or create the code.
  let { data: codeRow, error: codeErr } = await admin
    .from("referral_codes")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (codeErr) return res.status(500).json({ error: codeErr.message });

  if (!codeRow) {
    // Attempt insert; retry on collision (extremely unlikely with 8-char alphabet).
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await admin
        .from("referral_codes")
        .insert({ user_id: userId, code })
        .select()
        .single();
      if (!error) {
        codeRow = data;
        break;
      }
      if (error.code !== "23505") {
        // not a unique-violation; bail
        return res.status(500).json({ error: error.message });
      }
    }
    if (!codeRow) return res.status(500).json({ error: "code_generation_failed" });
  }

  const { data: summary } = await admin
    .from("referral_summary")
    .select("pending_count, converted_count, rewarded_count")
    .eq("referrer_user_id", userId)
    .single();

  return res.json({
    code: codeRow.code,
    shareUrl: `${process.env.APP_URL}/signup?ref=${codeRow.code}`,
    summary: summary ?? { pending_count: 0, converted_count: 0, rewarded_count: 0 },
  });
});

// ---------------------------------------------------------------------------
// POST /api/referrals/attribute
// Body: { referredUserId, referralCode }
// Called server-side from the signup flow right after Supabase creates the user.
// Idempotent: re-calling with the same referredUserId is a no-op.
// ---------------------------------------------------------------------------
const attributeSchema = z.object({
  referredUserId: z.string().uuid(),
  referralCode: z.string().min(4).max(16),
});

router.post("/attribute", async (req, res) => {
  // This endpoint is called server-to-server from your signup handler.
  // Protect it with a shared secret.
  if (req.headers["x-internal-secret"] !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }

  const parsed = attributeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { referredUserId, referralCode } = parsed.data;

  const { data: code, error: codeErr } = await admin
    .from("referral_codes")
    .select("user_id, code")
    .eq("code", referralCode.toUpperCase())
    .maybeSingle();
  if (codeErr) return res.status(500).json({ error: codeErr.message });
  if (!code) return res.status(404).json({ error: "code_not_found" });

  if (code.user_id === referredUserId) {
    return res.status(400).json({ error: "self_referral" });
  }

  const { error: insertErr } = await admin.from("referrals").insert({
    referrer_user_id: code.user_id,
    referred_user_id: referredUserId,
    referral_code: code.code,
    status: "signed_up",
  });

  if (insertErr) {
    // 23505 = unique violation on referred_user_id (already attributed). Idempotent no-op.
    if (insertErr.code === "23505") return res.status(200).json({ ok: true, already: true });
    return res.status(500).json({ error: insertErr.message });
  }

  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/referrals/fire-reward
// Body: { referredUserId }
// Called from the Stripe webhook handler when the referred user makes their
// first successful paid charge. Extends the referrer's trial.
// ---------------------------------------------------------------------------
const fireSchema = z.object({
  referredUserId: z.string().uuid(),
});

router.post("/fire-reward", async (req, res) => {
  if (req.headers["x-internal-secret"] !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }

  const parsed = fireSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { referredUserId } = parsed.data;

  // Look up the referral row.
  const { data: ref, error: refErr } = await admin
    .from("referrals")
    .select("*")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();
  if (refErr) return res.status(500).json({ error: refErr.message });
  if (!ref) return res.status(200).json({ ok: true, noop: "not_referred" });

  if (ref.status === "reward_applied") {
    return res.status(200).json({ ok: true, already: true });
  }

  // Apply the trial extension to the referrer.
  // Replace this block with your real subscription model.
  const { data: trial, error: trialErr } = await admin
    .from("user_trials")
    .select("trial_ends_at")
    .eq("user_id", ref.referrer_user_id)
    .maybeSingle();
  if (trialErr) return res.status(500).json({ error: trialErr.message });

  const now = new Date();
  const baseEnd = trial?.trial_ends_at ? new Date(trial.trial_ends_at) : now;
  const newEnd = new Date(
    Math.max(baseEnd.getTime(), now.getTime()) +
      REFERRAL_TRIAL_EXTENSION_DAYS * 86_400_000
  );

  await admin
    .from("user_trials")
    .upsert(
      { user_id: ref.referrer_user_id, trial_ends_at: newEnd.toISOString() },
      { onConflict: "user_id" }
    );

  await admin
    .from("referrals")
    .update({
      status: "reward_applied",
      converted_at: ref.converted_at ?? now.toISOString(),
      reward_applied_at: now.toISOString(),
      reward_metadata: {
        trial_extended_until: newEnd.toISOString(),
        days_added: REFERRAL_TRIAL_EXTENSION_DAYS,
      },
    })
    .eq("id", ref.id);

  return res.json({
    ok: true,
    referrer: ref.referrer_user_id,
    newTrialEndsAt: newEnd.toISOString(),
  });
});

export default router;
