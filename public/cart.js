const CART_STORAGE_KEY = 'apnaCart';

function getCart() {
  const stored = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('apnaMarketCart');
  if (!stored) {
    return { items: [] };
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed && Array.isArray(parsed.items)) {
      if (!localStorage.getItem(CART_STORAGE_KEY)) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
    return { items: [] };
  } catch (error) {
    return { items: [] };
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cart.items }));
  updateCartCountUI();
}

function getCartItemCount() {
  const cart = getCart();
  return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const existing = cart.items.find(item => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }
  saveCart(cart);
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const existing = cart.items.find(item => item.productId === productId);
  if (!existing) return cart;
  existing.quantity = Math.max(1, parseInt(quantity, 10) || 1);
  saveCart(cart);
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart();
  cart.items = cart.items.filter(item => item.productId !== productId);
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart({ items: [] });
}

function updateCartCountUI() {
  const count = getCartItemCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.innerText = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCountUI();
});
