import { RiMapPinLine, RiCheckDoubleLine } from "react-icons/ri";
import { CROP_ICON, timeAgo } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Match } from "../../../services/marketService";

interface SectionMatchesProps {
  matches: Match[];
  userId: string;
}

export function SectionMatches({ matches, userId }: SectionMatchesProps) {
  if (matches.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <RiCheckDoubleLine size={48} />
        </div>
        <div className={styles.emptyTitle}>No matches yet</div>
        <div className={styles.emptyText}>
          Post a demand or list your produce to get matched.
        </div>
      </div>
    );
  }
  return (
    <div className={styles.matchesList}>
      {matches.map((m) => (
        <div key={m.id} className={styles.matchRow}>
          <div className={styles.matchRowLeft}>
            <div className={styles.matchCropRow}>
              <span style={{ fontSize: 20 }}>{CROP_ICON[m.cropType]}</span>
              <span className={styles.matchCropName}>{m.cropType}</span>
            </div>
            <div className={styles.matchParties}>
              {m.sellerId === userId ? (
                <>
                  Sold to <strong>{m.buyerName}</strong> ·{" "}
                  <RiMapPinLine size={10} /> {m.buyerLoc}
                </>
              ) : (
                <>
                  Bought from <strong>{m.sellerName}</strong> ·{" "}
                  <RiMapPinLine size={10} /> {m.sellerLoc}
                </>
              )}
            </div>
          </div>
          <div className={styles.matchStats}>
            <div className={styles.matchStat}>
              <div className={styles.matchStatVal}>{m.quantity}kg</div>
              <div className={styles.matchStatLabel}>Qty</div>
            </div>
            <div className={styles.matchStat}>
              <div className={styles.matchStatVal}>{m.distance}km</div>
              <div className={styles.matchStatLabel}>Distance</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span
              className={`${styles.matchStatusChip} ${
                m.status === "confirmed"
                  ? styles.chipConfirmed
                  : m.status === "pending"
                  ? styles.chipPending
                  : styles.chipDelivered
              }`}
            >
              {m.status.replace("_", " ")}
            </span>
            <span className={styles.matchDate}>{timeAgo(m.matchedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}