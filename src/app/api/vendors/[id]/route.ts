import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, contact, memo } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '거래처명이 필요합니다.' }, { status: 400 })
  const res = await client.execute({
    sql: 'UPDATE vendors SET name=?, contact=?, memo=? WHERE id=? RETURNING *',
    args: [name.trim(), contact?.trim() || null, memo?.trim() || null, params.id],
  })
  if (!res.rows.length) return NextResponse.json({ error: '없는 거래처입니다.' }, { status: 404 })
  return NextResponse.json(res.rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await client.execute({ sql: 'DELETE FROM vendors WHERE id=?', args: [params.id] })
  return NextResponse.json({ ok: true })
}
