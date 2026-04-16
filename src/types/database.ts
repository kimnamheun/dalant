export type UserRole = 'admin' | 'teacher' | 'student'
export type TransactionType = 'attendance' | 'activity' | 'purchase' | 'bonus' | 'adjustment'
export type EventStatus = 'draft' | 'active' | 'closed'
export type ProductCategory = 'supply' | 'food' | 'toy' | 'etc'

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: Omit<Department, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Department>
      }
      classes: {
        Row: Class
        Insert: Omit<Class, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Class>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Profile>
      }
      talent_transactions: {
        Row: TalentTransaction
        Insert: Omit<TalentTransaction, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<TalentTransaction>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Event>
      }
      event_products: {
        Row: EventProduct
        Insert: Omit<EventProduct, 'id'> & { id?: string }
        Update: Partial<EventProduct>
      }
      purchases: {
        Row: Purchase
        Insert: Omit<Purchase, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Purchase>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      transaction_type: TransactionType
      event_status: EventStatus
      product_category: ProductCategory
    }
  }
}

// 개별 타입
export interface Department {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Class {
  id: string
  department_id: string
  name: string
  teacher_id: string | null
  sort_order: number
  created_at: string
}

export interface Profile {
  id: string
  name: string
  phone: string | null
  role: UserRole
  department_id: string | null
  class_id: string | null
  grade: string | null
  pin: string | null
  created_at: string
}

export interface TalentTransaction {
  id: string
  student_id: string
  amount: number
  type: TransactionType
  description: string
  event_id: string | null
  granted_by: string
  created_at: string
}

export interface Event {
  id: string
  name: string
  status: EventStatus
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface EventProduct {
  id: string
  event_id: string
  name: string
  category: ProductCategory
  price: number
  stock: number
  image_url: string | null
  sort_order: number
}

export interface Purchase {
  id: string
  event_id: string
  student_id: string
  product_id: string
  quantity: number
  total_price: number
  created_at: string
}
