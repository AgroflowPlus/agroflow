import React, { useState } from 'react';
import { RiLeafFill } from 'react-icons/ri';
import { GiCorn, GiTomato, GiChiliPepper, GiPlantRoots } from 'react-icons/gi';
import { MdCheckCircle } from 'react-icons/md';
import { useToast } from '../../context/ToastContext';
import { AKURE_AREAS } from '../../services/marketService';
import styles from './Onboarding.module.css';

type CropType = 'Maize' | 'Cassava' | 'Tomato' | 'Pepper';

const CROP_ICONS: Record<CropType, React.ReactElement> = {
  Maize: <GiCorn size={24} />,
  Cassava: <GiPlantRoots size={24} />,
  Tomato: <GiTomato size={24} />,
  Pepper: <GiChiliPepper size={24} />,
};

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const DELIVERY_OPTIONS = [
  { value: 'pickup', label: 'Pickup only' },
  { value: 'delivery', label: 'Delivery only' },
  { value: 'both', label: 'Both pickup and delivery' },
];

interface BuyerOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function BuyerOnboardingModal({ isOpen, onComplete }: BuyerOnboardingModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    preferredLocation: '',
    preferredCrops: [] as CropType[],
    purchaseFrequency: '',
    preferredQuantity: 50,
    deliveryPreference: '',
    maxDistance: 15,
  });

  const toggleCrop = (crop: CropType) => {
    setFormData(prev => ({
      ...prev,
      preferredCrops: prev.preferredCrops.includes(crop)
        ? prev.preferredCrops.filter(c => c !== crop)
        : [...prev.preferredCrops, crop]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agf_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/buyers/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      addToast('Profile completed! Start shopping 🛍️', 'success');
      onComplete();
    } catch (error) {
      addToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isValid = () => {
    if (step === 1) return formData.preferredLocation && formData.maxDistance;
    if (step === 2) return formData.preferredCrops.length > 0;
    if (step === 3) return formData.purchaseFrequency && formData.deliveryPreference;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <RiLeafFill size={28} color="#2d6a35" />
          </div>
          <h2 className={styles.title}>Welcome Buyer! 🛍️</h2>
          <p className={styles.subtitle}>Tell us what you're looking for</p>
          <div className={styles.steps}>
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
              <span>1</span> Location
            </div>
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
              <span>2</span> Crop Preferences
            </div>
            <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
              <span>3</span> Shopping Habits
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {step === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Preferred Location</label>
                <select
                  className={styles.select}
                  value={formData.preferredLocation}
                  onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                >
                  <option value="">Select your area</option>
                  {AKURE_AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Max Distance Willing to Travel (km)</label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={formData.maxDistance}
                  onChange={(e) => setFormData({ ...formData, maxDistance: Number(e.target.value) })}
                  className={styles.rangeSlider}
                />
                <div className={styles.rangeValue}>{formData.maxDistance} km</div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepContent}>
              <label className={styles.label}>What crops are you interested in?</label>
              <div className={styles.cropGrid}>
                {(['Maize', 'Cassava', 'Tomato', 'Pepper'] as CropType[]).map(crop => (
                  <button
                    key={crop}
                    type="button"
                    className={`${styles.cropCard} ${formData.preferredCrops.includes(crop) ? styles.selected : ''}`}
                    onClick={() => toggleCrop(crop)}
                  >
                    {CROP_ICONS[crop]}
                    <span>{crop}</span>
                    {formData.preferredCrops.includes(crop) && <MdCheckCircle className={styles.checkIcon} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>How often do you buy?</label>
                <div className={styles.radioGroup}>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <label key={opt.value} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="frequency"
                        value={opt.value}
                        checked={formData.purchaseFrequency === opt.value}
                        onChange={(e) => setFormData({ ...formData, purchaseFrequency: e.target.value })}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Preferred quantity per purchase (kg)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g., 50"
                  value={formData.preferredQuantity}
                  onChange={(e) => setFormData({ ...formData, preferredQuantity: Number(e.target.value) })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Delivery preference</label>
                <div className={styles.radioGroup}>
                  {DELIVERY_OPTIONS.map(opt => (
                    <label key={opt.value} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="delivery"
                        value={opt.value}
                        checked={formData.deliveryPreference === opt.value}
                        onChange={(e) => setFormData({ ...formData, deliveryPreference: e.target.value })}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {step > 1 && (
            <button className={styles.backBtn} onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              className={styles.nextBtn}
              onClick={() => setStep(step + 1)}
              disabled={!isValid()}
            >
              Continue →
            </button>
          ) : (
            <button
              className={styles.completeBtn}
              onClick={handleSubmit}
              disabled={!isValid() || loading}
            >
              {loading ? 'Saving...' : 'Start Shopping 🎉'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}