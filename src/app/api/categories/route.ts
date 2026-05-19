import { NextRequest, NextResponse } from 'next/server'
import client from '@/lib/db'

export async function GET() {
  const res = await client.execute('SELECT * FROM categories ORDER BY name')
  return NextResponse.json(res.rows)
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '이름이 필요합니다.' }, { status: 400 })
  try {
    const res = await client.execute({
      sql: "INSERT INTO categories (name) VALUES (?) RETURNING *",
      args: [name.trim()],
    })
    return NextResponse.json(res.rows[0])
  } catch {
    return NextResponse.json({ error: '이미 존재하는 카테고리입니다.' }, { status: 409 })
  }
}
