import { RiNotificationLine, RiCheckDoubleLine } from "react-icons/ri";
import { GiTruck } from "react-icons/gi";
import { timeAgo } from "../constants";
import { marketService } from "../../../services/marketService";
import styles from "../BuyerSellerDashboard.module.css";
import type { Notification } from "../../../services/marketService";

interface SectionNotificationsProps {
  notifs: Notification[];
  onMarkAll: () => void;
}

export function SectionNotifications({ notifs, onMarkAll }: SectionNotificationsProps) {
  if (notifs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <RiNotificationLine size={48} />
        </div>
        <div className={styles.emptyTitle}>No notifications yet</div>
        <div className={styles.emptyText}>
          When you get matched, your notifications will appear here.
        </div>
      </div>
    );
  }
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#2d6a35",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onClick={onMarkAll}
        >
          Mark all as read
        </button>
      </div>
      <div className={styles.notifList}>
        {notifs.map((n) => (
          <div
            key={n.id}
            className={`${styles.notifCard} ${!n.read ? styles.notifUnread : ""}`}
            onClick={() => marketService.markNotifRead(n.id)}
          >
            <div
              className={`${styles.notifIconWrap} ${
                n.type === "match" ? styles.notiflime : styles.notifamber
              }`}
            >
              {n.type === "match" ? <RiCheckDoubleLine size={16} /> : <GiTruck size={16} />}
            </div>
            <div className={styles.notifbody}>
              <div className={styles.notifTitle}>{n.title}</div>
              <div className={styles.notifText}>{n.message}</div>
            </div>
            <div className={styles.notifRight}>
              <div className={styles.notifTime}>{timeAgo(n.createdAt)}</div>
              {!n.read && <div className={styles.unreadDot} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}