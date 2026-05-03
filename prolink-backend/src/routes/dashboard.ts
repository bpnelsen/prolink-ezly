import { Router, Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { requireAuth, requireContractor } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireContractor);

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await dashboardService.getSummary(req.user!.contractor_id!);
    res.json({ data: summary });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch summary' });
  }
});

// Added Financial/Report Summary endpoint
router.get('/report-summary', async (req: Request, res: Response) => {
  try {
    const contractorId = req.user!.contractor_id!;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    
    // Aggregate financial and operational reports in parallel
    const [summary, revenue, leads] = await Promise.all([
      dashboardService.getSummary(contractorId),
      dashboardService.getRevenue(contractorId, year),
      dashboardService.getLeads(contractorId),
    ]);
    
    res.json({
      data: { 
        summary, 
        revenue, 
        leads,
        // Financial focus
        financials: {
          total_revenue: summary.invoices.total_revenue,
          outstanding_balance: summary.invoices.outstanding,
          overdue_invoices: summary.invoices.overdue_count,
          open_invoices: summary.invoices.open_count
        }
      },
      message: 'Consolidated financial report summary fetched'
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch report summary' });
  }
});

router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const revenue = await dashboardService.getRevenue(req.user!.contractor_id!, year);
    res.json({ data: revenue });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch revenue' });
  }
});

router.get('/leads', async (req: Request, res: Response) => {
  try {
    const leads = await dashboardService.getLeads(req.user!.contractor_id!);
    res.json({ data: leads });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch lead stats' });
  }
});

export default router;
