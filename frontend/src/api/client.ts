const BASE = ''; // same origin, proxied in dev

export interface SessionInfo {
  session_id: string;
  width: number;
  height: number;
}

export interface SizeResponse {
  width: number;
  height: number;
}

export async function openImage(file: File): Promise<SessionInfo> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/open`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getImageUrl(sid: string): string {
  return `${BASE}/api/image/${sid}?t=${Date.now()}`;
}

export async function cropImage(sid: string, x: number, y: number, w: number, h: number): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/crop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, x, y, w, h }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resizeImage(sid: string, width: number, height: number): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/resize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, width, height }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function undo(sid: string): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function redo(sid: string): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/redo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function magicWand(sid: string, x: number, y: number, tolerance: number): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/magic-wand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, x, y, tolerance }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function rectErase(sid: string, x: number, y: number, w: number, h: number): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/rect-erase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, x, y, w, h }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function alphaRepaint(sid: string, color: string): Promise<SizeResponse> {
  const res = await fetch(`${BASE}/api/alpha-repaint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, color }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface SessionInfoResponse {
  width: number;
  height: number;
  can_undo: boolean;
  can_redo: boolean;
}

export async function getSessionInfo(sid: string): Promise<SessionInfoResponse> {
  const res = await fetch(`${BASE}/api/session-info/${sid}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getExportUrl(sid: string, format: 'png' | 'jpeg' = 'png'): string {
  return `${BASE}/api/export/${sid}?format=${format}`;
}
