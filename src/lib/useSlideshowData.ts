import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Database } from './database.types';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type Settings = {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
  showControls: boolean;
  layoutMode: 'regular' | 'quadrant';
  quadrantConfig: {
    topLeft: { type: 'image' | 'iframe'; contentId: string | null };
    topRight: { type: 'image' | 'iframe'; contentId: string | null };
    bottomLeft: { type: 'image' | 'iframe'; contentId: string | null };
    bottomRight: { type: 'image' | 'iframe'; contentId: string | null };
  };
};

const defaultSettings: Settings = {
  duration: 10,
  transition: 'fade',
  showControls: true,
  layoutMode: 'regular',
  quadrantConfig: {
    topLeft: { type: 'image', contentId: null },
    topRight: { type: 'iframe', contentId: null },
    bottomLeft: { type: 'iframe', contentId: null },
    bottomRight: { type: 'image', contentId: null }
  }
};

const Slideshow: React.FC = () => {