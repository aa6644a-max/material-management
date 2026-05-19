'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot,
} from 'recharts'
import type { PriceHistory } from '@/types'

interface Props {
  history: PriceHistory[]
  unit: string | null
}

function fmt(n: number) { return new Intl.NumberFormat('ko-KR').format(n) + '원' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600 font-semibold text-sm">{fmt(d.unit_price)}</p>
      {d.vendor_name && <p className="text-gray-500 mt-1">거래처: {d.vendor_name}</p>}
      {d.quantity && <p className="text-gray-500">수량: {d.quantity}</p>}
    </div>
  )
}

export default function PriceChart({ history, unit }: Props) {
  if (!history.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
      구매 이력이 없습니다.
    </div>
  )

  // 날짜 오름차순 정렬
  const sorted = [...history].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
  const data = sorted.map(h => ({
    date: h.purchase_date.slice(0, 10),
    unit_price: h.unit_price,
    quantity: h.quantity,
    amount: h.amount,
    vendor_name: h.vendor_name,
  }))

  const prices = data.map(d => d.unit_price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

  const isUp = data.length >= 2 && data[data.length - 1].unit_price > data[0].unit_price
  const isDown = data.length >= 2 && data[data.length - 1].unit_price < data[0].unit_price

  return (
    <div>
      {/* 요약 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">최신 단가</p>
          <p className={`font-bold text-sm mt-0.5 ${isUp ? 'text-red-600' : isDown ? 'text-blue-600' : 'text-gray-800'}`}>
            {fmt(data[data.length - 1].unit_price)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">평균 단가</p>
          <p className="font-bold text-sm mt-0.5 text-gray-700">{fmt(avgPrice)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">최저 단가</p>
          <p className="font-bold text-sm mt-0.5 text-blue-600">{fmt(minPrice)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">최고 단가</p>
          <p className="font-bold text-sm mt-0.5 text-red-600">{fmt(maxPrice)}</p>
        </div>
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={6} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(v) + (unit ? '' : '')}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avgPrice} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: '평균', position: 'right', fontSize: 10 }} />
          <Line
            type="monotone" dataKey="unit_price"
            stroke="#059669" strokeWidth={2.5}
            dot={<Dot r={4} fill="#059669" strokeWidth={2} stroke="#fff" />}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
