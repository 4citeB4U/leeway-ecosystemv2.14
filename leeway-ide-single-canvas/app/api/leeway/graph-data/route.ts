import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const graphPath = path.join(process.cwd(), 'architecture', 'ecosystem-map', 'graphify-out', 'graph.json');
    if (!fs.existsSync(graphPath)) {
      return NextResponse.json({ error: 'Graph data not found' }, { status: 404 });
    }
    const data = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}