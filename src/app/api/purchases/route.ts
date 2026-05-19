import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vendor = searchParams.get('vendor')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let sql = `
    SELECT p.*,
      v.name as vendor_name,
      COUNT(pi.id) as item_count,
      COALESCE(SUM(pi.amount), 0) as total_amount
    FROM purchases p
    LEFT JOIN vendors v ON v.id = p.vendor_id
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE 1=1
  `
  const args: (string | number)[] = []

  const item = searchParams.get('item')

  if (vendor) { sql += ' AND p.vendor_id = ?'; args.push(vendor) }
  if (from) { sql += ' AND p.purchase_date >= ?'; args.push(from) }
  if (to) { sql += ' AND p.purchase_date <= ?'; args.push(to) }
  if (item) {
    sql += ` AND EXISTS (SELECT 1 FROM purchase_items pi2 WHERE pi2.purchase_id = p.id AND lower(pi2.item_name_raw) LIKE lower(?))`
    args.push(`%${item}%`)
  }

  sql += ' GROUP BY p.id ORDER BY p.purchase_date DESC, p.created_at DESC'

  const res = await client.execute({ sql, args })
  return NextResponse.json(res.rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { vendor_name, purchase_date, receipt_no, memo, file_name, items } = body

  if (!purchase_date) return NextResponse.json({ error: '구매일자가 필요합니다.' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: '품목이 없습니다.' }, { status: 400 })

  // 거래처 찾기/생성
  let vendor_id: number | null = null
  if (vendor_name?.trim()) {
    const existing = await client.execute({
      sql: 'SELECT id FROM vendors WHERE name = ?',
      args: [vendor_name.trim()],
    })
    if (existing.rows.length) {
      vendor_id = Number(existing.rows[0].id)
    } else {
      const created = await client.execute({
        sql: 'INSERT INTO vendors (name) VALUES (?) RETURNING id',
        args: [vendor_name.trim()],
      })
      vendor_id = Number(created.rows[0].id)
    }
  }

  // 구매 기록 생성
  const purchaseRes = await client.execute({
    sql: 'INSERT INTO purchases (vendor_id, purchase_date, receipt_no, memo, file_name) VALUES (?, ?, ?, ?, ?) RETURNING id',
    args: [vendor_id, purchase_date, receipt_no?.trim() || null, memo?.trim() || null, file_name || null],
  })
  const purchase_id = Number(purchaseRes.rows[0].id)

  // 품목별 저장
  for (const item of items) {
    const name = item.name?.trim()
    if (!name) continue

    // 자재 찾기/생성 (이름 기준 매칭)
    let material_id: number | null = null
    const matExisting = await client.execute({
      sql: "SELECT id FROM materials WHERE lower(name) = lower(?)",
      args: [name],
    })
    const categoryId = item.category_id ? Number(item.category_id) : null
    if (matExisting.rows.length) {
      material_id = Number(matExisting.rows[0].id)
      // 단위/카테고리 업데이트 (없었던 경우만)
      await client.execute({
        sql: 'UPDATE materials SET unit = COALESCE(unit, ?), category_id = COALESCE(category_id, ?) WHERE id = ?',
        args: [item.unit?.trim() || null, categoryId, material_id],
      })
    } else {
      const matCreated = await client.execute({
        sql: 'INSERT INTO materials (name, unit, category_id) VALUES (?, ?, ?) RETURNING id',
        args: [name, item.unit?.trim() || null, categoryId],
      })
      material_id = Number(matCreated.rows[0].id)
    }

    const qty = Number(item.quantity) || 1
    const unitPrice = Math.round(Number(item.unit_price) || 0)
    const amount = Math.round(Number(item.amount) || qty * unitPrice)

    await client.execute({
      sql: `INSERT INTO purchase_items
              (purchase_id, material_id, item_name_raw, spec, unit, quantity, unit_price, amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [purchase_id, material_id, name, item.spec?.trim() || null,
             item.unit?.trim() || null, qty, unitPrice, amount],
    })
  }

  return NextResponse.json({ id: purchase_id })
}
