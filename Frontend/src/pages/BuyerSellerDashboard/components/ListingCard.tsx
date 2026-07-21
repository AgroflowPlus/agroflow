import { useState } from 'react';
import { RiMapPinLine } from "react-icons/ri";
import { MdAddShoppingCart, MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { CROP_ICON } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Listing, CropType } from "../../../services/marketService";
import { useCartStore } from '../../../store/cartStore';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { useToast } from '../../../context/ToastContext';

interface ListingCardProps {
  listing: Listing;
  intent: "buy" | "sell";
  onRequestToBuy: (listing: Listing) => void;
  onClick?: (listing: Listing) => void;
  matchScore?: number;
  matchReasons?: string[];
}

export function ListingCard({ 
  listing, intent, onClick, matchScore, matchReasons = []
}: ListingCardProps) {
  const [showReasons, setShowReasons] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const addItem    = useCartStore(s => s.addItem);
  const cartItems  = useCartStore(s => s.items);
  const inCart     = cartItems.some(i => i.listing.id === listing.id);

  const { toggleListing, isLiked } = useFavoritesStore();
  const liked = isLiked(listing.id);
  const { addToast } = useToast();

  const handleCardClick = () => {
    if (onClick) onClick(listing);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAddingToCart || inCart) return;
    setIsAddingToCart(true);
    try {
      addItem(listing, 1);
      addToast('Added to cart!', 'success');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div
      className={styles.marketplaceCard}
      onClick={handleCardClick}
      style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative' }}
    >
      {/* ── IMAGE AREA ── */}
      <div className={styles.cardImageArea}>
        {listing.photoUrl ? (
          <img src={listing.photoUrl} alt={listing.cropType} className={styles.cardImage} />
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <span style={{ fontSize: 40 }}>{CROP_ICON[listing.cropType as CropType] || '🌾'}</span>
          </div>
        )}

        {/* Crop badge — top left */}
        <div className={styles.cropBadge}>
          {CROP_ICON[listing.cropType as CropType]} {listing.cropType}
        </div>

        {/* Heart — top right (buyer only) */}
        {intent === 'buy' && (
          <button
            className={styles.heartBtn}
            onClick={(e) => {
              e.stopPropagation();
              toggleListing(listing.id);
              addToast(liked ? 'Removed from favorites' : 'Added to favorites', 'success');
            }}
            aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
          >
            {liked
              ? <MdFavorite size={16} color="#e05252" />
              : <MdFavoriteBorder size={16} color="#9ead9f" />
            }
          </button>
        )}

        {/* Cart button — bottom right of image (buyer only) */}
        {intent === 'buy' && listing.status !== 'sold' && (
          <button
            onClick={handleAddToCart}
            style={{
              position: 'absolute', bottom: matchScore ? 32 : 8, right: 8,
              width: 32, height: 32, borderRadius: '50%',
              background: inCart ? '#a8d832' : 'rgba(255,255,255,0.95)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              zIndex: 2, transition: 'all 0.15s',
            }}
            aria-label={inCart ? 'In cart' : 'Add to cart'}
          >
            <MdAddShoppingCart size={16} color={inCart ? '#141f15' : '#6b7f6e'} />
          </button>
        )}

        {/* Match bar */}
        {matchScore && (
          <div className={styles.matchBar}>
            <span className={styles.matchBadge}>{matchScore}% Match</span>
            <button
              className={styles.whyBtn}
              onClick={(e) => { e.stopPropagation(); setShowReasons(r => !r) }}
            >
              {showReasons ? 'Close ✕' : 'Why? →'}
            </button>
            {showReasons && matchReasons.length > 0 && (
              <div className={styles.reasonsOverlay}>
                {matchReasons.map((r, i) => (
                  <span key={i} className={styles.reasonItem}>✓ {r}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sold overlay */}
        {listing.status === 'sold' && (
          <div className={styles.statusOverlay}>
            <span>Sold Out</span>
          </div>
        )}
      </div>

      {/* ── MINIMAL INFO BELOW IMAGE ── */}
      <div style={{ padding: '10px 10px 12px' }}>
        {/* Seller + distance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg, #a8d832, #2d6a35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#141f15', flexShrink: 0,
          }}>
            {listing.sellerName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#141f15', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.sellerName}
          </span>
          <span style={{ fontSize: 10, color: '#9ead9f', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <RiMapPinLine size={9} /> {listing.distance || 'nearby'}
          </span>
        </div>

        {/* Quantity — prominent */}
        <div style={{ fontSize: 17, fontWeight: 800, color: '#2d6a35', letterSpacing: '-0.02em' }}>
          {listing.remainingQty}kg
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ead9f', marginLeft: 4 }}>available</span>
        </div>

        {/* Description — 1 line only */}
        {listing.description && (
          <div style={{
            fontSize: 10, color: '#9ead9f', marginTop: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {listing.description}
          </div>
        )}
      </div>
    </div>
  );
}