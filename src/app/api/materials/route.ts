import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('q')

  let sql = `
    SELECT m.*,
      c.name as category_name,
      latest.unit_price as latest_price,
      latest.purchase_date as latest_date,
      v.name as latest_vendor,
      prev.unit_price as prev_price,
      COUNT(DISTINCT pi.purchase_id) as purchase_count
    FROM materials m
    LEFT JOIN categories c ON c.id = m.category_id
    LEFT JOIN (
      SELECT pi2.material_id, pi2.unit_price, p2.purchase_date
      FROM purchase_items pi2
      JOIN purchases p2 ON p2.id = pi2.purchase_id
      WHERE (pi2.material_id, p2.purchase_date) IN (
        SELECT pi3.material_id, MAX(p3.purchase_date)
        FROM purchase_items pi3
        JOIN purchases p3 ON p3.id = pi3.purchase_id
        GROUP BY pi3.material_id
      )
    ) latest ON latest.material_id = m.id
    LEFT JOIN (
      SELECT pi4.material_id, pi4.unit_price, p4.purchase_date
      FROM purchase_items pi4
      JOIN purchases p4 ON p4.id = pi4.purchase_id
    ) prev ON prev.material_id = m.id AND prev.purchase_date = (
      SELECT MAX(p5.purchase_date)
      FROM purchase_items pi5
      JOIN purchases p5 ON p5.id = pi5.purchase_id
      WHERE pi5.material_id = m.id AND p5.purchase_date < latest.purchase_date
    )
    LEFT JOIN purchases lp ON lp.purchase_date = latest.purchase_date AND lp.id IN (
      SELECT pi6.purchase_id FROM purchase_items pi6 WHERE pi6.material_id = m.id
    )
    LEFT JOIN vendors v ON v.id = lp.vendor_id
    LEFT JOIN purchase_items pi ON pi.material_id = m.id
    WHERE 1=1
  `
  const args: (string | number)[] = []

  if (category) { sql += ' AND m.category_id = ?'; args.push(category) }
  if (search) { sql += ' AND m.name LIKE ?'; args.push(`%${search}%`) }

  sql += ' GROUP BY m.id ORDER BY m.name'

  const res = await client.execute({ sql, args })
  return NextResponse.json(res.rows)
}

export async function POST(req: NextRequest) {
  const { name, unit, category_id, memo } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '자재명이 필요합니다.' }, { status: 400 })
  const res = await client.execute({
    sql: 'INSERT INTO materials (name, unit, category_id, memo) VALUES (?, ?, ?, ?) RETURNING *',
    args: [name.trim(), unit?.trim() || null, category_id || null, memo?.trim() || null],
  })
  return NextResponse.json(res.rows[0])
}
