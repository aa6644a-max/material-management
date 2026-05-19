'use client'

import { useState, useRef, useEffect } from 'react'
import type { ParsedReceipt, Category } from '@/types'

interface EditableItem {
  name: string
  spec: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
  category_id: number | null
}

const EMPTY_ITEM: EditableItem = { name: '', spec: '', unit: '', quantity: 1, unit_price: 0, amount: 0, category_id: null }

function calcAmount(item: EditableItem): EditableItem {
  return { ...item, amount: Math.round(item.quantity * item.unit_price) }
}

export default function InputPage() {
  const [vendorName, setVendorName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [receiptNo, setReceiptNo] = useState('')
  const [memo, setMemo] = useState('')

  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null)

  const [items, setItems] = useState<EditableItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [inputTab, setInputTab] = useState<'upload' | 'manual'>('upload')

  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [pendingCategoryRow, setPendingCategoryRow] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

  function addFiles(list: FileList | null) {
    if (!list) return
    const valid = Array.from(list).filter(f => ALLOWED.includes(f.type))
    if (valid.length) setFiles(prev => [...prev, ...valid])
  }

  async function handleParse() {
    if (!files.length) return
    setIsParsing(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await fetch('/api/parse', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error ?? '분석 실패')
      const data: ParsedReceipt = await res.json()
      setParsed(data)
      if (data.vendor_name && !vendorName) setVendorName(data.vendor_name)
      if (data.purchase_date) setPurchaseDate(data.purchase_date)
      if (data.receipt_no) setReceiptNo(data.receipt_no)
      const newItems: EditableItem[] = (data.items ?? []).map(it => ({
        name: it.name ?? '',
        spec: it.spec ?? '',
        unit: it.unit ?? '',
        quantity: it.quantity ?? 1,
        unit_price: it.unit_price ?? 0,
        amount: it.amount ?? 0,
        category_id: null,
      }))
      setItems(prev => [...prev, ...newItems])
      setFiles([])
    } catch (err) {
      alert('분석 오류: ' + (err as Error).message)
    } finally {
      setIsParsing(false)
    }
  }

  function updateItem(idx: number, field: keyof EditableItem, val: string) {
    setItems(prev => {
      const next = [...prev]
      const isNum = field !== 'name' && field !== 'spec' && field !== 'unit'
      const updated = { ...next[idx], [field]: isNum ? Number(val) : val }
      if (field === 'quantity' || field === 'unit_price') {
        next[idx] = calcAmount(updated)
      } else {
        next[idx] = updated
      }
      return next
    })
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }
  function addRow() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function resetAll() { setItems([]); setFiles([]); setParsed(null); setVendorName(''); setReceiptNo(''); setMemo('') }

  function handleCategorySelect(idx: number, val: string) {
    if (val === '__new__') {
      setPendingCategoryRow(idx)
      setNewCategoryName('')
      setShowAddCategory(true)
    } else {
      setItems(prev => {
        const next = [...prev]
        next[idx] = { ...next[idx], category_id: val ? Number(val) : null }
        return next
      })
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created = await res.json()
      const refreshed = await fetch('/api/categories').then(r => r.json())
      setCategories(refreshed)
      if (pendingCategoryRow !== null) {
        setItems(prev => {
          const next = [...prev]
          next[pendingCategoryRow] = { ...next[pendingCategoryRow], category_id: created.id }
          return next
        })
      }
      setShowAddCategory(false)
      setNewCategoryName('')
      setPendingCategoryRow(null)
    } catch (err) { alert((err as Error).message) }
    finally { setAddingCategory(false) }
  }

  const grandTotal = items.reduce((s, i) => s + i.amount, 0)
  const fmt = (n: number) => n.toLocaleString('ko-KR')

  async function handleSave() {
    if (!purchaseDate) return alert('구매일자를 입력해주세요.')
    if (!items.length) return alert('저장할 품목이 없습니다.')
    const validItems = items.filter(i => i.name.trim())
    if (!validItems.length) return alert('품명을 입력해주세요.')

    setIsSaving(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: vendorName.trim(),
          purchase_date: purchaseDate,
          receipt_no: receiptNo.trim(),
          memo: memo.trim(),
          file_name: null,
          items: validItems.map(({ category_id, ...rest }) => ({ ...rest, category_id })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('✅ 저장 완료!')
      setItems([])
      setParsed(null)
      setReceiptNo('')
      setMemo('')
    } catch (err) {
      alert('저장 오류: ' + (err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-bold mb-5">영수증 입력</h1>

      {/* ① 기본 정보 */}
      <div className="card mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">① 구매 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">거래처명</label>
            <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)}
              placeholder="예) 마트이름, 도매상회 등" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">구매일자 <span className="text-red-500">*</span></label>
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">영수증 번호</label>
            <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)}
              placeholder="선택 입력" className="input-field" />
          </div>
          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">메모</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="선택 입력" className="input-field" />
          </div>
        </div>
      </div>

      {/* ② 입력 방식 */}
      <div className="card mb-5">
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {(['upload', 'manual'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setInputTab(tab)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                inputTab === tab
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'upload' ? '🧾 파일 업로드 (AI 분석)' : '✏️ 직접 입력'}
            </button>
          ))}
        </div>

        {inputTab === 'upload' ? (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp"
                multiple onChange={e => { addFiles(e.target.files); e.target.value = '' }} className="hidden" />
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-gray-600 font-medium text-sm">영수증·거래명세표 PDF · 사진 업로드</p>
              <p className="text-xs text-gray-400 mt-1">드래그하거나 클릭 · 여러 장 동시 선택 가능</p>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <span className="truncate text-gray-700">{f.type === 'application/pdf' ? '📄' : '🖼️'} {f.name}</span>
                    <button onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)) }}
                      className="text-gray-300 hover:text-red-500 ml-2 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center mt-4">
              <button onClick={handleParse} disabled={!files.length || isParsing}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                {isParsing
                  ? (<><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>AI 분석 중...</>)
                  : '🤖 AI 분석 시작'}
              </button>
            </div>

            {parsed && (
              <p className="text-center text-sm text-emerald-600 font-medium mt-3">
                ✅ 분석 완료 — {parsed.items?.length ?? 0}개 품목 추출됨 (누적 {items.length}개)
              </p>
            )}
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="text-2xl mb-2">✏️</p>
            <p className="text-gray-600 font-medium text-sm mb-4">품목을 직접 입력합니다</p>
            <button onClick={() => { addRow(); }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-sm">
              + 첫 행 추가
            </button>
            {items.length > 0 && (
              <p className="text-xs text-emerald-600 mt-3 font-medium">현재 {items.length}개 품목 — 아래 테이블에서 편집하세요.</p>
            )}
          </div>
        )}
      </div>

      {/* ③ 품목 테이블 */}
      {items.length > 0 && (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">③ 품목 확인 및 편집</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">총 <strong className="text-emerald-700">{items.length}개</strong> 품목</span>
              <button onClick={resetAll} className="text-xs px-3 py-1 border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors">
                전체 초기화
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left border-r border-gray-200 min-w-[140px]">품명 <span className="text-red-400">*</span></th>
                  <th className="px-3 py-2.5 text-left border-r border-gray-200 min-w-[100px]">규격</th>
                  <th className="px-3 py-2.5 border-r border-gray-200 w-16 text-center">단위</th>
                  <th className="px-3 py-2.5 border-r border-gray-200 w-20 text-right">수량</th>
                  <th className="px-3 py-2.5 border-r border-gray-200 w-28 text-right">단가</th>
                  <th className="px-3 py-2.5 border-r border-gray-200 w-28 text-right font-bold bg-slate-50">금액</th>
                  <th className="px-3 py-2.5 border-r border-gray-200 min-w-[110px] text-left">카테고리</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-amber-50/30">
                    {(['name', 'spec', 'unit'] as const).map(field => (
                      <td key={field} className={`border-r border-gray-200 p-0 ${field === 'unit' ? '' : ''}`}>
                        <input
                          value={item[field]}
                          onChange={e => updateItem(idx, field, e.target.value)}
                          className={`w-full px-2 py-1.5 text-xs focus:outline-none focus:bg-yellow-50 ${field === 'unit' ? 'text-center' : ''}`}
                          placeholder={field === 'name' ? '품명 입력' : ''}
                        />
                      </td>
                    ))}
                    {(['quantity', 'unit_price', 'amount'] as const).map(field => (
                      <td key={field} className={`border-r border-gray-200 p-0 ${field === 'amount' ? 'bg-slate-50' : ''}`}>
                        <input
                          type="number"
                          value={item[field]}
                          onChange={e => updateItem(idx, field, e.target.value)}
                          readOnly={field === 'amount'}
                          className={`w-full px-2 py-1.5 text-xs text-right focus:outline-none ${
                            field === 'amount' ? 'bg-slate-50 text-gray-500 cursor-default' : 'focus:bg-yellow-50'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="border-r border-gray-200 p-0">
                      <select
                        value={item.category_id ?? ''}
                        onChange={e => handleCategorySelect(idx, e.target.value)}
                        className="w-full px-2 py-1.5 text-xs focus:outline-none focus:bg-yellow-50 bg-transparent"
                      >
                        <option value="">미분류</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        <option value="__new__">+ 새 카테고리 추가</option>
                      </select>
                    </td>
                    <td className="p-0 text-center">
                      <button onClick={() => removeItem(idx)}
                        className="w-full py-2 text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t border-gray-300">
                  <td colSpan={5} className="px-3 py-2 text-right text-gray-600 text-xs">합  계</td>
                  <td className="px-3 py-2 text-right bg-slate-200 text-slate-800">{fmt(grandTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100 gap-3">
            <button onClick={addRow} className="btn-secondary flex items-center gap-1 self-start">
              <span className="text-base leading-none">+</span> 행 추가
            </button>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              {toast && <span className="text-emerald-600 font-semibold text-sm">{toast}</span>}
              <div className="text-right sm:border-r sm:border-gray-200 sm:pr-5">
                <p className="text-xs text-gray-400">총 구매 금액</p>
                <p className="text-xl md:text-2xl font-bold text-emerald-700">{fmt(grandTotal)}<span className="text-sm font-normal text-gray-400 ml-1">원</span></p>
              </div>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm text-sm">
                {isSaving
                  ? (<><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>저장 중...</>)
                  : '💾 저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 안내 */}
      {categories.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          카테고리를 먼저 만들면 자재를 분류할 수 있습니다. →{' '}
          <a href="/categories" className="text-emerald-600 hover:underline">카테고리 관리</a>
        </p>
      )}

      {/* 새 카테고리 추가 모달 */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddCategory(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-base mb-1">새 카테고리 추가</h3>
            <p className="text-xs text-gray-400 mb-4">추가 후 자동으로 해당 행에 적용됩니다.</p>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="input-field flex-1"
                placeholder="카테고리 이름 입력"
                autoFocus
              />
              <button type="submit" disabled={addingCategory || !newCategoryName.trim()}
                className="btn-primary px-5 whitespace-nowrap">
                {addingCategory ? '추가 중...' : '추가'}
              </button>
            </form>
            <button onClick={() => setShowAddCategory(false)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
