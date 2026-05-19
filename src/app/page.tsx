import client from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function priceTrend(latest: number | null, prev: number | null) {
  if (!latest || !prev || prev === 0) return null
  return Math.round(((latest - prev) / prev) * 100)
}

export default async function DashboardPage() {
  let stats = { materials: 0, purchases: 0, totalSpend: 0, vendors: 0, thisMonth: 0, lastMonth: 0 }
  let recentPurchases: Record<string, unknown>[] = []
  let priceAlerts: Record<string, unknown>[] = []

  try {
    const [s1, s2, s3, s4, s5, s6, rp, pa] = await Promise.all([
      client.execute('SELECT COUNT(*) as c FROM materials'),
      client.execute('SELECT COUNT(*) as c FROM purchases'),
      client.execute('SELECT COALESCE(SUM(amount), 0) as t FROM purchase_items'),
      client.execute('SELECT COUNT(*) as c FROM vendors'),
      client.execute(`SELECT COALESCE(SUM(pi.amount), 0) as t FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id WHERE strftime('%Y-%m', p.purchase_date) = strftime('%Y-%m', 'now')`),
      client.execute(`SELECT COALESCE(SUM(pi.amount), 0) as t FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id WHERE strftime('%Y-%m', p.purchase_date) = strftime('%Y-%m', date('now', '-1 month'))`),
      client.execute(`
        SELECT p.id, p.purchase_date, v.name as vendor_name,
               COUNT(pi.id) as item_count, COALESCE(SUM(pi.amount), 0) as total_amount
        FROM purchases p
        LEFT JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
        GROUP BY p.id ORDER BY p.purchase_date DESC, p.created_at DESC LIMIT 8
      `),
      client.execute(`
        SELECT m.id, m.name, m.unit, latest.unit_price as latest_price, prev.unit_price as prev_price
        FROM materials m
        JOIN (
          SELECT pi.material_id, pi.unit_price, p.purchase_date FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
          WHERE (pi.material_id, p.purchase_date) IN (SELECT material_id, MAX(purchase_date) FROM purchase_items pi2 JOIN purchases p2 ON p2.id = pi2.purchase_id GROUP BY material_id)
        ) latest ON latest.material_id = m.id
        JOIN (
          SELECT pi.material_id, pi.unit_price, p.purchase_date FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
        ) prev ON prev.material_id = m.id AND prev.purchase_date = (
          SELECT MAX(p3.purchase_date) FROM purchase_items pi3 JOIN purchases p3 ON p3.id = pi3.purchase_id
          WHERE pi3.material_id = m.id AND p3.purchase_date < latest.purchase_date
        )
        WHERE latest.unit_price > prev.unit_price AND prev.unit_price > 0
          AND CAST(latest.unit_price - prev.unit_price AS REAL) / prev.unit_price >= 0.05
        ORDER BY CAST(latest.unit_price - prev.unit_price AS REAL) / prev.unit_price DESC LIMIT 6
      `),
    ])
    stats = {
      materials: Number(s1.rows[0]?.c ?? 0),
      purchases: Number(s2.rows[0]?.c ?? 0),
      totalSpend: Number(s3.rows[0]?.t ?? 0),
      vendors: Number(s4.rows[0]?.c ?? 0),
      thisMonth: Number(s5.rows[0]?.t ?? 0),
      lastMonth: Number(s6.rows[0]?.t ?? 0),
    }
    recentPurchases = rp.rows as unknown as Record<string, unknown>[]
    priceAlerts = pa.rows as unknown as Record<string, unknown>[]
  } catch { /* DB not initialized */ }

  const isEmpty = stats.materials === 0 && stats.purchases === 0
  const monthDiff = stats.lastMonth > 0 ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100) : null

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold">대시보드</h1>
        <p className="text-xs md:text-sm text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isEmpty ? (
        <div className="card mb-6 text-center py-10">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-lg font-bold mb-2">자재관리를 시작해보세요!</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">영수증 사진 한 장으로 자재 가격을 자동으로 기록하고 분석할 수 있습니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {[
              { icon: '🏷️', step: '1단계', title: '카테고리 만들기', desc: '식재료, 소모품 등 업종에 맞게', href: '/categories', color: 'emerald' },
              { icon: '🧾', step: '2단계', title: '영수증 입력하기', desc: 'AI가 자동으로 품목·가격 추출', href: '/input', color: 'blue' },
              { icon: '📊', step: '3단계', title: '가격 변동 확인', desc: '언제 얼마나 올랐는지 한눈에', href: '/materials', color: 'purple' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className={`bg-${item.color}-50 rounded-xl p-4 border border-${item.color}-100 hover:shadow-sm transition-shadow`}>
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className={`text-xs font-semibold text-${item.color}-700 mb-1`}>{item.step}</p>
                <p className="text-sm font-medium mb-1">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">등록 자재</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.materials}<span className="text-sm font-normal text-gray-400 ml-1">종</span></p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">구매 건수</p>
              <p className="text-2xl font-bold text-blue-600">{stats.purchases}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">거래처 수</p>
              <p className="text-2xl font-bold text-purple-600">{stats.vendors}<span className="text-sm font-normal text-gray-400 ml-1">곳</span></p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">이번 달 지출</p>
              <p className="text-lg font-bold text-indigo-600">{fmt(stats.thisMonth)}</p>
              {monthDiff !== null && (
                <p className={`text-xs mt-0.5 font-medium ${monthDiff > 0 ? 'text-red-500' : monthDiff < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                  전월 대비 {monthDiff > 0 ? `▲${monthDiff}%` : monthDiff < 0 ? `▼${Math.abs(monthDiff)}%` : '변동없음'}
                </p>
              )}
            </div>
            <div className="card p-4 col-span-2 md:col-span-1">
              <p className="text-xs text-gray-500 mb-1">전월 지출</p>
              <p className="text-lg font-bold text-gray-600">{fmt(stats.lastMonth)}</p>
              <p className="text-xs mt-0.5 text-gray-400">누적 {fmt(stats.totalSpend)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* 최근 구매 이력 */}
            <div className="card md:col-span-2">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold">최근 구매 이력</h2>
                <Link href="/history" className="text-emerald-600 text-xs hover:underline">전체 보기 →</Link>
              </div>
              {recentPurchases.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm">등록된 구매 이력이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {recentPurchases.map(p => (
                    <Link key={p.id as number} href={`/history?purchase=${p.id}`}
                      className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                      <div>
                        <p className="font-medium text-sm">{(p.vendor_name as string) || <span className="text-gray-400">미지정</span>}</p>
                        <p className="text-xs text-gray-400">{(p.purchase_date as string)?.slice(0, 10)} · {p.item_count as number}건</p>
                      </div>
                      <p className="font-semibold text-sm">{fmt(p.total_amount as number)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 가격 상승 알림 */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold">⚠️ 가격 오른 항목</h2>
                <span className="text-xs text-gray-400">5%↑</span>
              </div>
              {priceAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-gray-400 text-sm">주목할 변동 없음</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {priceAlerts.map(m => {
                    const pct = priceTrend(m.latest_price as number, m.prev_price as number)
                    return (
                      <Link key={m.id as number} href={`/materials/${m.id}`}
                        className="flex items-center justify-between hover:bg-red-50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{m.name as string}</p>
                          <p className="text-xs text-gray-400">{m.unit as string || '단위 없음'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 text-sm">{fmt(m.latest_price as number)}</p>
                          {pct !== null && <span className="badge-up text-[11px]">▲ {pct}%</span>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 빠른 실행 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/input', icon: '🧾', title: '영수증 입력', desc: 'AI 자동 분석' },
          { href: '/materials', icon: '📦', title: '자재 현황', desc: '단가 및 이력 확인' },
          { href: '/history', icon: '📋', title: '구매 이력', desc: '날짜·거래처별 조회' },
          { href: '/vendors', icon: '🏪', title: '거래처 관리', desc: '거래처 정보 및 통계' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="card hover:shadow-md transition-all hover:-translate-y-0.5 text-center block p-4">
            <div className="text-2xl md:text-3xl mb-1">{item.icon}</div>
            <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
