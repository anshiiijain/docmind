// frontend/src/api/analytics.ts

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocStats {
  filename:         string
  chunk_count:      number
  word_count:       number
  char_count:       number
  avg_chunk_length: number
  reading_time_mins: number
  language:         string
}

export interface Keyword {
  keyword: string
  score:   number
}

export interface Entity {
  text:  string
  count: number
}

export interface EntityMap {
  PERSON?:  Entity[]
  ORG?:     Entity[]
  GPE?:     Entity[]
  DATE?:    Entity[]
  MONEY?:   Entity[]
  PRODUCT?: Entity[]
}

export interface Topic {
  topic_id:    number
  label:       string
  keywords:    string[]
  chunk_count: number
}

export interface SummaryResult {
  filename:    string
  summary:     string
  key_points:  string[]
  chunks_used: number
  from_cache:  boolean
}

// ── API calls ──────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const analyticsApi = {
  stats:    (filename: string) =>
    get<DocStats>(`/analytics/stats/${encodeURIComponent(filename)}`),

  keywords: (filename: string) =>
    get<{ keywords: Keyword[] }>(`/analytics/keywords/${encodeURIComponent(filename)}`),

  entities: (filename: string) =>
    get<{ entities: EntityMap; total_chunks_analyzed: number }>(
      `/analytics/entities/${encodeURIComponent(filename)}`),

  topics:   (filename: string) =>
    get<{ topics: Topic[]; total_chunks: number }>(
      `/analytics/topics/${encodeURIComponent(filename)}`),

  summary: (filename: string, refresh = false) =>
    get<SummaryResult>(
      `/analytics/summary/${encodeURIComponent(filename)}${refresh ? '?refresh=true' : ''}`),
}

// Keep old mock exports so existing imports don't break
export const tasksByStatus = [
  { status: 'To do',       count: 8  },
  { status: 'In progress', count: 5  },
  { status: 'Done',        count: 12 },
]
export const docsOverTime = [
  { month: 'Jan', docs: 2  },
  { month: 'Feb', docs: 5  },
  { month: 'Mar', docs: 4  },
  { month: 'Apr', docs: 9  },
  { month: 'May', docs: 7  },
  { month: 'Jun', docs: 14 },
]
export const fileTypes = [
  { name: 'PDF',  value: 12 },
  { name: 'DOCX', value: 6  },
  { name: 'TXT',  value: 4  },
  { name: 'CSV',  value: 3  },
]