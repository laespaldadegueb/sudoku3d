import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();

export function hapticLight() {
  if (native) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(15);
  }
}

export function hapticMedium() {
  if (native) {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}

export function hapticError() {
  if (native) {
    Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate([20, 30, 20]);
  }
}

export function hapticVictory() {
  if (native) {
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate([50, 30, 50, 30, 100]);
  }
}
