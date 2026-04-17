import { supabase } from './supabase'

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  updated_at: string
}

export type NewTask = Pick<Task, 'title'> & Partial<Pick<Task, 'description' | 'priority' | 'due_date'>>

export type UpdateTask = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date'>>

// 全タスク取得（作成日時の降順）
export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Task[]
}

// タスク作成
export async function createTask(task: NewTask) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です')

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Task
}

// ステータス更新（完了トグル）
export async function toggleTaskStatus(task: Task) {
  const isDone = task.status === 'done'
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: isDone ? 'todo' : 'done' })
    .eq('id', task.id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

// タスク更新（汎用）
export async function updateTask(id: string, updates: UpdateTask) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

// タスク削除
export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// 完了済みタスクを一括削除
export async function deleteCompletedTasks() {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('status', 'done')

  if (error) throw error
}
