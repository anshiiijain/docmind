import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { analyticsApi as mlApi } from '@/api/analytics'
import { getDocumentsFromBackend as getDocs } from '@/api/documents'

import type { DocStats, Keyword, EntityMap, Topic, SummaryResult } from '@/api/analytics'
const chartStyle = {
  tick:    { fontSize: 12, fill: '#8a8f98' },
  grid:    '#23252a',
  tooltip: { backgroundColor: '#141516', border: '1px solid #23252a', color: '#d0d6e0' },
}

export default function Analytics() {
  const [documents, setDocuments] = useState<string[]>([])
  const [selected,  setSelected]  = useState<string>('')
  const [stats,     setStats]     = useState<DocStats | null>(null)
  const [keywords,  setKeywords]  = useState<Keyword[]>([])
  const [entities,  setEntities]  = useState<EntityMap>({})
  const [topics,    setTopics]    = useState<Topic[]>([])
  const [loading,   setLoading]   = useState<Record<string, boolean>>({})
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<SummaryResult | null>(null)

  useEffect(() => {
    getDocs()
      .then(docs => {
        const names = docs.map(d => d.filename)
        setDocuments(names)
        if (names.length > 0) setSelected(names[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    loadAllAnalytics(selected)
  }, [selected])

  function setLoad(key: string, val: boolean) {
    setLoading(prev => ({ ...prev, [key]: val }))
  }
  function setErr(key: string, val: string) {
    setErrors(prev => ({ ...prev, [key]: val }))
  }

  async function loadAllAnalytics(filename: string) {
    setStats(null); setKeywords([]); setEntities({}); setTopics([]); setErrors({})

    setLoad('stats', true)
    mlApi.stats(filename)
      .then(setStats)
      .catch(e => setErr('stats', e.message))
      .finally(() => setLoad('stats', false))

    setLoad('summary', true)
  mlApi.summary(filename)
    .then(setSummary)
    .catch(e => setErr('summary', e.message))
    .finally(() => setLoad('summary', false))

    setLoad('keywords', true)
    mlApi.keywords(filename)
      .then(d => setKeywords(d.keywords))
      .catch(e => setErr('keywords', e.message))
      .finally(() => setLoad('keywords', false))

    setLoad('entities', true)
    mlApi.entities(filename)
      .then(d => setEntities(d.entities))
      .catch(e => setErr('entities', e.message))
      .finally(() => setLoad('entities', false))

    setLoad('topics', true)
    mlApi.topics(filename)
      .then(d => setTopics(d.topics))
      .catch(e => setErr('topics', e.message))
      .finally(() => setLoad('topics', false))
  }

  const keywordChartData = keywords.slice(0, 10).map(k => ({
    keyword: k.keyword,
    score:   Math.round(k.score * 100),
  }))

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Analytics
        </h1>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="text-sm bg-s1 border border-hairline text-ink-muted
                     rounded-md px-3 py-1.5 focus:outline-none
                     focus:ring-2 focus:ring-primary focus:border-primary"
        >
          {documents.length === 0
            ? <option>No documents uploaded</option>
            : documents.map(d => <option key={d} value={d}>{d}</option>)
          }
        </select>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-24 text-ink-tertiary">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-medium text-ink-subtle">No documents yet</p>
          <p className="text-sm mt-1">Upload a document to see ML analytics</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading.stats ? (
              Array.from({length: 4}).map((_, i) => (
                <div key={i} className="bg-s1 border border-hairline rounded-lg
                                         p-4 animate-pulse h-20" />
              ))
            ) : stats ? (
              <>
                <StatCard label="Chunks"       value={stats.chunk_count} />
                <StatCard label="Words"        value={stats.word_count.toLocaleString()} />
                <StatCard label="Reading time" value={`${stats.reading_time_mins} min`} />
                <StatCard label="Language"     value={stats.language.toUpperCase()} />
              </>
            ) : null}
          </div>

          {/* ── Summary ── */}
          <Card title="Summary" subtitle="Map-reduce — first load may take 1-2 min for large docs">
            {loading.summary ? (
              <SkeletonBlock text="Generating summary... this may take a minute for large documents" />
            ) : errors.summary ? (
              <ErrorText msg={errors.summary} />
            ) : summary ? (
              <div>
                <p className="text-sm text-ink-muted leading-relaxed mb-4">
                  {summary.summary}
                </p>
                {summary.key_points.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ink-tertiary mb-2">
                      Key Points
                    </p>
                    <ul className="space-y-1.5">
                      {summary.key_points.map((point, i) => (
                        <li key={i} className="text-sm text-ink-muted flex gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => {
                    setLoad('summary', true)
                    mlApi.summary(selected, true)  // force refresh
                      .then(setSummary)
                      .catch(e => setErr('summary', e.message))
                      .finally(() => setLoad('summary', false))
                  }}
                  className="mt-4 text-xs text-ink-tertiary hover:text-primary-hover"
                >
                  ↻ Regenerate summary
                </button>
              </div>
            ) : null}
          </Card>

          
          {/* ── Keywords chart ── */}
          <Card title="Top Keywords" subtitle="KeyBERT — semantic relevance">
            {loading.keywords ? (
              <SkeletonBlock text="Extracting keywords..." />
            ) : errors.keywords ? (
              <ErrorText msg={errors.keywords} />
            ) : keywordChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={keywordChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                  <XAxis type="number" tick={chartStyle.tick} domain={[0, 100]} />
                  <YAxis type="category" dataKey="keyword"
                    tick={chartStyle.tick} width={120} />
                  <Tooltip
                    contentStyle={chartStyle.tooltip}
                    formatter={(v: number) => [`${v}%`, 'Relevance']}
                  />
                  <Bar dataKey="score" fill="#5e6ad2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Card>

          {/* ── Entities ── */}
          <Card title="Named Entities" subtitle="spaCy NER">
            {loading.entities ? (
              <SkeletonBlock text="Extracting entities..." short />
            ) : errors.entities ? (
              <ErrorText msg={errors.entities} />
            ) : (
              <div className="space-y-4">
                {Object.entries(entities).map(([type, items]) => (
                  <div key={type}>
                    <p className="text-xs font-semibold text-ink-tertiary mb-2">
                      {entityLabel(type)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {items.slice(0, 8).map((e, i) => (
                        <span key={i}
                          className="inline-flex items-center gap-1 bg-s2
                                     border border-hairline text-ink-muted
                                     text-xs px-2.5 py-1 rounded-pill">
                          {e.text}
                          <span className="text-ink-tertiary">×{e.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(entities).length === 0 && (
                  <p className="text-ink-tertiary text-sm">No named entities found</p>
                )}
              </div>
            )}
          </Card>

          {/* ── Topics ── */}
          <Card title="Topics" subtitle="BERTopic — may take 30s">
            {loading.topics ? (
              <SkeletonBlock text="Running topic modeling... this takes ~30 seconds" short />
            ) : errors.topics ? (
              <ErrorText msg={errors.topics} />
            ) : topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topics.map(topic => (
                  <div key={topic.topic_id}
                    className="border border-hairline bg-s2 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-muted">
                        {topic.label}
                      </span>
                      <span className="text-xs text-ink-tertiary">
                        {topic.chunk_count} chunks
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {topic.keywords.map((kw, i) => (
                        <span key={i}
                          className="bg-s3 text-primary-hover text-xs
                                     px-2 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink-tertiary text-sm">No topics found</p>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}

// ── Small components ───────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div className="bg-s1 rounded-lg border border-hairline p-6">
      <h2 className="text-sm font-medium text-ink-subtle mb-4">
        {title}
        <span className="ml-2 text-xs text-ink-tertiary">({subtitle})</span>
      </h2>
      {children}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-s1 rounded-lg border border-hairline p-4">
      <p className="text-xs text-ink-tertiary mb-1">{label}</p>
      <p className="text-xl font-semibold text-ink-muted">{value}</p>
    </div>
  )
}

function SkeletonBlock({ text, short }: { text: string; short?: boolean }) {
  return (
    <div className={`${short ? 'h-24' : 'h-48'} bg-s2 border border-hairline
                      animate-pulse rounded-lg flex items-center justify-center`}>
      <span className="text-ink-tertiary text-sm">{text}</span>
    </div>
  )
}

function ErrorText({ msg }: { msg: string }) {
  return <p className="text-red-400 text-sm">{msg}</p>
}

function entityLabel(type: string): string {
  const labels: Record<string, string> = {
    PERSON:  '👤 People',
    ORG:     '🏢 Organizations',
    GPE:     '🌍 Places',
    DATE:    '📅 Dates',
    MONEY:   '💰 Money',
    PRODUCT: '📦 Products',
  }
  return labels[type] || type
}