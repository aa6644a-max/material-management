import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [matRes, histRes] = await Promise.all([
    client.execute({
      sql: `SELECT m.*, c.name as category_name
            FROM materials m LEFT JOIN categories c ON c.id = m.category_id
            WHERE m.id = ?`,
      args: [params.id],
    }),
    client.execute({
      sql: `SELECT pi.unit_price, pi.quantity, pi.amount, pi.spec,
                   p.purchase_date, p.id as purchase_id, v.name as vendor_name
            FROM purchase_items pi
            JOIN purchases p ON p.id = pi.purchase_id
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE pi.material_id = ?
            ORDER BY p.purchase_date DESC`,
      args: [params.id],
    }),
  ])

  if (!matRes.rows.length) return NextResponse.json({ error: '없는 자재입니다.' }, { status: 404 })
  return NextResponse.json({ material: matRes.rows[0], history: histRes.rows })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, unit, category_id, memo } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '자재명이 필요합니다.' }, { status: 400 })
  const res = await client.execute({
    sql: 'UPDATE materials SET name=?, unit=?, category_id=?, memo=? WHERE id=? RETURNING *',
    args: [name.trim(), unit?.trim() || null, category_id || null, memo?.trim() || null, params.id],
  })
  if (!res.rows.length) return NextResponse.json({ error: '없는 자재입니다.' }, { status: 404 })
  return NextResponse.json(res.rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await client.execute({ sql: 'DELETE FROM materials WHERE id=?', args: [params.id] })
  return NextResponse.json({ ok: true })
}
