import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [pRes, itemsRes] = await Promise.all([
    client.execute({
      sql: `SELECT p.*, v.name as vendor_name,
                   COALESCE(SUM(pi.amount), 0) as total_amount
            FROM purchases p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
            WHERE p.id = ?
            GROUP BY p.id`,
      args: [params.id],
    }),
    client.execute({
      sql: `SELECT pi.*, m.name as material_name, c.name as category_name
            FROM purchase_items pi
            LEFT JOIN materials m ON m.id = pi.material_id
            LEFT JOIN categories c ON c.id = m.category_id
            WHERE pi.purchase_id = ?
            ORDER BY pi.id`,
      args: [params.id],
    }),
  ])

  if (!pRes.rows.length) return NextResponse.json({ error: '없는 구매 기록입니다.' }, { status: 404 })
  return NextResponse.json({ purchase: pRes.rows[0], items: itemsRes.rows })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await client.execute({ sql: 'DELETE FROM purchases WHERE id=?', args: [params.id] })
  return NextResponse.json({ ok: true })
}
