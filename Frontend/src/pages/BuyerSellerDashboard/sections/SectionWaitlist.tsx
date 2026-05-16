import { RiCheckboxCircleLine, RiMapPinLine } from "react-icons/ri";
import { GiTruck } from "react-icons/gi";
import { CROP_ICON, timeAgo } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Demand } from "../../../services/marketService";

export function SectionWaitlist({ waitlist }: { waitlist: Demand[] }) {
  if (waitlist.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <RiCheckboxCircleLine size={48} />
        </div>
        <div className={styles.emptyTitle}>Waitlist is clear</div>
        <div className={styles.emptyText}>
          All your demands have been matched. Great news!
        </div>
      </div>
    );
  }
  return (
    <div className={styles.waitlistList}>
      {waitlist.map((d) => (
        <div key={d.id} className={styles.waitlistCard}>
          <div className={styles.waitlistIcon}>
            <GiTruck size={18} />
          </div>
          <div className={styles.waitlistInfo}>
            <div className={styles.waitlistCrop}>
              {CROP_ICON[d.cropType]} {d.cropType} — {d.quantity}kg
            </div>
            <div className={styles.waitlistMeta}>
              <RiMapPinLine size={10} /> {d.location} · Posted {timeAgo(d.createdAt)}
            </div>
          </div>
          <span className={styles.waitlistBadge}>Waiting</span>
        </div>
      ))}
    </div>
  );
}