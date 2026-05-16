import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import prisma from '../db/index';

const router = Router();

// ── GET FARMER PROFILE ─────────────────────────────────────────────
router.get('/profile', protect, async (req: AuthRequest, res: Response) => {
  try {
    const farmer = await prisma.farmer.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { name: true, email: true, phone: true } }, fields: true }
    });
    
    if (!farmer) {
      res.status(404).json({ error: 'Farmer profile not found' });
      return;
    }
    
    res.json({ farmer });
  } catch (error) {
    console.error('Get farmer profile error:', error);
    res.status(500).json({ error: 'Failed to get farmer profile' });
  }
});

// ── UPDATE FARMER PROFILE ──────────────────────────────────────────
router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { farmSize, mainCrops, soilType, hasIrrigation, experience } = req.body;
    
    const farmer = await prisma.farmer.update({
      where: { userId: req.user!.id },
      data: {
        farmSize: farmSize || undefined,
        mainCrops: mainCrops ? JSON.stringify(mainCrops) : undefined,
        soilType: soilType || undefined,
        hasIrrigation: hasIrrigation ?? undefined,
        experience: experience || undefined,
      },
    });
    
    res.json({ success: true, farmer });
  } catch (error) {
    console.error('Update farmer profile error:', error);
    res.status(500).json({ error: 'Failed to update farmer profile' });
  }
});

// ── SAVE ONBOARDING DATA (First time setup) ───────────────────────
router.post('/onboarding', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { farmSize, mainCrops, soilType, hasIrrigation, experience } = req.body;
    
    const farmer = await prisma.farmer.update({
      where: { userId: req.user!.id },
      data: {
        farmSize,
        mainCrops: mainCrops ? JSON.stringify(mainCrops) : undefined,
        soilType,
        hasIrrigation: hasIrrigation ?? false,
        experience,
        onboardingCompleted: true,
      },
    });
    
    res.json({ success: true, farmer });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to save onboarding data' });
  }
});

// ── CHECK ONBOARDING STATUS ───────────────────────────────────────
router.get('/onboarding-status', protect, async (req: AuthRequest, res: Response) => {
  try {
    const farmer = await prisma.farmer.findUnique({
      where: { userId: req.user!.id },
      select: { onboardingCompleted: true }
    });
    
    res.json({ completed: farmer?.onboardingCompleted ?? false });
  } catch (error) {
    console.error('Check onboarding status error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ── GET FARMER'S FIELDS ───────────────────────────────────────────
router.get('/fields', protect, async (req: AuthRequest, res: Response) => {
  try {
    const farmer = await prisma.farmer.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!farmer) {
      res.json({ fields: [] });
      return;
    }
    
    const fields = await prisma.field.findMany({
      where: { farmerId: farmer.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ fields });
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({ error: 'Failed to get fields' });
  }
});

// ── GET FARMER'S LISTINGS ─────────────────────────────────────────
router.get('/listings', protect, async (req: AuthRequest, res: Response) => {
  try {
    const farmer = await prisma.farmer.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!farmer) {
      res.json({ listings: [] });
      return;
    }
    
    const listings = await prisma.listing.findMany({
      where: { farmerId: farmer.id },
      include: {
        requests: true,
        matches: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ listings });
  } catch (error) {
    console.error('Get farmer listings error:', error);
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

export default router;