import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface BuyerProfile {
  id: string;
  preferredCrops: string[];
  preferredLocation: string;
  purchaseFrequency: string;
  preferredQuantity: number;
  deliveryPreference: string;
  maxDistance: number;
  previousMatches?: string[];
}

interface SellerListing {
  id: string;
  sellerId: string;
  cropType: string;
  quantity: number;
  remainingQty: number;
  location: string;
  description: string;
  sellerRating?: number;
  createdAt: string;
}

interface MatchScore {
  listingId: string;
  sellerId: string;
  score: number;
  reasons: string[];
  distance: number;
}

export async function calculateAIMatchScore(
  buyer: BuyerProfile,
  listing: SellerListing,
  distance: number
): Promise<MatchScore> {
  const prompt = `
You are an AI matching system for AgroFlow+, an agricultural marketplace in Akure, Nigeria.

Analyze this buyer-seller pair and return a match score from 0-100.

BUYER:
- Preferred crops: ${buyer.preferredCrops?.join(', ') || 'Any'}
- Preferred location: ${buyer.preferredLocation || 'Any'}
- Purchase frequency: ${buyer.purchaseFrequency || 'Not specified'}
- Preferred quantity: ${buyer.preferredQuantity || 'Any'} kg
- Delivery preference: ${buyer.deliveryPreference || 'Any'}
- Max travel distance: ${buyer.maxDistance || 15} km

SELLER LISTING:
- Crop: ${listing.cropType}
- Quantity available: ${listing.remainingQty} kg
- Location: ${listing.location}
- Distance from buyer: ${distance} km

CONSIDER:
1. Crop match (40% weight)
2. Distance (25% weight) - closer is better
3. Quantity match (20% weight)
4. Location preference (15% weight)

Return ONLY valid JSON in this format:
{
  "score": number (0-100),
  "reasons": ["reason1", "reason2"]
}
`;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      listingId: listing.id,
      sellerId: listing.sellerId,
      score: result.score || 50,
      reasons: result.reasons || ['Standard match'],
      distance,
    };
  } catch (error) {
    console.error('AI matching error:', error);
    // Fallback to rule-based scoring
    return calculateRuleBasedScore(buyer, listing, distance);
  }
}

function calculateRuleBasedScore(
  buyer: BuyerProfile,
  listing: SellerListing,
  distance: number
): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // Crop match (40 points)
  if (buyer.preferredCrops?.includes(listing.cropType)) {
    score += 40;
    reasons.push(`Crop match: ${listing.cropType}`);
  } else {
    score += 10;
    reasons.push('Crop type not preferred');
  }

  // Distance (25 points)
  if (distance <= 5) {
    score += 25;
    reasons.push(`Very close (${distance}km)`);
  } else if (distance <= 10) {
    score += 18;
    reasons.push(`Moderate distance (${distance}km)`);
  } else if (distance <= 15) {
    score += 10;
    reasons.push(`Acceptable distance (${distance}km)`);
  } else {
    score += 5;
    reasons.push(`Far distance (${distance}km)`);
  }

  // Quantity match (20 points)
  if (listing.remainingQty >= (buyer.preferredQuantity || 0)) {
    score += 20;
    reasons.push('Quantity meets preference');
  } else if (listing.remainingQty > 0) {
    score += 10;
    reasons.push('Partial quantity available');
  }

  // Location match (15 points)
  if (buyer.preferredLocation === listing.location) {
    score += 15;
    reasons.push('Same location preference');
  } else if (buyer.preferredLocation) {
    score += 5;
    reasons.push('Different location');
  } else {
    score += 10;
    reasons.push('No location preference set');
  }

  return {
    listingId: listing.id,
    sellerId: listing.sellerId,
    score,
    reasons,
    distance,
  };
}

export async function getTopMatches(
  buyer: BuyerProfile,
  listings: SellerListing[],
  limit: number = 5
): Promise<MatchScore[]> {
  const scores: MatchScore[] = [];
  
  for (const listing of listings) {
    const distance = calculateDistance(buyer.preferredLocation, listing.location);
    if (distance <= (buyer.maxDistance || 15)) {
      const score = await calculateAIMatchScore(buyer, listing, distance);
      scores.push(score);
    }
  }
  
  // Sort by score descending and return top matches
  return scores.sort((a, b) => b.score - a.score).slice(0, limit);
}

function calculateDistance(loc1?: string, loc2?: string): number {
  // Use your existing haversineDistance function
  return 5; // Placeholder - use your actual distance function
}