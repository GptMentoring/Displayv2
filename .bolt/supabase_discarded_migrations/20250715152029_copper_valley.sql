/*
  # Komplette Datenbank-Einrichtung für Simple Office Show
  
  Diese Migration erstellt das komplette Schema von Grund auf neu:
  
  1. Tabellen:
     - content_items: Speichert alle Slideshow-Inhalte (Bilder und iFrames)
     - settings: Speichert Anwendungseinstellungen
     - settings_history: Speichert Verlauf der Einstellungsänderungen
  
  2. ENUM-Typen:
     - content_category: Kategorien für Inhalte
  
  3. Storage:
     - content bucket für Datei-Uploads
  
  4. Row Level Security (RLS):
     - Vollständige Sicherheitsrichtlinien für alle Tabellen
  
  5. Trigger und Funktionen:
     - Automatische Verlaufsverfolgung für Einstellungen
  
  6. Initialdaten:
     - Standard-Slideshow-Einstellungen
     - Admin-Benutzer
*/

-- ============================================================================
-- 1. ENUM-TYPEN ERSTELLEN
-- ============================================================================

-- Erstelle ENUM für Inhaltskategorien
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_category') THEN
    CREATE TYPE content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal');
  END IF;
END $$;

-- ============================================================================
-- 2. TABELLEN ERSTELLEN
-- ============================================================================

-- Erstelle content_items Tabelle
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('image', 'iframe')),
  url text NOT NULL,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  sort_order integer,
  name text,
  category content_category NOT NULL DEFAULT 'vision_board',
  tags text[] NOT NULL DEFAULT '{}'
);

-- Erstelle settings Tabelle
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Erstelle settings_history Tabelle
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id text REFERENCES settings(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. INDIZES ERSTELLEN
-- ============================================================================

-- Index für effiziente Abfrage der Einstellungshistorie
CREATE INDEX IF NOT EXISTS idx_settings_history_settings_id_created_at 
ON settings_history(settings_id, created_at DESC);

-- Index für content_items Sortierung
CREATE INDEX IF NOT EXISTS idx_content_items_sort_order 
ON content_items(sort_order NULLS LAST, created_at DESC);

-- Index für content_items Kategorie und Tags
CREATE INDEX IF NOT EXISTS idx_content_items_category 
ON content_items(category);

CREATE INDEX IF NOT EXISTS idx_content_items_tags 
ON content_items USING GIN(tags);

-- ============================================================================
-- 4. STORAGE BUCKET ERSTELLEN
-- ============================================================================

-- Erstelle Storage Bucket für Inhalte
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) AKTIVIEREN
-- ============================================================================

-- Aktiviere RLS für alle Tabellen
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS-RICHTLINIEN FÜR CONTENT_ITEMS
-- ============================================================================

-- Lösche bestehende Richtlinien falls vorhanden
DROP POLICY IF EXISTS "Anyone can view content_items" ON content_items;
DROP POLICY IF EXISTS "Authenticated users can insert content_items" ON content_items;
DROP POLICY IF EXISTS "Authenticated users can update content_items" ON content_items;
DROP POLICY IF EXISTS "Authenticated users can delete content_items" ON content_items;

-- Erstelle neue Richtlinien
CREATE POLICY "Anyone can view content_items"
  ON content_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert content_items"
  ON content_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    type IN ('image', 'iframe') AND
    url IS NOT NULL AND
    category IN ('vision_board', 'kpi', 'monthly_goal') AND
    tags IS NOT NULL AND
    (
      (type = 'image' AND storage_path IS NOT NULL) OR
      (type = 'iframe' AND storage_path IS NULL)
    )
  );

CREATE POLICY "Authenticated users can update content_items"
  ON content_items
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (
      -- Fall 1: Nur sort_order wird geändert
      (
        sort_order IS NOT NULL AND
        sort_order IS DISTINCT FROM (SELECT c.sort_order FROM content_items c WHERE c.id = content_items.id) AND
        type = (SELECT c.type FROM content_items c WHERE c.id = content_items.id) AND
        url = (SELECT c.url FROM content_items c WHERE c.id = content_items.id) AND
        storage_path IS NOT DISTINCT FROM (SELECT c.storage_path FROM content_items c WHERE c.id = content_items.id) AND
        category = (SELECT c.category FROM content_items c WHERE c.id = content_items.id) AND
        tags IS NOT DISTINCT FROM (SELECT c.tags FROM content_items c WHERE c.id = content_items.id)
      )
      OR
      -- Fall 2: Andere Felder werden geändert
      (
        type IN ('image', 'iframe') AND
        url IS NOT NULL AND
        category IN ('vision_board', 'kpi', 'monthly_goal') AND
        tags IS NOT NULL AND
        (
          (type = 'image' AND storage_path IS NOT NULL) OR
          (type = 'iframe' AND storage_path IS NULL)
        )
      )
    )
  );

CREATE POLICY "Authenticated users can delete content_items"
  ON content_items
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- 7. RLS-RICHTLINIEN FÜR SETTINGS
-- ============================================================================

-- Lösche bestehende Richtlinien falls vorhanden
DROP POLICY IF EXISTS "Anyone can view settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;

-- Erstelle neue Richtlinien
CREATE POLICY "Anyone can view settings"
  ON settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings"
  ON settings
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 8. RLS-RICHTLINIEN FÜR SETTINGS_HISTORY
-- ============================================================================

-- Lösche bestehende Richtlinien falls vorhanden
DROP POLICY IF EXISTS "Anyone can view settings history" ON settings_history;
DROP POLICY IF EXISTS "Authenticated users can insert settings history" ON settings_history;

-- Erstelle neue Richtlinien
CREATE POLICY "Anyone can view settings history"
  ON settings_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings history"
  ON settings_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 9. STORAGE-RICHTLINIEN
-- ============================================================================

-- Lösche bestehende Storage-Richtlinien
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- Erstelle neue Storage-Richtlinien
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'content' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'content');

CREATE POLICY "Authenticated users can delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'content' AND auth.role() = 'authenticated');

-- ============================================================================
-- 10. FUNKTIONEN UND TRIGGER
-- ============================================================================

-- Lösche bestehende Trigger und Funktionen
DROP TRIGGER IF EXISTS settings_history_trigger ON settings;
DROP FUNCTION IF EXISTS add_settings_history();

-- Erstelle Funktion für Einstellungshistorie
CREATE OR REPLACE FUNCTION add_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_history (settings_id, value)
  VALUES (NEW.id, NEW.value);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erstelle Trigger für automatische Historienerfassung
CREATE TRIGGER settings_history_trigger
  AFTER INSERT OR UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION add_settings_history();

-- ============================================================================
-- 11. INITIALDATEN EINFÜGEN
-- ============================================================================

-- Standard-Slideshow-Einstellungen
INSERT INTO settings (id, value)
VALUES (
  'slideshow_settings',
  json_build_object(
    'duration', 10,
    'transition', 'fade',
    'showControls', true,
    'layoutMode', 'regular',
    'imageFit', 'contain',
    'quadrantConfig', json_build_object(
      'topLeft', json_build_object('type', 'image', 'contentId', null),
      'topRight', json_build_object('type', 'image', 'contentId', null),
      'bottomLeft', json_build_object('type', 'image', 'contentId', null),
      'bottomRight', json_build_object('type', 'iframe', 'contentId', null)
    )
  )::text
)
ON CONFLICT (id) DO UPDATE
SET value = EXCLUDED.value;

-- Legacy slideshow_duration Einstellung für Rückwärtskompatibilität
INSERT INTO settings (id, value)
VALUES ('slideshow_duration', '10')
ON CONFLICT (id) DO UPDATE
SET value = EXCLUDED.value;

-- ============================================================================
-- 12. ADMIN-BENUTZER ERSTELLEN
-- ============================================================================

-- Erstelle Admin-Benutzer falls nicht vorhanden
DO $$
DECLARE
  admin_email text := 'admin@simpleofficeshow.com';
  admin_password text := 'SimpleOffice2025!';
BEGIN
  -- Prüfe ob Benutzer bereits existiert
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) THEN
    -- Füge neuen Admin-Benutzer ein
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Admin-Benutzer erstellt: % mit Passwort: %', admin_email, admin_password;
  ELSE
    RAISE NOTICE 'Admin-Benutzer % existiert bereits', admin_email;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION ABGESCHLOSSEN
-- ============================================================================

-- Bestätige erfolgreiche Migration
DO $$
BEGIN
  RAISE NOTICE '=== DATENBANK-MIGRATION ERFOLGREICH ABGESCHLOSSEN ===';
  RAISE NOTICE 'Tabellen erstellt: content_items, settings, settings_history';
  RAISE NOTICE 'Storage Bucket erstellt: content';
  RAISE NOTICE 'RLS-Richtlinien konfiguriert';
  RAISE NOTICE 'Trigger und Funktionen eingerichtet';
  RAISE NOTICE 'Initialdaten eingefügt';
  RAISE NOTICE 'Admin-Login: admin@simpleofficeshow.com / SimpleOffice2025!';
  RAISE NOTICE '========================================================';
END $$;