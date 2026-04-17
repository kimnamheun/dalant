'use client'

import { useEffect, useState } from 'react'
import { getCart, type CartItem } from './cart'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setItems(getCart())

    function onChange() {
      setItems(getCart())
    }

    window.addEventListener('cart-changed', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('cart-changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  return { items: mounted ? items : [], count: mounted ? items.reduce((s, i) => s + i.quantity, 0) : 0 }
}
