'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Material, Category } from '@/types'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function pct(latest: number | null | undefined, prev: number | null | undefined) {
  if (!latest || !prev || prev === 0) return null
  return Math.round(((latest - prev) / prev) * 100)
}

function TrendBadge({ latest, prev }: { latest: number | null, prev: number | null }) {
  const p = pct(latest, prev)
  if (p === null) return <span className="badge-same text-[11px]">—</span>
  if (p > 0) return <span className="badge-up text-[11px]">▲ {p}%</span>
  if (p < 0) return <span className="badge-down text-[11px]">▼ {Math.abs(p)}%</span>
  return <span className="badge-same text-[11px]">변동없음</span>
}

type SortKey = 'name' | 'latest_price_desc' | 'latest_price_asc' | 'purchase_count' | 'price_up' | 'latest_date'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: '이름순' },
  { value: 'price_up', label: '가격 많이 오른 순' },
  { value: 'latest_date', label: '최근 구매순' },
  { value: 'purchase_count', label: '구매 많은 순' },
  { value: 'latest_price_desc', label: '단가 높은 순' },
  { value: 'latest_price_asc', label: '단가 낮은 순' },
]

function MaterialsContent() {
  const searchParams = useSearchParams()
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>(() => (searchParams.get('sort') as SortKey) || 'name')
  const [onlyPriceUp, setOnlyPriceUp] = useState(searchParams.get('sort') === 'price_up')
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newCatId, setNewCatId] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/materials')
    setAllMaterials(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = [...allMaterials]
    if (selectedCat === 'null') list = list.filter(m => !m.category_id)
    else if (selectedCat) list = list.filter(m => String(m.category_id) === selectedCat)
    if (search.trim()) list = list.filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()))
    if (onlyPriceUp) list = list.filter(m => { const p = pct(m.latest_price, m.prev_price); return p !== null && p > 0 })
    switch (sort) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name, 'ko')); break
      case 'latest_price_desc': list.sort((a, b) => (b.latest_price ?? 0) - (a.latest_price ?? 0)); break
      case 'latest_price_asc': list.sort((a, b) => (a.latest_price ?? 0) - (b.latest_price ?? 0)); break
      case 'purchase_count': list.sort((a, b) => (b.purchase_count ?? 0) - (a.purchase_count ?? 0)); break
      case 'price_up': list.sort((a, b) => (pct(b.latest_price, b.prev_price) ?? -999) - (pct(a.latest_price, a.prev_price) ?? -999)); break
      case 'latest_date': list.sort((a, b) => (b.latest_date ?? '').localeCompare(a.latest_date ?? '')); break
    }
    return list
  }, [allMaterials, selectedCat, search, sort, onlyPriceUp])

  const priceUpCount = allMaterials.filter(m => { const p = pct(m.latest_price, m.prev_price); return p !== null && p > 0 }).length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, unit: newUnit, category_id: newCatId || null, memo: newMemo }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowAdd(false); setNewName(''); setNewUnit(''); setNewCatId(''); setNewMemo('')
      load()
    } catch (err) { alert((err as Error).message) }
    finally { setAdding(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('이 자재를 삭제하시겠습니까?')) return
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">자재 현황</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-0.5">
              총 {allMaterials.length}종
              {priceUpCount > 0 && <span className="ml-2 text-red-500 font-medium">· 가격 오른 항목 {priceUpCount}종</span>}
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs md:text-sm">+ 자재 등록</button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        <button onClick={() => setSelectedCat('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${selectedCat === '' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'}`}>
          전체 {!loading && `(${allMaterials.length})`}
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setSelectedCat(String(c.id))}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${selectedCat === String(c.id) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'}`}>
            {c.name} ({allMaterials.filter(m => m.category_id === c.id).length})
          </button>
        ))}
        {allMaterials.some(m => !m.category_id) && (
          <button onClick={() => setSelectedCat('null')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${selectedCat === 'null' ? 'bg-gray-600 text-white' : 'bg-white border border-gray-200 text-gray-400'}`}>
            미분류 ({allMaterials.filter(m => !m.category_id).length})
          </button>
        )}
      </div>

      {/* 검색 + 정렬 */}
      <div className="card mb-4 py-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[140px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="자재명 검색..." className="input-field pl-7 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="input-field text-sm max-w-[150px] md:max-w-[180px]">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={onlyPriceUp} onChange={e => setOnlyPriceUp(e.target.checked)} className="w-4 h-4 accent-red-500" />
            <span className="text-xs md:text-sm text-gray-700">가격 오른 항목만</span>
            {priceUpCount > 0 && <span className="badge bg-red-100 text-red-600 text-[11px]">{priceUpCount}</span>}
          </label>
          {(search || selectedCat || onlyPriceUp) && (
            <button onClick={() => { setSearch(''); setSelectedCat(''); setOnlyPriceUp(false) }} className="text-xs text-gray-400 hover:text-gray-600 underline">초기화</button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length}종</span>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="text-3xl mb-2 animate-pulse">📦</div>
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2">{search ? '🔍' : '📦'}</p>
          <p className="text-gray-500 text-sm">{search ? `"${search}" 결과 없음` : '등록된 자재가 없습니다.'}</p>
        </div>
      ) : (
        <>
          {/* 모바일 카드 뷰 */}
          <div className="md:hidden space-y-2">
            {filtered.map(m => {
              const p = pct(m.latest_price, m.prev_price)
              return (
                <div key={m.id} className={`bg-white rounded-xl border p-4 ${p !== null && p >= 10 ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/materials/${m.id}`} className="font-semibold text-blue-600 text-sm">
                      {m.name}
                    </Link>
                    <TrendBadge latest={m.latest_price ?? null} prev={m.prev_price ?? null} />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {m.category_name
                      ? <span className="badge bg-emerald-100 text-emerald-700 text-[11px]">{m.category_name}</span>
                      : <span className="text-gray-300 text-xs">미분류</span>}
                    {m.unit && <span className="text-xs text-gray-400">{m.unit}</span>}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400">최신 단가</p>
                      <p className="font-bold text-gray-800 text-base">{fmt(m.latest_price ?? null)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">{(m.latest_date as string)?.slice(0, 10) || '—'}</p>
                      <p className="text-xs text-gray-500">{m.latest_vendor || '—'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 데스크탑 테이블 뷰 */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                  <th className="px-4 py-3 text-left font-medium">자재명</th>
                  <th className="px-4 py-3 text-left font-medium">카테고리</th>
                  <th className="px-4 py-3 text-center font-medium">단위</th>
                  <th className="px-4 py-3 text-right font-medium">최신 단가</th>
                  <th className="px-4 py-3 text-center font-medium">가격 변동</th>
                  <th className="px-4 py-3 text-center font-medium">구매 횟수</th>
                  <th className="px-4 py-3 text-left font-medium">최근 구매일</th>
                  <th className="px-4 py-3 text-left font-medium">최근 거래처</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const p = pct(m.latest_price, m.prev_price)
                  return (
                    <tr key={m.id} className={`border-b last:border-0 transition-colors ${p !== null && p >= 10 ? 'hover:bg-red-50/40 bg-red-50/20' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <Link href={`/materials/${m.id}`} className="text-blue-600 hover:underline font-medium">{m.name}</Link>
                        {m.memo && <p className="text-xs text-gray-400 mt-0.5">{m.memo}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {m.category_name ? <span className="badge bg-emerald-100 text-emerald-700">{m.category_name}</span> : <span className="text-gray-300 text-xs">미분류</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{m.unit || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(m.latest_price ?? null)}</td>
                      <td className="px-4 py-3 text-center"><TrendBadge latest={m.latest_price ?? null} prev={m.prev_price ?? null} /></td>
                      <td className="px-4 py-3 text-center text-gray-600">{m.purchase_count ?? 0}회</td>
                      <td className="px-4 py-3 text-gray-600">{(m.latest_date as string)?.slice(0, 10) || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{m.latest_vendor || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(m.id)} className="text-xs text-red-300 hover:text-red-600">삭제</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 자재 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">자재 등록</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">자재명 <span className="text-red-500">*</span></label>
                <input value={newName} onChange={e => setNewName(e.target.value)} className="input-field" placeholder="예) 색연필, 밀가루, A4용지" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">단위</label>
                  <input value={newUnit} onChange={e => setNewUnit(e.target.value)} className="input-field" placeholder="kg, L, 박스" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">카테고리</label>
                  <select value={newCatId} onChange={e => setNewCatId(e.target.value)} className="input-field">
                    <option value="">미분류</option>
                    {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">메모</label>
                <input value={newMemo} onChange={e => setNewMemo(e.target.value)} className="input-field" placeholder="선택 입력" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">취소</button>
                <button type="submit" disabled={adding} className="btn-primary flex-1">{adding ? '등록 중...' : '등록'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="max-w-[1400px] mx-auto px-4 py-6 text-gray-400">로딩 중...</div>}>
      <MaterialsContent />
    </Suspense>
  )
}
