import { RiSeedlingLine } from "react-icons/ri";
import { ListingCard } from "../components/ListingCard";
import { CROPS, CROP_ICON } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Listing, CropType } from "../../../services/marketService";

interface SectionMarketplaceProps {
  listings: Listing[];
  cropFilter: CropType | "All";
  setCropFilter: (c: CropType | "All") => void;
  intent: "buy" | "sell";
  onRequestToBuy: (l: Listing) => void;
}


export function SectionMarketplace({
  listings,
  cropFilter,
  setCropFilter,
  intent,
  onRequestToBuy,
}: SectionMarketplaceProps) {
  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Fresh Produce Marketplace</div>
        <div className={styles.pageSubtitle}>
          {listings.length} listings available · Browse what farmers have harvested
        </div>
      </div>
      <div className={styles.cropTabs}>
        {(["All", ...CROPS] as (CropType | "All")[]).map((c) => (
          <button
            key={c}
            className={`${styles.cropTab} ${cropFilter === c ? styles.cropTabActive : ""}`}
            onClick={() => setCropFilter(c)}
          >
            {c !== "All" && CROP_ICON[c as CropType]} {c}
          </button>
        ))}
      </div>
      {listings.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <RiSeedlingLine size={48} />
          </div>
          <div className={styles.emptyTitle}>No produce listed yet</div>
          <div className={styles.emptyText}>
            Check back later for fresh produce from local farmers.
          </div>
        </div>
      ) : (
        <div className={styles.marketplaceGrid}>
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              intent={intent}
              onRequestToBuy={onRequestToBuy}
            />
          ))}
        </div>
      )}
    </>
  );
}