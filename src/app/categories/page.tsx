'use client'

import { useState, useEffect } from 'react'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/categories')
    setCategories(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNewName('')
      load()
    } catch (err) { alert((err as Error).message) }
    finally { setAdding(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?\n이 카테고리로 분류된 자재들은 "미분류"로 변경됩니다.`)) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">카테고리 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        업종에 맞는 카테고리를 자유롭게 만드세요.<br/>
        예) 식재료, 소모품, 청소용품, 주방용품, 문구류 등
      </p>

      {/* 추가 폼 */}
      <div className="card mb-5">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="input-field flex-1"
            placeholder="새 카테고리 이름 입력"
            autoFocus
          />
          <button type="submit" disabled={adding || !newName.trim()} className="btn-primary px-6">
            {adding ? '추가 중...' : '+ 추가'}
          </button>
        </form>
      </div>

      {/* 목록 */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-10">로딩 중...</p>
        ) : categories.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">아직 카테고리가 없습니다.</p>
            <p className="text-gray-300 text-xs mt-1">위에서 첫 카테고리를 추가해보세요!</p>
          </div>
        ) : (
          <ul>
            {categories.map((c, idx) => (
              <li key={c.id} className={`flex items-center justify-between px-5 py-3.5 ${
                idx < categories.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {c.name[0]}
                  </span>
                  <span className="font-medium">{c.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{(c.created_at as string)?.slice(0, 10)}</span>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-xs text-red-300 hover:text-red-600 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        카테고리를 삭제하면 해당 카테고리의 자재들은 "미분류"로 변경됩니다.
      </p>
    </div>
  )
}
