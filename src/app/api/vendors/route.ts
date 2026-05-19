import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function GET() {
  const res = await client.execute(`
    SELECT v.*,
      COUNT(p.id) as purchase_count,
      MAX(p.purchase_date) as last_purchase
    FROM vendors v
    LEFT JOIN purchases p ON p.vendor_id = v.id
    GROUP BY v.id
    ORDER BY v.name
  `)
  return NextResponse.json(res.rows)
}

export async function POST(req: NextRequest) {
  const { name, contact, memo } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '거래처명이 필요합니다.' }, { status: 400 })
  try {
    const res = await client.execute({
      sql: 'INSERT INTO vendors (name, contact, memo) VALUES (?, ?, ?) RETURNING *',
      args: [name.trim(), contact?.trim() || null, memo?.trim() || null],
    })
    return NextResponse.json(res.rows[0])
  } catch {
    return NextResponse.json({ error: '이미 존재하는 거래처입니다.' }, { status: 409 })
  }
}
