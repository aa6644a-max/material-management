'use client'

import { useState, useEffect } from 'react'
import type { Vendor } from '@/types'

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', contact: '', memo: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/vendors')
    setVendors(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm({ name: '', contact: '', memo: '' }); setEditId(null); setShowAdd(true) }
  function openEdit(v: Vendor) { setForm({ name: v.name, contact: v.contact || '', memo: v.memo || '' }); setEditId(v.id); setShowAdd(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editId ? `/api/vendors/${editId}` : '/api/vendors'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowAdd(false); load()
    } catch (err) { alert((err as Error).message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('이 거래처를 삭제하시겠습니까?\n구매 이력의 거래처 참조가 해제됩니다.')) return
    await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">거래처 관리</h1>
        <button onClick={openAdd} className="btn-primary">+ 거래처 등록</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-16">로딩 중...</p>
        ) : vendors.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">등록된 거래처가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                <th className="px-4 py-3 text-left font-medium">거래처명</th>
                <th className="px-4 py-3 text-left font-medium">연락처</th>
                <th className="px-4 py-3 text-left font-medium">메모</th>
                <th className="px-4 py-3 text-center font-medium">구매 횟수</th>
                <th className="px-4 py-3 text-left font-medium">최근 구매</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.contact || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.memo || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{v.purchase_count ?? 0}회</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.last_purchase ? (v.last_purchase as string).slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(v)} className="text-xs text-blue-400 hover:text-blue-600 mr-3">편집</button>
                    <button onClick={() => handleDelete(v.id)} className="text-xs text-red-300 hover:text-red-600">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editId ? '거래처 편집' : '거래처 등록'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">거래처명 <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field" placeholder="예) 롯데마트, 식자재도매" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">연락처</label>
                <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                  className="input-field" placeholder="선택 입력" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">메모</label>
                <input value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                  className="input-field" placeholder="선택 입력" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">취소</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? '저장 중...' : editId ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
