export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type QuadrantConfig = {
  [key in 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight']: {
    type: 'image' | 'iframe';
    contentId: string | null;
  };
};

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
          name: string | null
          category: string // Corresponds to content_category ENUM
          tags: string[] | null
        }
        Insert: {
          id?: string
          type: 'image' | 'iframe'
          url: string
          storage_path?: string | null
          created_at?: string
          sort_order?: number | null
          name?: string | null
          category?: string // Corresponds to content_category ENUM, default in DB
          tags?: string[] | null
        }
        Update: {
          id?: string
          type?: 'image' | 'iframe'
          url?: string
          storage_path?: string | null
          created_at?: string
          sort_order?: number | null
          name?: string | null
          category?: string // Corresponds to content_category ENUM
          tags?: string[] | null
        }
      }
    }
    Enums: {
      content_category: "vision_board" | "kpi" | "monthly_goal"
    }
  }
}