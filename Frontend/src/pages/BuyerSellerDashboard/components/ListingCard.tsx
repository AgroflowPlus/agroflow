import { RiMapPinLine } from "react-icons/ri";
import { GiFarmer } from "react-icons/gi";
import { CROP_ICON, CROP_CSS, getImageFallback } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Listing } from "../../../services/marketService";

interface ListingCardProps {
  listing: Listing;
  intent: "buy" | "sell";
  onRequestToBuy: (listing: Listing) => void;
}

export function ListingCard({ listing, intent, onRequestToBuy }: ListingCardProps) {
  return (
    <div className={styles.marketplaceCard}>
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
        {intent === "buy" && listing.status !== "sold" && (
          <button
            className={styles.requestBtn}
            onClick={() => onRequestToBuy(listing)}
          >
            Request to Buy
          </button>
        )}
        {intent === "sell" && (
          <button className={styles.yourListingBtn} disabled>
            Your Listing
          </button>
        )}
      </div>
    </div>
  );
}