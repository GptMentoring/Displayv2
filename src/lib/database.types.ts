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
        }
        Insert: {
          id?: string
          type: 'image' | 'iframe'
          url: string
          storage_path?: string | null
          created_at?: string
          sort_order?: number | null
          name?: string | null
        }
        Update: {
          id?: string
          type?: 'image' | 'iframe'
          url?: string
          storage_path?: string | null
          created_at?: string
          sort_order?: number | null
          name?: string | null
        }
      }
    }
  }
}