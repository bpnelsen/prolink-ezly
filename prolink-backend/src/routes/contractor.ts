import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { contractorService } from '../services/contractor.service';
import { requireAuth, requireContractor } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth, requireContractor);

const updateProfileSchema = z.object({
  business_name: z.string().min(1).optional(),
  business_type: z.enum(['sole_proprietor', 'llc', 'corporation', 'partnership']).optional(),
  ein: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  founded_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  employee_count: z.number().int().min(0).optional(),
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const tradeSchema = z.object({
  trade: z.string().min(1),
  years_experience: z.number().int().min(0).optional(),
  is_primary: z.boolean().optional(),
});

const serviceAreaSchema = z.object({
  state_code: z.string().length(2),
  county: z.string().optional(),
  zip_code: z.string().optional(),
  radius_miles: z.number().int().min(0).optional(),
});

const licenseSchema = z.object({
  state_code: z.string().length(2),
  license_type: z.string().min(1),
  license_number: z.string().min(1),
  issuing_authority: z.string().optional(),
  issued_date: z.string().optional(),
  expiration_date: z.string().optional(),
  status: z.enum(['active', 'expired', 'suspended', 'pending']).optional(),
  document_url: z.string().url().optional(),
});

const insuranceSchema = z.object({
  insurance_type: z.enum(['general_liability', 'workers_comp', 'professional', 'commercial_auto', 'umbrella']),
  provider: z.string().optional(),
  policy_number: z.string().optional(),
  coverage_amount: z.number().min(0).optional(),
  expiration_date: z.string().optional(),
  document_url: z.string().url().optional(),
});

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await contractorService.getProfile(req.user!.id);
    res.json({ data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profile';
    res.status(500).json({ error: message });
  }
});

router.put('/profile', validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const profile = await contractorService.updateProfile(
      req.user!.contractor_id!,
      req.user!.id,
      req.body
    );
    res.json({ data: profile, message: 'Profile updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(500).json({ error: message });
  }
});

router.post('/trades', validate(tradeSchema), async (req: Request, res: Response) => {
  try {
    const trade = await contractorService.addTrade(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: trade, message: 'Trade added' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add trade';
    res.status(500).json({ error: message });
  }
});

router.delete('/trades/:id', async (req: Request, res: Response) => {
  try {
    await contractorService.deleteTrade(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Trade removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove trade';
    res.status(500).json({ error: message });
  }
});

router.post('/service-areas', validate(serviceAreaSchema), async (req: Request, res: Response) => {
  try {
    const area = await contractorService.addServiceArea(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: area, message: 'Service area added' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add service area';
    res.status(500).json({ error: message });
  }
});

router.delete('/service-areas/:id', async (req: Request, res: Response) => {
  try {
    await contractorService.deleteServiceArea(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Service area removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove service area';
    res.status(500).json({ error: message });
  }
});

router.post('/licenses', validate(licenseSchema), async (req: Request, res: Response) => {
  try {
    const license = await contractorService.addLicense(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: license, message: 'License added' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add license';
    res.status(500).json({ error: message });
  }
});

router.put('/licenses/:id', validate(licenseSchema.partial()), async (req: Request, res: Response) => {
  try {
    const license = await contractorService.updateLicense(
      req.user!.contractor_id!,
      req.params.id,
      req.body
    );
    res.json({ data: license, message: 'License updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update license';
    res.status(500).json({ error: message });
  }
});

router.delete('/licenses/:id', async (req: Request, res: Response) => {
  try {
    await contractorService.deleteLicense(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'License removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove license';
    res.status(500).json({ error: message });
  }
});

router.post('/insurance', validate(insuranceSchema), async (req: Request, res: Response) => {
  try {
    const record = await contractorService.addInsurance(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: record, message: 'Insurance added' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add insurance';
    res.status(500).json({ error: message });
  }
});

router.put('/insurance/:id', validate(insuranceSchema.partial()), async (req: Request, res: Response) => {
  try {
    const record = await contractorService.updateInsurance(
      req.user!.contractor_id!,
      req.params.id,
      req.body
    );
    res.json({ data: record, message: 'Insurance updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update insurance';
    res.status(500).json({ error: message });
  }
});

router.delete('/insurance/:id', async (req: Request, res: Response) => {
  try {
    await contractorService.deleteInsurance(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Insurance record removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove insurance';
    res.status(500).json({ error: message });
  }
});

export default router;
