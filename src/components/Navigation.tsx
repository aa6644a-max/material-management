'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: '🏠' },
  { href: '/materials', label: '자재 현황', icon: '📦' },
  { href: '/history', label: '구매 이력', icon: '📋' },
  { href: '/vendors', label: '거래처', icon: '🏪' },
  { href: '/categories', label: '카테고리', icon: '🏷️' },
]

const BOTTOM_NAV = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/materials', label: '자재', icon: '📦' },
  { href: '/input', label: '입력', icon: '🧾', primary: true },
  { href: '/history', label: '이력', icon: '📋' },
  { href: '/vendors', label: '거래처', icon: '🏪' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <>
      {/* 데스크탑 상단 네비 */}
      <nav className="hidden md:flex bg-slate-800 shadow-lg h-16 items-center sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-emerald-400 font-bold text-lg whitespace-nowrap hover:text-emerald-300 transition-colors">
              📦 자재관리
            </Link>
            <div className="flex gap-1">
              {NAV_ITEMS.map(item => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <Link
            href="/input"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap ${
              pathname === '/input'
                ? 'bg-emerald-400 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white'
            }`}
          >
            🧾 영수증 입력
          </Link>
        </div>
      </nav>

      {/* 모바일 상단 헤더 */}
      <header className="md:hidden bg-slate-800 h-12 flex items-center px-4 sticky top-0 z-40">
        <span className="text-emerald-400 font-bold text-base">📦 자재관리</span>
      </header>

      {/* 모바일 하단 네비 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
        <div className="flex">
          {BOTTOM_NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
                >
                  <span className={`w-12 h-12 -mt-5 rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-white ${
                    active ? 'bg-emerald-500' : 'bg-emerald-600'
                  }`}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] font-medium ${active ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className={`text-[10px] font-medium ${active ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
