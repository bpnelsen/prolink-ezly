import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { supabaseAnon } from '../config/supabase';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  business_name: z.string().min(1),
  business_type: z.enum(['sole_proprietor', 'llc', 'corporation', 'partnership']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ data: result, message: 'Registration successful' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message, code: 'REGISTER_FAILED' });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json({ data: result, message: 'Login successful' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message, code: 'LOGIN_FAILED' });
  }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(req.body.email, {
      redirectTo: `${req.protocol}://${req.get('host')}/reset-password`,
    });
    if (error) throw error;
    res.json({ message: 'Reset email sent' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send reset email';
    res.status(500).json({ error: message });
  }
});

router.post('/logout', requireAuth, async (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  try {
    const session = await authService.refresh(req.body.refresh_token);
    res.json({ data: { session } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    res.status(401).json({ error: message, code: 'REFRESH_FAILED' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await authService.me(req.user!.id);
    res.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user';
    res.status(500).json({ error: message, code: 'FETCH_FAILED' });
  }
});

export default router;
