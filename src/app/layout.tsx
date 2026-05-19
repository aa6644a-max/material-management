import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: '자재관리 시스템',
  description: '영수증·거래명세표 기반 자재 단가 이력 관리',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Navigation />
        <main className="pb-20 md:pb-0">{children}</main>
      </body>
    </html>
  )
}
