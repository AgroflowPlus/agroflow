import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import prisma from '../db/index';

const router = Router();

// ── GET BUYER PROFILE ──────────────────────────────────────────────
router.get('/profile', protect, async (req: AuthRequest, res: Response) => {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { name: true, email: true, phone: true } } }
    });
    
    if (!buyer) {
      res.status(404).json({ error: 'Buyer profile not found' });
      return;
    }
    
    res.json({ buyer });
  } catch (error) {
    console.error('Get buyer profile error:', error);
    res.status(500).json({ error: 'Failed to get buyer profile' });
  }
});

// ── UPDATE BUYER PROFILE ───────────────────────────────────────────
router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { preferredLocation, preferredCrops, purchaseFrequency, preferredQuantity, deliveryPreference, maxDistance } = req.body;
    
    const buyer = await prisma.buyer.update({
      where: { userId: req.user!.id },
      data: {
        preferredLocation: preferredLocation || undefined,
        preferredCrops: preferredCrops ? JSON.stringify(preferredCrops) : undefined,
        purchaseFrequency: purchaseFrequency || undefined,
        preferredQuantity: preferredQuantity || undefined,
        deliveryPreference: deliveryPreference || undefined,
        maxDistance: maxDistance || undefined,
      },
    });
    
    res.json({ success: true, buyer });
  } catch (error) {
    console.error('Update buyer profile error:', error);
    res.status(500).json({ error: 'Failed to update buyer profile' });
  }
});

// ── SAVE ONBOARDING DATA (First time setup) ───────────────────────
router.post('/onboarding', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { preferredLocation, preferredCrops, purchaseFrequency, preferredQuantity, deliveryPreference, maxDistance } = req.body;
    
    const buyer = await prisma.buyer.update({
      where: { userId: req.user!.id },
      data: {
        preferredLocation,
        preferredCrops: preferredCrops ? JSON.stringify(preferredCrops) : undefined,
        purchaseFrequency,
        preferredQuantity,
        deliveryPreference,
        maxDistance,
        onboardingCompleted: true,
      },
    });
    
    res.json({ success: true, buyer });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to save onboarding data' });
  }
});

// ── CHECK ONBOARDING STATUS ───────────────────────────────────────
router.get('/onboarding-status', protect, async (req: AuthRequest, res: Response) => {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: req.user!.id },
      select: { onboardingCompleted: true }
    });
    
    res.json({ completed: buyer?.onboardingCompleted ?? false });
  } catch (error) {
    console.error('Check onboarding status error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ── GET BUYER'S DEMANDS ───────────────────────────────────────────
router.get('/demands', protect, async (req: AuthRequest, res: Response) => {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!buyer) {
      res.json({ demands: [] });
      return;
    }
    
    const demands = await prisma.demand.findMany({
      where: { buyerId: buyer.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ demands });
  } catch (error) {
    console.error('Get demands error:', error);
    res.status(500).json({ error: 'Failed to get demands' });
  }
});

// ── GET BUYER'S MATCHES ───────────────────────────────────────────
router.get('/matches', protect, async (req: AuthRequest, res: Response) => {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!buyer) {
      res.json({ matches: [] });
      return;
    }
    
    const matches = await prisma.match.findMany({
      where: { buyerId: buyer.id },
      include: {
        listing: { include: { seller: { include: { user: true } } } },
        seller: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ matches });
  } catch (error) {
    console.error('Get buyer matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

export default router;