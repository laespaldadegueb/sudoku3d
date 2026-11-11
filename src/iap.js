import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { setAdsRemoved } from './ads.js';

const REVENUECAT_API_KEY = 'test_fgZaJyqEDcfsuyFouqvwVzfTTTP';
const ENTITLEMENT_ID     = 'sudoku_3d_pro';
const STORAGE_KEY        = 'sudoku3d.pro';

let _isPro = false;

export function isPro() {
  return _isPro;
}

// ─── Init ────────────────────────────────────────────────────────────────────

export async function initIAP() {
  if (localStorage.getItem(STORAGE_KEY) === '1') _applyPro(false);
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    await _syncStatus();
  } catch (e) {
    console.error('[IAP] init ERROR:', e);
  }
}

async function _syncStatus() {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    _evaluateCustomerInfo(customerInfo);
  } catch (e) {
    console.error('[IAP] syncStatus ERROR:', e);
  }
}

function _evaluateCustomerInfo(customerInfo) {
  const active = customerInfo?.entitlements?.active ?? {};
  if (active[ENTITLEMENT_ID] !== undefined) _applyPro(true);
}

function _applyPro(save) {
  _isPro = true;
  setAdsRemoved(true);
  if (save) localStorage.setItem(STORAGE_KEY, '1');
  _updatePaywallButton();
}

// ─── Paywall ─────────────────────────────────────────────────────────────────

export async function showPaywall() {
  let packages = [];
  try {
    const { offerings } = await Purchases.getOfferings();
    packages = offerings?.current?.availablePackages ?? [];
  } catch (e) {
    console.error('[IAP] getOfferings ERROR:', e);
  }
  _renderPaywall(packages);
}

function _renderPaywall(packages) {
  const overlay = document.getElementById('paywall-overlay');
  const list    = document.getElementById('paywall-packages');
  if (!overlay || !list) return;

  list.innerHTML = '';

  if (packages.length === 0) {
    list.innerHTML = '<p class="paywall-unavailable">Purchases not available right now. Please try again later.</p>';
  } else {
    packages.forEach(pkg => {
      const price = pkg.product.priceString ?? '';
      const period = _periodLabel(pkg.packageType);
      const btn = document.createElement('button');
      btn.className = 'paywall-pkg-btn';
      btn.dataset.pkgId = pkg.identifier;
      btn.innerHTML = `
        <span class="paywall-pkg-period">${period}</span>
        <span class="paywall-pkg-price">${price}</span>
      `;
      btn.addEventListener('click', () => _purchase(pkg));
      list.appendChild(btn);
    });
  }

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function _periodLabel(packageType) {
  const map = {
    LIFETIME: 'Lifetime',
    ANNUAL:   'Yearly',
    MONTHLY:  'Monthly',
    WEEKLY:   'Weekly',
  };
  return map[packageType] ?? packageType;
}

async function _purchase(pkg) {
  _setPaywallLoading(true);
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    _evaluateCustomerInfo(customerInfo);
    if (_isPro) closePaywall();
  } catch (e) {
    if (e?.code !== 'PURCHASE_CANCELLED') {
      console.error('[IAP] purchase ERROR:', e);
      alert('Purchase failed. Please try again.');
    }
  } finally {
    _setPaywallLoading(false);
  }
}

function _setPaywallLoading(on) {
  document.querySelectorAll('.paywall-pkg-btn').forEach(b => { b.disabled = on; });
  const spin = document.getElementById('paywall-spinner');
  if (spin) spin.style.display = on ? 'block' : 'none';
}

export function closePaywall() {
  const overlay = document.getElementById('paywall-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

// ─── Restore ─────────────────────────────────────────────────────────────────

export async function restoreIAPPurchases() {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    _evaluateCustomerInfo(customerInfo);
    return _isPro;
  } catch (e) {
    console.error('[IAP] restore ERROR:', e);
    return false;
  }
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function _updatePaywallButton() {
  const btn = document.getElementById('btn-remove-ads');
  if (!btn) return;
  btn.innerHTML = '<span class="sett-btn-icon">★</span> Sudoku 3D Pro — Active';
  btn.disabled = true;
  btn.style.opacity = '0.45';
  document.getElementById('btn-restore-purchases')?.remove();
}
