import { NextResponse } from "next/server";

export function ok<T>(data: T, message?: string) {
  return NextResponse.json({ success: true, data, message });
}

export function fail(error: string, status = 400, code?: string, issues?: unknown) {
  return NextResponse.json({ success: false, error, code, issues }, { status });
}
