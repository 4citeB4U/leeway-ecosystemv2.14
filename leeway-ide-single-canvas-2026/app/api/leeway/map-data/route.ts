import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const mapPath = path.join(process.cwd(), 'architecture', 'ecosystem-map', 'ecosystem-map.json');
    if (!fs.existsSync(mapPath)) {
      return NextResponse.json({ error: 'Ecosystem map not found' }, { status: 404 });
    }
    const data = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}