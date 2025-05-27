export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      content_items: {
        Row: {
          id: string
          type: 'image' | 'iframe'
          url: string
          storage_path: string | null
          created_at: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          type: 'image' | 'iframe'
          url: string
          storage_path?: string | null
          created_at?: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          type?: 'image' | 'iframe'
          url?: string
          storage_path?: string | null
          created_at?: string
          sort_order?: number | null
        }
      }
      settings: {
        Row: {
          id: string
          value: string
          created_at: string
        }
        Insert: {
          id: string
          value: string
          created_at?: string
        }
        Update: {
          id?: string
          value?: string
          created_at?: string
        }
      }
    }
  }
}