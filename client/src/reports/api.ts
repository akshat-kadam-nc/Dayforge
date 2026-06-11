import { api } from '../api/client';
import type { LifeArea } from '../today/types';
import type { ReportsPayload } from './types';

interface ServerDoc { _id: string }

function mapArea(d: ServerDoc & Omit<LifeArea, 'id'>): LifeArea {
  return { id: d._id, name: d.name, icon: d.icon, color: d.color };
}

export async function getReports(from: string, to: string): Promise<ReportsPayload> {
  const r = await api<Omit<ReportsPayload, 'areas'> & { areas: (ServerDoc & Omit<LifeArea, 'id'>)[] }>(
    `/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return { ...r, areas: r.areas.map(mapArea) };
}
