import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    let contractor_id: string | undefined;

    if (profile.role === 'contractor') {
      const { data: contractor } = await supabase
        .from('contractors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      contractor_id = contractor?.id;
    }

    req.user = {
      id: user.id,
      email: user.email ?? profile.email,
      role: profile.role as 'contractor' | 'admin',
      contractor_id,
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err });
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function requireContractor(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.contractor_id) {
    res.status(403).json({ error: 'Contractor profile required', code: 'CONTRACTOR_REQUIRED' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' });
    return;
  }
  next();
}
