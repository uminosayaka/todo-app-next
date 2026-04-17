'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Task,
  fetchTasks,
  createTask,
  toggleTaskStatus,
  deleteTask,
  deleteCompletedTasks,
} from '@/lib/tasks'
import type { User } from '@supabase/supabase-js'

type Filter = 'all' | 'active' | 'done'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </main>
    )
  }

  return user ? <TodoApp user={user} /> : <AuthForm />
}

// ── 認証フォーム ──────────────────────────────────────────
function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-center text-[#1a1a2e] mb-6">Todo</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border-2 border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="border-2 border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-60"
          >
            {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
          </button>
        </form>
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          className="mt-4 w-full text-sm text-indigo-600 hover:underline text-center"
        >
          {isSignUp ? 'ログインはこちら' : 'アカウントを作成する'}
        </button>
      </div>
    </main>
  )
}

// ── Todoアプリ本体 ────────────────────────────────────────
function TodoApp({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const title = input.trim()
    if (!title) return
    const task = await createTask({ title })
    setTasks(prev => [task, ...prev])
    setInput('')
  }

  async function handleToggle(task: Task) {
    const updated = await toggleTaskStatus(task)
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  async function handleDelete(id: string) {
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function handleClearDone() {
    await deleteCompletedTasks()
    setTasks(prev => prev.filter(t => t.status !== 'done'))
  }

  const filtered = tasks.filter(t =>
    filter === 'all'    ? true :
    filter === 'active' ? t.status !== 'done' :
    t.status === 'done'
  )
  const remaining = tasks.filter(t => t.status !== 'done').length

  return (
    <main className="min-h-screen bg-[#f0f2f5] flex justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#1a1a2e]">Todo</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ログアウト ({user.email})
          </button>
        </div>

        {/* 入力欄 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="タスクを入力..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-3 text-base outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg text-base transition-colors"
          >
            追加
          </button>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 mb-4">
          {(['all', 'active', 'done'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-md border-2 text-sm transition-colors ${
                filter === f
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-400'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'active' ? '未完了' : '完了'}
            </button>
          ))}
        </div>

        {/* タスクリスト */}
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="text-center text-gray-400 py-8">読み込み中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-300 py-8">タスクがありません</p>
          ) : (
            filtered.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => handleToggle(task)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                />
                <span className={`flex-1 text-base break-words ${
                  task.status === 'done' ? 'line-through text-gray-300' : 'text-gray-700'
                }`}>
                  {task.title}
                </span>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-gray-300 hover:text-red-400 text-lg px-1 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>残り {remaining} 件</span>
          <button
            onClick={handleClearDone}
            className="text-red-400 hover:text-red-600 underline transition-colors"
          >
            完了済みを削除
          </button>
        </div>
      </div>
    </main>
  )
}
