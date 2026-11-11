import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

// ---------------------------------------------------------------------------
// Substitueix INTERSTITIAL_ID i REWARDED_ID pels Ad Unit IDs reals
// que trobaràs a la consola AdMob un cop creades les unitats d'anunci.
// Els IDs de sota són els IDs de prova oficials de Google.
// ---------------------------------------------------------------------------
// TEST — IDs de prova de Google (funcionen sense aprovació de compte)
// Substituir pels IDs reals quan el compte AdMob estigui aprovat:
// INTERSTITIAL: ca-app-pub-1399848625425406/6613868519
// REWARDED:     ca-app-pub-1399848625425406/4151356701
const INTERSTITIAL_ID = 'ca-app-pub-1399848625425406/6613868519';
const REWARDED_ID     = 'ca-app-pub-1399848625425406/4151356701';

// Mostra un interstitial cada N partides
const INTERSTITIAL_EVERY = 3;

let adsRemoved = false;
let gameCount = 0;
let interstitialReady = false;
let rewardedReady = false;

export function setAdsRemoved(val) {
  adsRemoved = val;
}

export async function initAds() {
  try {
    await AdMob.initialize({ testingDevices: [] });
    console.log('[AdMob] initialize OK');
    _prepareInterstitial();
    _prepareRewarded();
  } catch (e) {
    console.error('[AdMob] initialize ERROR:', e);
  }
}

async function _prepareInterstitial() {
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID });
    interstitialReady = true;
    console.log('[AdMob] interstitial ready');
  } catch (e) {
    interstitialReady = false;
    console.error('[AdMob] interstitial prepare ERROR:', e);
  }
}

async function _prepareRewarded() {
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID });
    rewardedReady = true;
    console.log('[AdMob] rewarded ready');
  } catch (e) {
    rewardedReady = false;
    console.error('[AdMob] rewarded prepare ERROR:', e);
  }
}

// Crida aquesta funció a l'inici de cada startNewPuzzle*().
// Bloqueja fins que l'anunci acaba (l'usuari veu l'ad i després comença la partida).
export async function showInterstitialBetweenGames() {
  if (adsRemoved) return;
  gameCount++;
  if (gameCount < INTERSTITIAL_EVERY || !interstitialReady) return;
  gameCount = 0;
  interstitialReady = false;
  try {
    await AdMob.showInterstitial();
  } catch (_) {}
  _prepareInterstitial();
}

// Crida aquesta funció quan l'usuari demana una pista.
// Mostra un anunci recompensat i, quan l'usuari l'ha vist, executa callback().
// Si els anuncis estan desactivats (IAP) o l'anunci no estava llest, executa callback() directament.
export function showRewardedForHint(callback) {
  console.log('[AdMob] showRewardedForHint — adsRemoved:', adsRemoved, 'rewardedReady:', rewardedReady);
  if (adsRemoved || !rewardedReady) {
    callback();
    return;
  }
  rewardedReady = false;
  try {
    const listener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      listener.remove();
      callback();
    });
    AdMob.showRewardVideoAd().catch(() => {
      listener.remove();
      callback();
    });
  } catch (_) {
    callback();
  }
  _prepareRewarded();
}
