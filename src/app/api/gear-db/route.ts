mimport { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '250';

  const url = `https://moonlight-gear.com/collections/all/products.json?limit=${limit}&page=${page}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }, // 1時間キャッシュ
    });
    if (!res.ok) return NextResponse.json({ products: [] }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
