import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })

  // 해당 카테고리를 사용하는 자재의 category_id를 NULL로 해제
  await client.execute({ sql: 'UPDATE materials SET category_id = NULL WHERE category_id = ?', args: [id] })
  await client.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] })

  return NextResponse.json({ ok: true })
}
