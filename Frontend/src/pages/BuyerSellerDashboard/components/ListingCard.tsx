import { useState, useEffect } from 'react';
import { RiMapPinLine } from "react-icons/ri";
import { GiFarmer } from "react-icons/gi";
import { MdAddShoppingCart, MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { CROP_ICON, CROP_CSS, getImageFallback } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Listing } from "../../../services/marketService";
import { useCartStore } from '../../../store/cartStore';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { LoadingButton } from '../../../components/LoadingButton/LoadingButton';
import { useToast } from '../../../context/ToastContext';

interface ListingCardProps {
  listing: Listing;
  intent: "buy" | "sell";
  onRequestToBuy: (listing: Listing) => void;
  onClick?: (listing: Listing) => void;
}

export function ListingCard({ listing, intent, onRequestToBuy, onClick }: ListingCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const inCart = cartItems.some(i => i.listing.id === listing.id);
  const { toggleListing, isLiked, isFollowing, followSeller, unfollowSeller } = useFavoritesStore();
  const liked = isLiked(listing.id);
  const following = isFollowing(listing.sellerId);
  const { addToast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCardClick = () => {
    // Only trigger on mobile devices
    if (isMobile && onClick) {
      onClick(listing);
    }
  };

  const handleRequestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestToBuy(listing);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      addItem(listing, 1);
      addToast('Added to cart!', 'success');
    } catch (error) {
      addToast('Failed to add to cart', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleListing(listing.id);
    addToast(
      liked ? 'Removed from favorites' : 'Added to favorites',
      'success'
    );
  };

  const handleFollowToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (following) {
      unfollowSeller(listing.sellerId);
      addToast('Unfollowed seller', 'info');
    } else {
      followSeller(listing.sellerId);
      addToast('Following seller!', 'success');
    }
  };

  return (
    <div 
      className={`${styles.marketplaceCard} ${isMobile ? styles.clickable : ''}`} 
      onClick={handleCardClick}
      style={{ position: 'relative' }}
    >
      {/* Favorite Button */}
      <button
        onClick={handleFavoriteToggle}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          zIndex: 1,
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
      >
        {liked
          ? <MdFavorite size={18} color="#e05252" />
          : <MdFavoriteBorder size={18} color="#9ead9f" />
        }
      </button>

      <div className={styles.cardPhoto}>
        {listing.photoUrl ? (
          <img
            src={listing.photoUrl}
            alt={listing.cropType}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getImageFallback(listing.cropType);
            }}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <span className={styles.photoEmoji}>
              {CROP_ICON[listing.cropType]}
            </span>
            <span className={styles.photoText}>No photo</span>
          </div>
        )}
        <div
          className={`${styles.cardBadge} ${styles[CROP_CSS[listing.cropType]]}`}
        >
          {CROP_ICON[listing.cropType]} {listing.cropType}
        </div>
        {listing.status !== "available" && (
          <div className={styles.statusOverlay}>
            <span>
              {listing.status === "partial" ? "Partially Sold" : "Sold Out"}
            </span>
          </div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.sellerRow}>
          <div className={styles.sellerAvatar}>
            <GiFarmer size={16} />
          </div>
          <div>
            <div className={styles.sellerName}>{listing.sellerName}</div>
            <div className={styles.sellerLocation}>
              <RiMapPinLine size={10} /> {listing.location} ·{" "}
              {listing.distance || "nearby"}
            </div>
          </div>
        </div>
        
        {/* Follow Button */}
        {intent === "buy" && (
          <button
            onClick={handleFollowToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 8,
              border: `1.5px solid ${following ? '#a8d832' : '#eaeee8'}`,
              background: following ? '#f2f9e4' : 'transparent',
              color: following ? '#2d6a35' : '#9ead9f',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 6,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!following) {
                e.currentTarget.style.background = '#f7f8f5';
              }
            }}
            onMouseLeave={(e) => {
              if (!following) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {following ? '✓ Following' : '+ Follow Seller'}
          </button>
        )}

        <div className={styles.produceStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{listing.remainingQty}kg</span>
            <span className={styles.statLabel}>Available</span>
          </div>
          <div className={styles.statDivider}>|</div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>Fresh</span>
            <span className={styles.statLabel}>Quality</span>
          </div>
        </div>
        {listing.description && (
          <p className={styles.produceDesc}>
            {listing.description.length > 80
              ? `${listing.description.substring(0, 80)}...`
              : listing.description}
          </p>
        )}
        
        {/* Action Buttons */}
        <div className={styles.cardActions}>
          {intent === "buy" && listing.status !== "sold" && (
            <>
              <LoadingButton
                loading={isAddingToCart}
                className={`${styles.addCartBtn} ${inCart ? styles.addCartBtnActive : ''}`}
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <MdAddShoppingCart size={16} />
                {inCart ? 'In Cart' : 'Add to Cart'}
              </LoadingButton>
              <button
                className={styles.requestBtn}
                onClick={handleRequestClick}
                disabled={isAddingToCart}
              >
                Request to Buy
              </button>
            </>
          )}
          {intent === "sell" && (
            <button className={styles.yourListingBtn} disabled>
              Your Listing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}