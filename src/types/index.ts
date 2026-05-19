export interface Category {
  id: number
  name: string
  created_at: string
}

export interface Vendor {
  id: number
  name: string
  contact: string | null
  memo: string | null
  created_at: string
  purchase_count?: number
  last_purchase?: string | null
}

export interface Material {
  id: number
  name: string
  unit: string | null
  category_id: number | null
  category_name?: string | null
  memo: string | null
  created_at: string
  latest_price?: number | null
  latest_date?: string | null
  latest_vendor?: string | null
  prev_price?: number | null
  purchase_count?: number
}

export interface Purchase {
  id: number
  vendor_id: number | null
  vendor_name?: string | null
  purchase_date: string
  receipt_no: string | null
  memo: string | null
  file_name: string | null
  total_amount: number
  item_count: number
  created_at: string
}

export interface PurchaseItem {
  id: number
  purchase_id: number
  material_id: number | null
  material_name?: string | null
  category_name?: string | null
  item_name_raw: string
  spec: string | null
  unit: string | null
  quantity: number
  unit_price: number
  amount: number
  purchase_date?: string
  vendor_name?: string | null
}

export interface PriceHistory {
  purchase_id: number
  purchase_date: string
  unit_price: number
  quantity: number
  amount: number
  vendor_name: string | null
  spec: string | null
}

export interface ParsedReceipt {
  vendor_name: string
  purchase_date: string
  receipt_no: string
  items: ParsedItem[]
}

export interface ParsedItem {
  name: string
  spec: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
}
