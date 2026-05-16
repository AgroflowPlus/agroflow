import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiLeafFill,
  RiCheckboxCircleLine,
  RiChatCheckLine,
  RiUserLine,
  RiSettings4Line,
  RiLogoutBoxRLine,
  RiStore3Line,
  RiShoppingBagLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiBellLine,
  RiShoppingCartLine,
  RiSendPlaneLine,
  RiMailSendLine,
  RiHomeSmileLine,
} from "react-icons/ri";

import { MdOutlineMenu, MdClose, MdSwapHoriz } from "react-icons/md";
import { FaStore, FaSeedling } from "react-icons/fa";
import {
  marketService,
  type Listing,
  type Demand,
  type Match,
  type Notification,
  type CropType,
  type Request,
} from "../../services/marketService";
import { authService } from "../../services/authService";
import { roleService } from "../../services/roleService";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal/ConfirmModal";
import FloatingAI from "../../components/FloatingAI/FloatingAI";
import { BuyerOnboardingModal } from "../../components/Onboarding/BuyerOnboardingModal";
import styles from "./BuyerSellerDashboard.module.css";

// Import extracted sections
import { SectionMarketplace } from "./sections/SectionMarketplace";
import { SectionMyStore } from "./sections/SectionMyStore";
import { SectionMatches } from "./sections/SectionMatches";
import { SectionRequests } from "./sections/SectionRequests";
import { SectionWaitlist } from "./sections/SectionWaitlist";
import { SectionNotifications } from "./sections/SectionNotifications";
import { SectionSettings } from "./sections/SectionSettings";
import { SectionPostListing } from "./sections/SectionPostListing";
import { SectionPostDemand } from "./sections/SectionPostDemand";
import { CROP_ICON } from "./constants";

type Section =
  | "marketplace"
  | "myStore"
  | "sell"
  | "buy"
  | "matches"
  | "waitlist"
  | "notifications"
  | "requests"
  | "settings";
type Intent = "buy" | "sell";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export default function BuyerSellerDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(
    authService.getUser() ?? {
      id: "mock-001",
      name: "Chioma Eze",
      email: "buyer@test.com",
      role: "buyer",
      phone: "+234 801 234 5678",
      location: "Ijapo Estate, Akure",
      bio: "Agricultural entrepreneur passionate about fresh produce",
      avatar: null,
    },
  );
  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() ?? "CE";

  const [section, setSection] = useState<Section>("marketplace");
  const [intent, setIntent] = useState<Intent>(
    user.role === "seller" ? "sell" : "buy",
  );
  const [sidebarOpen, setSidebar] = useState(false);
  const [cropFilter, setCropFilter] = useState<CropType | "All">("All");
  const [listings, setListings] = useState<Listing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [waitlist, setWaitlist] = useState<Demand[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [showBuyerOnboarding, setShowBuyerOnboarding] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState<{
    listing: Listing;
  } | null>(null);
  const [requestQty, setRequestQty] = useState("");
  const [requestMsg, setRequestMsg] = useState("");
  const [modal, setModal] = useState<null | {
    type: "match" | "waitlist" | "requestSent";
    data: any;
  }>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: "delete" | "accept" | "reject";
    data?: any;
  }>({ show: false, type: "delete" });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    checkBuyerOnboardingStatus();
    refresh();
    ensureUserProfiles();
  }, []);

  const checkBuyerOnboardingStatus = async () => {
    try {
      const token = authService.getToken();
      const res = await fetch(`${BASE_URL}/buyers/onboarding-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.completed) {
        setShowBuyerOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to check onboarding:", error);
    }
  };

  async function ensureUserProfiles() {
    try {
      await roleService.getCurrentRole();
    } catch (error) {
      console.error("Failed to ensure profiles:", error);
    }
  }

  async function refresh() {
    try {
      const [listings, matches, waitlist, myListings] = await Promise.all([
        marketService.getListings(user.location),
        marketService.getMatches(),
        marketService.getWaitlist(),
        marketService.getListingsBySeller(),
      ]);
      setListings(listings);
      setMatches(matches);
      setWaitlist(waitlist);
      setMyListings(myListings);
      setNotifs(marketService.getNotifications(user.id));
      setMyRequests([]);
    } catch (err) {
      console.error("Refresh error:", err);
      addToast("Failed to refresh data", "error");
    }
  }

  const unread = notifs.filter((n) => !n.read).length;

  const handleRequestToBuy = (listing: Listing) => {
    setShowRequestModal({ listing });
    setRequestQty("");
    setRequestMsg("");
  };

  const submitRequest = async () => {
    const qty = Number(requestQty);
    if (!showRequestModal) return;
    if (qty <= 0 || qty > showRequestModal.listing.remainingQty) {
      addToast(
        `Please enter a valid quantity (max ${showRequestModal.listing.remainingQty}kg)`,
        "error",
      );
      return;
    }

    const result = await marketService.createRequest(
      showRequestModal.listing.id,
      qty,
      requestMsg ||
        `I would like to buy ${qty}kg of your ${showRequestModal.listing.cropType}`,
      user.location || "Ijapo Estate",
    );

    if (!result.success) {
      addToast(result.error || "Failed to send request", "error");
      return;
    }

    setShowRequestModal(null);
    setModal({ type: "requestSent", data: result.request });
    refresh();
    addToast("Request sent successfully!", "success");
  };

  const handleAcceptRequest = async (request: Request) => {
    setConfirmModal({ show: true, type: "accept", data: request });
  };

  const handleRejectRequest = async (request: Request) => {
    setConfirmModal({ show: true, type: "reject", data: request });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    authService.clearSession();
    navigate("/login");
    addToast("Logged out successfully", "success");
  };

  const switchToFarmer = async () => {
    try {
      const result = await roleService.switchToFarmer();
      authService.setUser(result.user);
      navigate("/farmer");
      addToast("Switched to Farmer mode", "success");
    } catch (error) {
      console.error("Failed to switch to farmer:", error);
      addToast("Could not switch to farmer mode", "error");
    }
  };

  const filteredListings = listings.filter(
    (l) =>
      (cropFilter === "All" || l.cropType === cropFilter) &&
      l.status !== "sold",
  );

  const handleIntentChange = (newIntent: Intent) => {
    setIntent(newIntent);
    if (newIntent === "buy") setSection("marketplace");
    else setSection("sell");
  };

  const bottomNavItems = [
    {
      id: "marketplace" as Section,
      label: "Home",
      icon: <RiHomeSmileLine size={22} />,
    },
    { id: "myStore" as Section, label: "Store", icon: <FaStore size={20} /> },
    {
      id: "matches" as Section,
      label: "Matches",
      icon: <RiCheckDoubleLine size={20} />,
      badge: matches.length,
    },
    {
      id: "settings" as Section,
      label: "Settings",
      icon: <RiSettings4Line size={20} />,
    },
  ];

  const sidebarNavItems: {
    id: Section;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "marketplace",
      label: "Marketplace",
      icon: <RiStore3Line size={17} />,
    },
    {
      id: "myStore",
      label: "My Store",
      icon: <FaStore size={15} />,
      badge: myListings.length,
    },
    { id: "buy", label: "Post Demand", icon: <FaSeedling size={15} /> },
    {
      id: "sell",
      label: "List Produce",
      icon: <RiShoppingBagLine size={15} />,
    },
    {
      id: "matches",
      label: "My Matches",
      icon: <RiCheckDoubleLine size={16} />,
      badge: matches.length,
    },
    {
      id: "requests",
      label: "Requests",
      icon: <RiChatCheckLine size={15} />,
      badge: myRequests.filter((r) => r.status === "pending").length,
    },
    {
      id: "waitlist",
      label: "Waitlist",
      icon: <RiTimeLine size={15} />,
      badge: waitlist.length,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <RiBellLine size={15} />,
      badge: unread,
    },
    { id: "settings", label: "Settings", icon: <RiSettings4Line size={17} /> },
  ];

  return (
    <div className={styles.shell}>
      <BuyerOnboardingModal
        isOpen={showBuyerOnboarding}
        onComplete={() => setShowBuyerOnboarding(false)}
      />

      <ConfirmModal
        isOpen={confirmModal.show}
        title={
          confirmModal.type === "delete"
            ? "Delete Item"
            : confirmModal.type === "accept"
              ? "Accept Request"
              : "Reject Request"
        }
        message={
          confirmModal.type === "accept"
            ? "Are you sure you want to accept this request?"
            : confirmModal.type === "reject"
              ? "Are you sure you want to reject this request?"
              : "Are you sure you want to proceed?"
        }
        onConfirm={async () => {
          if (confirmModal.type === "accept" && confirmModal.data) {
            const result = await marketService.acceptRequest(
              confirmModal.data.id,
              user.location,
            );
            if (result.success) {
              addToast("Request accepted successfully!", "success");
              refresh();
            } else {
              addToast(result.error || "Failed to accept request", "error");
            }
          } else if (confirmModal.type === "reject" && confirmModal.data) {
            await marketService.rejectRequest(confirmModal.data.id);
            addToast("Request rejected", "info");
            refresh();
          }
          setConfirmModal({ show: false, type: "delete" });
        }}
        onCancel={() => setConfirmModal({ show: false, type: "delete" })}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out? You will need to login again to access your account."
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ""}`}
        onClick={() => setSidebar(false)}
      />

      {/* Request Modal */}
      {showRequestModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowRequestModal(null)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500 }}
          >
            <div className={styles.modalIcon} style={{ background: "#f2f9e4" }}>
              <RiSendPlaneLine size={32} color="#2d6a35" />
            </div>
            <div className={styles.modalTitle}>Request to Buy</div>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                  padding: 12,
                  background: "#f7f8f5",
                  borderRadius: 12,
                }}
              >
                {showRequestModal.listing.photoUrl ? (
                  <img
                    src={showRequestModal.listing.photoUrl}
                    alt=""
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      background: "#e2e8df",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {CROP_ICON[showRequestModal.listing.cropType]}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>
                    {showRequestModal.listing.cropType}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7f6e" }}>
                    Seller: {showRequestModal.listing.sellerName}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7f6e" }}>
                    Available: {showRequestModal.listing.remainingQty}kg
                  </div>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Quantity Needed (kg) *
                </label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  min={1}
                  max={showRequestModal.listing.remainingQty}
                  placeholder={`Max ${showRequestModal.listing.remainingQty}kg`}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Message to Seller (Optional)
                </label>
                <textarea
                  className={styles.fieldTextarea}
                  rows={3}
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder="e.g., When can I pick up? Do you deliver?"
                />
              </div>
            </div>
            <div className={styles.modalBtns}>
              <button
                className={styles.modalBtnPrimary}
                onClick={submitRequest}
              >
                <RiMailSendLine size={16} /> Send Request
              </button>
              <button
                className={styles.modalBtnOutline}
                onClick={() => setShowRequestModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {modal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setModal(null);
            refresh();
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.modalIcon} ${modal.type === "match" || modal.type === "requestSent" ? styles.modalIconSuccess : styles.modalIconWait}`}
            >
              {modal.type === "requestSent" ? (
                <RiMailSendLine size={32} />
              ) : modal.type === "match" ? (
                <RiCheckboxCircleLine size={32} />
              ) : (
                <RiTimeLine size={32} />
              )}
            </div>
            <div className={styles.modalTitle}>
              {modal.type === "requestSent"
                ? "Request Sent!"
                : modal.type === "match"
                  ? "Match Found!"
                  : "Added to Waitlist"}
            </div>
            <div className={styles.modalText}>
              {modal.type === "requestSent"
                ? `Your request has been sent to the seller. You'll be notified when they respond.`
                : modal.type === "match"
                  ? `Great news! We found matches for your demand.`
                  : `No sellers available right now. We'll notify you when someone lists matching produce.`}
            </div>
            <div className={styles.modalBtns}>
              <button
                className={styles.modalBtnPrimary}
                onClick={() => {
                  setModal(null);
                  refresh();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <div className={styles.logoRow}>
            <div className={styles.logoMark}>
              <RiLeafFill size={16} />
            </div>
            <span className={styles.logoText}>
              AgroFlow<span>+</span>
            </span>
          </div>
          <div className={styles.profileRow}>
            <div className={styles.profileAvatar}>{initials}</div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{user.name}</div>
              <div className={styles.profileRole}>
                {intent === "buy" ? (
                  <>
                    <RiShoppingCartLine size={10} /> Buyer
                  </>
                ) : (
                  <>
                    <RiStore3Line size={10} /> Seller
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navLabel}>NAVIGATION</div>
          {sidebarNavItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${section === item.id ? styles.navItemActive : ""}`}
              onClick={() => {
                setSection(item.id);
                setSidebar(false);
              }}
            >
              <div className={styles.navIcon}>{item.icon}</div>
              <span className={styles.navText}>{item.label}</span>
              {item.badge &&
                typeof item.badge === "number" &&
                item.badge > 0 && (
                  <span
                    className={
                      item.id === "notifications"
                        ? styles.navBadge
                        : styles.navBadgeGreen
                    }
                  >
                    {item.badge}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className={styles.switchBox}>
          <div className={styles.switchLbl}>Switch Role</div>
          <button className={styles.switchBtn} onClick={switchToFarmer}>
            <MdSwapHoriz size={14} /> Go to Farmer Dashboard
          </button>
        </div>

        <div className={styles.sidebarBottom}>
          <button
            className={styles.sidebarBtn}
            onClick={() => {
              setSection("settings");
              setSidebar(false);
            }}
          >
            <RiSettings4Line size={15} /> Settings
          </button>
          <button
            className={`${styles.sidebarBtn} ${styles.sidebarBtnDanger}`}
            onClick={handleLogout}
          >
            <RiLogoutBoxRLine size={15} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebar((p) => !p)}
            >
              {sidebarOpen ? (
                <MdClose size={17} />
              ) : (
                <MdOutlineMenu size={17} />
              )}
            </button>
            <div className={styles.intentToggleHeader}>
              <button
                className={`${styles.headerIntentBtn} ${intent === "buy" ? styles.headerIntentActive : ""}`}
                onClick={() => handleIntentChange("buy")}
              >
                <RiShoppingCartLine size={14} /> Buy
              </button>
              <button
                className={`${styles.headerIntentBtn} ${intent === "sell" ? styles.headerIntentActive : ""}`}
                onClick={() => handleIntentChange("sell")}
              >
                <RiStore3Line size={14} /> Sell
              </button>
            </div>
          </div>

          <FloatingAI navbarMode />

          <div className={styles.topbarRight}>
            <button
              className={styles.topbarIconBtn}
              onClick={() => setSection("notifications")}
            >
              <RiBellLine size={15} />
              {unread > 0 && <div className={styles.notifBadge} />}
            </button>
            <div className={styles.topbarIconBtn}>
              <RiUserLine size={15} />
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {section === "marketplace" && (
            <SectionMarketplace
              listings={filteredListings}
              cropFilter={cropFilter}
              setCropFilter={setCropFilter}
              intent={intent}
              onRequestToBuy={handleRequestToBuy}
            />
          )}
          {section === "myStore" && (
            <SectionMyStore listings={myListings} onRefresh={refresh} />
          )}
          {section === "sell" && (
            <SectionPostListing
              user={user}
              onSuccess={() => {
                refresh();
                setSection("marketplace");
                addToast("Listing posted successfully!", "success");
              }}
            />
          )}
          {section === "buy" && (
            <SectionPostDemand
              user={user}
              onResult={(r) => {
                refresh();
                setModal({ type: r.matched ? "match" : "waitlist", data: r });
              }}
            />
          )}
          {section === "matches" && (
            <SectionMatches matches={matches} userId={user.id} />
          )}
          {section === "requests" && (
            <SectionRequests
              requests={myRequests}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
            />
          )}
          {section === "waitlist" && <SectionWaitlist waitlist={waitlist} />}
          {section === "notifications" && (
            <SectionNotifications
              notifs={notifs}
              onMarkAll={() => {
                marketService.markAllRead(user.id);
                refresh();
                addToast("All notifications marked as read", "info");
              }}
            />
          )}
          {section === "settings" && (
            <SectionSettings
              user={user}
              onUpdate={(updatedUser) => {
                setUser(updatedUser);
                const currentUser = authService.getUser();
                if (currentUser) {
                  Object.assign(currentUser, updatedUser);
                  localStorage.setItem("agf_user", JSON.stringify(currentUser));
                }
                refresh();
                addToast("Profile updated successfully!", "success");
              }}
            />
          )}
        </div>

        <div className={styles.bottomNav}>
          <div className={styles.bottomNavItems}>
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.bottomNavItem} ${section === item.id ? styles.bottomNavItemActive : ""}`}
                onClick={() => setSection(item.id)}
              >
                <div className={styles.bottomNavIcon}>
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className={styles.bottomNavBadge}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={styles.bottomNavLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
