export const CUSTOMER_KNOWN_KEY = 'erp_customer_known';

export function hasKnownCustomerAccount() {
  try {
    return localStorage.getItem(CUSTOMER_KNOWN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markKnownCustomerAccount() {
  try {
    localStorage.setItem(CUSTOMER_KNOWN_KEY, '1');
  } catch {
    // ignore storage errors
  }
}
