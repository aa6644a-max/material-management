'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Material, PriceHistory, Category } from '@/types'
import PriceChart from '@/components/PriceChart'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

interface PurchaseItem {
  id: number
  purchase_id: number
  spec: string | null
  unit: string | null
  quantity: number
  unit_price: number
  amount: number
  purchase_date: string
  vendor_name: string | null
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [material, setMaterial] = useState<Material | null>(null)
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editCatId, setEditCatId] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [matRes, catRes] = await Promise.all([
      fetch(`/api/materials/${id}`),
      fetch('/api/categories'),
    ])
    const { material: mat, history: hist } = await matRes.json()
    setMaterial(mat)
    setHistory(hist)
    setCategories(await catRes.json())
    setEditName(mat.name)
    setEditUnit(mat.unit || '')
    setEditCatId(mat.category_id ? String(mat.category_id) : '')
    setEditMemo(mat.memo || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, unit: editUnit, category_id: editCatId || null, memo: editMemo }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEditing(false)
      load()
    } catch (err) { alert((err as Error).message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('이 자재를 삭제하시겠습니까?')) return
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    router.push('/materials')
  }

  if (loading) return <div className="max-w-[1000px] mx-auto px-4 py-8 text-gray-400">로딩 중...</div>
  if (!material) return <div className="max-w-[1000px] mx-auto px-4 py-8 text-gray-400">자재를 찾을 수 없습니다.</div>

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/materials" className="hover:text-gray-600">자재 현황</Link>
        <span>›</span>
        <span className="text-gray-700">{material.name}</span>
      </div>

      {/* 자재 정보 */}
      <div className="card mb-5">
        <div className="flex items-start justify-between">
          {editing ? (
            <div className="flex-1 grid grid-cols-2 gap-3 mr-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">자재명</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">단위</label>
                <input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">카테고리</label>
                <select value={editCatId} onChange={e => setEditCatId(e.target.value)} className="input-field">
                  <option value="">미분류</option>
                  {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">메모</label>
                <input value={editMemo} onChange={e => setEditMemo(e.target.value)} className="input-field" />
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-1">{material.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {material.category_name && (
                  <span className="badge bg-emerald-100 text-emerald-700">{material.category_name}</span>
                )}
                {material.unit && <span>단위: <strong>{material.unit}</strong></span>}
                <span>구매 {history.length}회</span>
              </div>
              {material.memo && <p className="text-sm text-gray-400 mt-1">{material.memo}</p>}
            </div>
          )}
          <div className="flex gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="btn-secondary">취소</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary">편집</button>
                <button onClick={handleDelete} className="btn-danger">삭제</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 가격 추이 차트 */}
      <div className="card mb-5">
        <h2 className="text-base font-semibold mb-4">가격 추이</h2>
        <PriceChart history={history} unit={material.unit} />
      </div>

      {/* 구매 이력 테이블 */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">구매 이력 ({history.length}건)</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">구매 이력이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                <th className="px-4 py-3 text-left font-medium">구매일</th>
                <th className="px-4 py-3 text-left font-medium">거래처</th>
                <th className="px-4 py-3 text-left font-medium">규격</th>
                <th className="px-4 py-3 text-center font-medium">단위</th>
                <th className="px-4 py-3 text-right font-medium">수량</th>
                <th className="px-4 py-3 text-right font-medium">단가</th>
                <th className="px-4 py-3 text-right font-medium">금액</th>
              </tr>
            </thead>
            <tbody>
              {(history as unknown as PurchaseItem[]).map((h, idx) => {
                const prev = idx < history.length - 1
                  ? (history as unknown as PurchaseItem[])[idx + 1].unit_price
                  : null
                const pct = prev && prev > 0
                  ? Math.round(((h.unit_price - prev) / prev) * 100)
                  : null
                return (
                  <tr key={h.id || idx} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      <Link href={`/history?purchase=${h.purchase_id}`} className="hover:text-blue-600">
                        {h.purchase_date?.slice(0, 10)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{h.vendor_name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{h.spec || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{h.unit || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{h.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {fmt(h.unit_price)}
                      {pct !== null && (
                        <span className={`ml-2 text-[11px] ${pct > 0 ? 'text-red-500' : pct < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                          {pct > 0 ? `▲${pct}%` : pct < 0 ? `▼${Math.abs(pct)}%` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{fmt(h.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
