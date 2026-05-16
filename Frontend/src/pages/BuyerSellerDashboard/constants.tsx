import { GiCorn, GiTomato, GiChiliPepper, GiPlantRoots } from "react-icons/gi";
import type { CropType } from "../../services/marketService";

export const CROPS: CropType[] = ["Maize", "Tomato", "Cassava", "Pepper"];

export const CROP_ICON: Record<CropType, React.ReactNode> = {
  Maize: <GiCorn size={20} />,
  Tomato: <GiTomato size={20} />,
  Cassava: <GiPlantRoots size={20} />,
  Pepper: <GiChiliPepper size={20} />,
};

export const CROP_CSS: Record<CropType, string> = {
  Maize: "cropMaize",
  Tomato: "cropTomato",
  Cassava: "cropCassava",
  Pepper: "cropPepper",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const getImageFallback = (cropType: CropType): string => {
  const icons: Record<CropType, string> = {
    Maize: "🌽",
    Tomato: "🍅",
    Cassava: "🌿",
    Pepper: "🌶️",
  };
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f2f9e4"/%3E%3Ctext x="50%25" y="45%25" text-anchor="middle" font-family="Arial" font-size="64" fill="%23a8d832"%3E${encodeURIComponent(icons[cropType])}%3C/text%3E%3Ctext x="50%25" y="65%25" text-anchor="middle" font-family="Arial" font-size="14" fill="%239ead9f"%3ENo Image%3C/text%3E%3C/svg%3E`;
};