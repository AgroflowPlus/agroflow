// import { useEffect } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { LoadingButton } from '../LoadingButton/LoadingButton';
import { RiBellLine, RiBellFill } from 'react-icons/ri';

export function NotificationToggle() {
  const { isSubscribed, isSupported, isLoading, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();

  if (!isSupported) {
    return (
      <div style={{ fontSize: 13, color: '#9ead9f', padding: '8px 0' }}>
        Push notifications not supported on this device.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#141f15' }}>
            Push Notifications
          </div>
          <div style={{ fontSize: 12, color: '#9ead9f', marginTop: 2 }}>
            {isSubscribed
              ? 'You will receive order updates, new listings and matches'
              : 'Enable to get notified about orders, listings and matches'
            }
          </div>
        </div>

        <LoadingButton
          loading={isLoading}
          onClick={isSubscribed ? unsubscribe : subscribe}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 100,
            background: isSubscribed ? '#f7f8f5' : '#a8d832',
            border: isSubscribed ? '1.5px solid #eaeee8' : 'none',
            color: isSubscribed ? '#e05252' : '#141f15',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {isSubscribed ? (
            <><RiBellFill size={14} /> Turn Off</>
          ) : (
            <><RiBellLine size={14} /> Enable</>
          )}
        </LoadingButton>
      </div>

      {isSubscribed && (
        <button
          onClick={sendTestNotification}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: '#f2f9e4',
            border: '1.5px solid #a8d832',
            color: '#2d6a35',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Send Test Notification
        </button>
      )}
    </div>
  );
}