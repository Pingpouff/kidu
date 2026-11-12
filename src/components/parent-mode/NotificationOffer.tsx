import React, { useState } from 'react';
import { DEFAULT_REMINDERS, ParentSettings } from '../../domain/models';
import { requestNotificationPermission, showSystemNotification } from '../../services/notifications';
import { rememberNotificationOffer } from '../../services/notificationOffer';
import { translate, Language } from '../../i18n/dictionary';
import { Modal } from '../../ui/Overlay';
import { buttonClass } from '../../ui/styles';

/** The one-time offer to turn on system notifications (see services/notificationOffer.ts). */
interface NotificationOfferProps {
  settings: ParentSettings;
  language: Language;
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onClose: () => void;
}

export const NotificationOffer: React.FC<NotificationOfferProps> = ({ settings, language, onSaveSettings, onClose }) => {
  const [result, setResult] = useState<'granted' | 'denied' | null>(null);

  const remember = rememberNotificationOffer;

  // The permission is requested right in the tap handler: Android only shows its prompt after a user gesture
  const enable = async () => {
    const status = await requestNotificationPermission();
    remember();
    if (status !== 'granted') {
      setResult('denied');
      return;
    }
    await onSaveSettings({ ...settings, reminders: { ...DEFAULT_REMINDERS, ...settings.reminders, systemNotifications: true } });
    void showSystemNotification('Kidu', { body: translate('parent.reminders.test_body', language), tag: 'kidu-test' });
    setResult('granted');
  };

  const later = () => {
    remember();
    onClose();
  };

  return (
    <Modal
      label={translate('notif.offer.title', language)}
      testId="notification-offer"
      onClose={later}
      closeLabel={translate('btn.close', language)}
      panelClassName="max-w-md p-5 sm:p-6 flex flex-col gap-4"
    >
      <h2 className="text-xl font-black text-white pr-12">🔔 {translate('notif.offer.title', language)}</h2>
      {result === null && (
        <>
          <p className="text-sm text-white/80 leading-relaxed">{translate('notif.offer.body', language)}</p>
          <p className="text-xs text-white/60 leading-relaxed">{translate('notif.offer.hint', language)}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={later} data-testid="notification-offer-later" className={buttonClass('secondary', 'md')}>
              {translate('notif.offer.later', language)}
            </button>
            <button type="button" onClick={enable} data-testid="notification-offer-enable" className={buttonClass('primary', 'md')}>
              {translate('notif.offer.enable', language)}
            </button>
          </div>
        </>
      )}
      {result === 'granted' && (
        <>
          <p className="text-sm font-bold text-emerald-300" role="status" data-testid="notification-offer-done">
            ✓ {translate('notif.offer.done', language)}
          </p>
          <button type="button" onClick={onClose} className={buttonClass('primary', 'md', 'self-end')}>
            {translate('btn.close', language)}
          </button>
        </>
      )}
      {result === 'denied' && (
        <>
          <p className="text-sm text-amber-300 leading-relaxed" role="status">{translate('parent.reminders.denied_help', language)}</p>
          <button type="button" onClick={onClose} className={buttonClass('secondary', 'md', 'self-end')}>
            {translate('btn.close', language)}
          </button>
        </>
      )}
    </Modal>
  );
};
