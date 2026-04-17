'use client'

export type CartItem = {
  productId: string
  name: string
  price: number
  imageUrl?: string | null
  quantity: number
  eventId: string
  stock: number
}

const CART_KEY = 'dalant-cart'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getCart(): CartItem[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const items = JSON.parse(raw)
    if (!Array.isArray(items)) return []
    return items as CartItem[]
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]) {
  if (!isBrowser()) return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cart-changed'))
}

export function addToCart(item: CartItem) {
  const items = getCart()
  const existing = items.find((i) => i.productId === item.productId)
  if (existing) {
    existing.quantity = Math.min(existing.quantity + item.quantity, item.stock)
  } else {
    items.push({ ...item, quantity: Math.min(item.quantity, item.stock) })
  }
  saveCart(items)
}

export function removeFromCart(productId: string) {
  saveCart(getCart().filter((i) => i.productId !== productId))
}

export function updateQuantity(productId: string, quantity: number) {
  const items = getCart()
  const item = items.find((i) => i.productId === productId)
  if (item) {
    item.quantity = Math.max(1, Math.min(quantity, item.stock))
    saveCart(items)
  }
}

export function clearCart() {
  saveCart([])
}

export function cartTotal(items: CartItem[] = getCart()): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
}

export function cartCount(items: CartItem[] = getCart()): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}
