import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 120

const PROMPT = `당신은 영수증·거래명세표·세금계산서 분석 전문가입니다.
문서에서 구매 정보를 추출하여 반드시 순수 JSON만 반환하세요.
마크다운 코드블록, 설명 텍스트, 주석 없이 JSON 객체만 출력하세요.

다음 형식으로 정보를 추출하세요:
{
  "vendor_name": "거래처/상호명 (없으면 빈 문자열)",
  "purchase_date": "구매일자 YYYY-MM-DD 형식 (없으면 오늘 날짜, 연도만 있으면 추측)",
  "receipt_no": "영수증/전표 번호 (없으면 빈 문자열)",
  "items": [
    {
      "name": "품명/품목명",
      "spec": "규격/사양 (없으면 빈 문자열)",
      "unit": "단위 (개, EA, kg, L, box, 봉, 팩 등, 없으면 빈 문자열)",
      "quantity": 수량(소수 허용, 없으면 1),
      "unit_price": 단가(정수, 없으면 amount와 같음),
      "amount": 금액(정수)
    }
  ]
}

규칙:
1. 소계·합계·부가세·VAT·할인·봉사료 행은 items에 포함하지 마세요
2. 금액은 쉼표/원/₩ 기호 없이 순수 정수만
3. 품명이 없는 행은 제외하세요
4. 같은 품목이 여러 번 나오면 각각 별도 항목으로 처리하세요
5. 날짜 형식이 다양해도 YYYY-MM-DD로 변환하세요`

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']

function extractJson(raw: string): string {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) return codeBlock[1].trim()
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first !== -1 && last > first) return raw.slice(first, last + 1)
  return raw.trim()
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google API 키가 설정되지 않았습니다. .env.local에 GOOGLE_API_KEY를 추가하세요.' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) continue
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      parts.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type,
        },
      })
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 })
    }

    parts.push({ text: PROMPT })

    const result = await model.generateContent(parts)
    const rawText = result.response.text()

    const jsonStr = extractJson(rawText)
    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      console.error('JSON 파싱 실패:', rawText.slice(0, 300))
      return NextResponse.json({ error: 'AI 응답을 파싱할 수 없습니다.' }, { status: 500 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ error: '분석 중 오류: ' + String(err) }, { status: 500 })
  }
}
