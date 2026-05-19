'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Purchase, Vendor, PurchaseItem } from '@/types'

function fmt(n: number) { return new Intl.NumberFormat('ko-KR').format(n) + '원' }

function getMonthRange(offset: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

function get3MonthRange() {
  const now = new Date()
  return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
}

function HistoryContent() {
  const searchParams = useSearchParams()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [activeQuick, setActiveQuick] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailItems, setDetailItems] = useState<Record<number, PurchaseItem[]>>({})
  const [detailLoading, setDetailLoading] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedVendor) params.set('vendor', selectedVendor)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (itemSearch.trim()) params.set('item', itemSearch.trim())
    const res = await fetch('/api/purchases?' + params)
    setPurchases(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch('/api/vendors').then(r => r.json()).then(setVendors).catch(() => {}) }, [])
  useEffect(() => { load() }, [selectedVendor, from, to, itemSearch])
  useEffect(() => {
    const purchaseId = searchParams.get('purchase')
    if (purchaseId) setExpandedId(Number(purchaseId))
  }, [searchParams])

  function applyQuick(key: string) {
    setActiveQuick(key); setSelectedVendor(''); setItemSearch('')
    if (key === 'this') { const r = getMonthRange(0); setFrom(r.from); setTo(r.to) }
    else if (key === 'last') { const r = getMonthRange(-1); setFrom(r.from); setTo(r.to) }
    else if (key === '3m') { const r = get3MonthRange(); setFrom(r.from); setTo(r.to) }
    else { setFrom(''); setTo('') }
  }

  function resetAll() { setSelectedVendor(''); setFrom(''); setTo(''); setItemSearch(''); setActiveQuick('') }

  async function toggleDetail(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (detailItems[id]) return
    setDetailLoading(id)
    const res = await fetch(`/api/purchases/${id}`)
    const { items } = await res.json()
    setDetailItems(prev => ({ ...prev, [id]: items }))
    setDetailLoading(null)
  }

  async function handleDelete(id: number) {
    if (!confirm('이 구매 기록을 삭제하시겠습니까?')) return
    await fetch(`/api/purchases/${id}`, { method: 'DELETE' })
    load()
    if (expandedId === id) setExpandedId(null)
  }

  const periodTotal = purchases.reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const hasFilter = selectedVendor || from || to || itemSearch

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4">구매 이력</h1>

      {/* 빠른 기간 선택 */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {[
          { key: 'this', label: '이번 달' },
          { key: 'last', label: '지난 달' },
          { key: '3m', label: '최근 3개월' },
          { key: 'all', label: '전체' },
        ].map(q => (
          <button key={q.key} onClick={() => applyQuick(q.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors border ${
              activeQuick === q.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
            }`}>
            {q.label}
          </button>
        ))}
        <button onClick={() => setShowFilter(!showFilter)}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border transition-colors ${
            hasFilter ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-200 text-gray-600'
          }`}>
          🔽 상세 필터{hasFilter ? ' ●' : ''}
        </button>
      </div>

      {/* 상세 필터 (토글) */}
      {showFilter && (
        <div className="card mb-4 py-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input type="text" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setActiveQuick('') }}
                placeholder="품목명 검색..." className="input-field pl-7 text-sm" />
              {itemSearch && <button onClick={() => setItemSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg">×</button>}
            </div>
            <select value={selectedVendor} onChange={e => { setSelectedVendor(e.target.value); setActiveQuick('') }} className="input-field text-sm max-w-full sm:max-w-[180px]">
              <option value="">전체 거래처</option>
              {vendors.map(v => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setActiveQuick('') }} className="input-field text-sm flex-1" />
              <span className="text-gray-400 text-sm flex-shrink-0">~</span>
              <input type="date" value={to} onChange={e => { setTo(e.target.value); setActiveQuick('') }} className="input-field text-sm flex-1" />
            </div>
            {hasFilter && <button onClick={resetAll} className="text-sm text-gray-400 hover:text-gray-600 underline self-center">초기화</button>}
          </div>
        </div>
      )}

      {/* 결과 요약 */}
      {!loading && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{purchases.length}건</span>
            {itemSearch && <span className="ml-1 text-blue-600 text-xs">· "{itemSearch}"</span>}
          </p>
          {purchases.length > 0 && (
            <p className="text-sm font-semibold text-gray-700">합계: <span className="text-emerald-700">{fmt(periodTotal)}</span></p>
          )}
        </div>
      )}

      {/* 목록 */}
      <div className="space-y-2">
        {loading ? (
          <div className="card text-center py-10">
            <div className="text-3xl mb-2 animate-pulse">📋</div>
            <p className="text-gray-400 text-sm">불러오는 중...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-2">{hasFilter ? '🔍' : '📋'}</p>
            <p className="text-gray-500 text-sm">{hasFilter ? '조건에 맞는 이력이 없습니다.' : '구매 이력이 없습니다.'}</p>
            {!hasFilter && <Link href="/input" className="text-emerald-600 text-sm hover:underline mt-2 block">영수증 입력하기 →</Link>}
          </div>
        ) : purchases.map(p => (
          <div key={p.id} className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleDetail(p.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {p.vendor_name || <span className="text-gray-400 font-normal">거래처 미지정</span>}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{p.item_count as number}건</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{(p.purchase_date as string)?.slice(0, 10)}{p.receipt_no ? ` · No.${p.receipt_no}` : ''}</p>
              </div>
              <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                <span className="font-bold text-sm text-gray-800">{fmt(p.total_amount)}</span>
                <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} className="text-red-300 hover:text-red-600 text-xs hidden sm:block">삭제</button>
                <span className="text-gray-400 text-sm">{expandedId === p.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedId === p.id && (
              <div className="border-t border-gray-100 bg-gray-50">
                {detailLoading === p.id ? (
                  <p className="text-center text-gray-400 py-4 text-sm">로딩 중...</p>
                ) : (detailItems[p.id] || []).length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">품목이 없습니다.</p>
                ) : (
                  <>
                    {/* 모바일: 카드형 */}
                    <div className="sm:hidden divide-y divide-gray-100">
                      {(detailItems[p.id] as PurchaseItem[]).map(item => (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex justify-between items-start">
                            <div>
                              {item.material_id
                                ? <Link href={`/materials/${item.material_id}`} className="text-blue-600 font-medium text-sm">{item.item_name_raw}</Link>
                                : <span className="text-sm font-medium">{item.item_name_raw}</span>}
                              {item.category_name && <span className="ml-2 badge bg-emerald-100 text-emerald-700 text-[11px]">{item.category_name}</span>}
                              <p className="text-xs text-gray-400 mt-0.5">{[item.spec, item.unit].filter(Boolean).join(' · ') || '—'}</p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-bold text-sm">{fmt(item.amount)}</p>
                              <p className="text-xs text-gray-400">{item.unit_price.toLocaleString()}원 × {item.quantity}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-2.5 bg-white flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-medium">합계</span>
                        <span className="font-bold text-sm">{fmt(p.total_amount)}</span>
                      </div>
                    </div>
                    {/* 데스크탑: 테이블 */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="px-5 py-2 text-left font-medium">품명</th>
                            <th className="px-4 py-2 text-left font-medium">카테고리</th>
                            <th className="px-4 py-2 text-left font-medium">규격</th>
                            <th className="px-4 py-2 text-center font-medium">단위</th>
                            <th className="px-4 py-2 text-right font-medium">수량</th>
                            <th className="px-4 py-2 text-right font-medium">단가</th>
                            <th className="px-4 py-2 text-right font-medium">금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailItems[p.id] as PurchaseItem[]).map(item => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-white">
                              <td className="px-5 py-2.5">
                                {item.material_id
                                  ? <Link href={`/materials/${item.material_id}`} className="text-blue-600 hover:underline font-medium">{item.item_name_raw}</Link>
                                  : <span>{item.item_name_raw}</span>}
                              </td>
                              <td className="px-4 py-2.5">{item.category_name ? <span className="badge bg-emerald-100 text-emerald-700">{item.category_name}</span> : <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-gray-500">{item.spec || '—'}</td>
                              <td className="px-4 py-2.5 text-center text-gray-500">{item.unit || '—'}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-right font-medium">{fmt(item.unit_price)}</td>
                              <td className="px-4 py-2.5 text-right">{fmt(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 font-bold bg-white">
                            <td colSpan={6} className="px-5 py-2 text-right text-gray-600 text-xs">합  계</td>
                            <td className="px-4 py-2 text-right">{fmt(p.total_amount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-gray-400">로딩 중...</div>}>
      <HistoryContent />
    </Suspense>
  )
}
