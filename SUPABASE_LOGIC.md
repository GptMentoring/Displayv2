# Supabase Logic für "Simple Office Show"

Dieses Dokument beschreibt die Kernlogik und -struktur der Supabase-Integration für die "Simple Office Show"-Anwendung.

## Tabellen

### 1. `content_items`

Speichert alle Inhalte, die in der Slideshow angezeigt werden können.

* **Spalten:**
    * `id` (UUID, Primary Key, DEFAULT `gen_random_uuid()`): Eindeutiger Identifikator für jeden Inhalt.
    * `type` (TEXT, NOT NULL, CHECK `type IN ('image', 'iframe')`): Art des Inhalts. *Erweiterung geplant: Potenziell weitere Typen oder Verfeinerung.*
    * `url` (TEXT, NOT NULL): Öffentliche URL für Bilder (aus Supabase Storage) oder die Quell-URL für iFrames.
    * `storage_path` (TEXT, NULLABLE): Pfad zum Objekt im Supabase Storage, nur relevant für `type = 'image'`.
    * `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Zeitstempel der Erstellung.
    * `sort_order` (INTEGER, NULLABLE): Optionale Ganzzahl zur manuellen Sortierung der Elemente.
    * `name` (TEXT, NULLABLE): Vom Benutzer vergebener Name für das Inhaltselement (z.B. für bessere Identifizierung in der Admin-Liste). [Existiert bereits, Nutzung konsistent sicherstellen]
    * `category` (TEXT, NOT NULL, CHECK `category IN ('vision_board', 'kpi', 'monthly_goal')`): Kategorie des Assets. *Neu hinzuzufügen*. (Empfehlung: PostgreSQL ENUM Typ verwenden: `CREATE TYPE content_category AS ENUM ('vision_board', 'kpi', 'monthly_goal'); ALTER TABLE content_items ADD COLUMN category content_category NOT NULL;`)
    * `tags` (TEXT[], NULLABLE): Array von Text-Tags zur weiteren Klassifizierung. *Neu hinzuzufügen*.

* **Row Level Security (RLS):** Aktiviert.
    * **SELECT:** Öffentlich lesbar für `anon` und `authenticated` Benutzer.
    * **INSERT:** Nur für `authenticated` Benutzer. Überprüfungen (WITH CHECK):
        * `auth.role() = 'authenticated'`
        * `type` muss 'image' oder 'iframe' sein.
        * `category` muss einer der definierten Kategorien entsprechen.
        * `url` darf nicht NULL sein.
        * Wenn `type` = 'image', muss `storage_path` gesetzt sein.
        * Wenn `type` = 'iframe', muss `storage_path` NULL sein.
    * **UPDATE:** Nur für `authenticated` Benutzer. Überprüfungen (WITH CHECK):
        * `auth.role() = 'authenticated'`
        * Ähnliche Validierungen wie bei INSERT.
        * Besondere Logik für `sort_order`-Updates: Wenn nur `sort_order` geändert wird, dürfen andere kritische Felder nicht gleichzeitig geändert werden.
    * **DELETE:** Nur für `authenticated` Benutzer.

### 2. `settings`

Speichert globale Anwendungseinstellungen.

* **Spalten:**
    * `id` (TEXT, Primary Key): Eindeutiger Schlüssel für die Einstellung (z.B. 'slideshow_settings').
    * `value` (TEXT, NOT NULL): Der Wert der Einstellung, oft als JSON-String gespeichert.
    * `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Zeitstempel der Erstellung/letzten Änderung.

* **Wichtige Einstellungs-IDs:**
    * `slideshow_settings`: Ein JSON-Objekt, das verschiedene Slideshow-Parameter enthält:
        * `duration` (INTEGER): Anzeigedauer pro Slide in Sekunden.
        * `transition` (TEXT: 'fade' | 'slide' | 'zoom'): Übergangseffekt.
        * `showControls` (BOOLEAN): Ob Steuerelemente standardmäßig angezeigt werden.
        * `layoutMode` (TEXT: 'regular' | 'quadrant'): Anzeigemodus der Slideshow.
        * `quadrantConfig` (JSON): Konfiguration für den Quadranten-Modus. *Erweitern für Karussell-Optionen pro Quadrant.*
            * `topLeft | topRight | bottomLeft | bottomRight`: Objekt mit:
                * `type` (TEXT: 'image' | 'iframe')
                * `contentId` (UUID, NULLABLE): Feste ID eines `content_items` für diesen Quadranten, oder NULL für automatische Auswahl/Karussell.
                * `carouselMode` (BOOLEAN): Ob dieser Quadrant als Karussell fungiert. *Neu hinzuzufügen*.
                * `carouselSource` (JSON, NULLABLE): Definiert die Quelle für das Karussell (z.B. `{ "category": "vision_board" }` oder `{ "tags": ["urgent"] }`). *Neu hinzuzufügen*.
        * `imageFit` (TEXT: 'contain' | 'cover'): Wie Bilder im regulären Modus skaliert werden. *Neu hinzuzufügen*.

* **Row Level Security (RLS):** Aktiviert.
    * **SELECT:** Öffentlich lesbar.
    * **INSERT/UPDATE:** Nur für `authenticated` Benutzer.

### 3. `settings_history`

Speichert einen Verlauf von Änderungen an der `settings`-Tabelle.

* **Spalten:**
    * `id` (UUID, Primary Key, DEFAULT `gen_random_uuid()`)
    * `settings_id` (TEXT, REFERENCES `settings(id)` ON DELETE CASCADE): Fremdschlüssel zur Einstellung.
    * `value` (TEXT, NOT NULL): Der (alte) Wert der Einstellung.
    * `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Zeitstempel der historischen Speicherung.

* **Row Level Security (RLS):** Aktiviert.
    * **SELECT:** Öffentlich lesbar.
    * **INSERT:** Nur für `authenticated` Benutzer (typischerweise durch Trigger).
    * Keine UPDATE/DELETE Policies, da die Historie unveränderlich sein sollte.

* **Trigger:**
    * Ein `AFTER INSERT OR UPDATE ON settings` Trigger (`settings_history_trigger`) ruft die Funktion `add_settings_history()` auf, um den (neuen) Wert von `NEW.value` in `settings_history` einzufügen. *(Anmerkung: Die Migrations `purple_lantern` und `lingering_darkness` hatten `OLD.value` verwendet, `twilight_leaf` und `green_scene` verwenden `NEW.value`. Konsistenz prüfen und `NEW.value` für eine Kopie des aktuellen Stands nach Änderung verwenden, oder `OLD.value` für den Stand vor der Änderung. Für eine echte Historie ist `OLD.value` bei `UPDATE` und `NEW.value` bei `INSERT` sinnvoller. Die aktuelle Implementierung in `green_scene` und `twilight_leaf` mit `NEW.value` für `INSERT OR UPDATE` speichert effektiv den *neuen* Wert als "historisch", was eher ein Audit Log des neuen Zustands ist.)*

## Storage

* **Bucket Name:** `content`
* **Öffentlicher Zugriff:** Ja, der Bucket ist als öffentlich konfiguriert.
* **Policies:**
    * **SELECT (`content` bucket):** Öffentlich für `anon` und `authenticated` Benutzer.
    * **INSERT (`content` bucket):** Nur für `authenticated` Benutzer.
    * **UPDATE (`content` bucket):** Nicht explizit definiert, typischerweise werden Dateien neu hochgeladen und alte gelöscht statt direkt geupdated.
    * **DELETE (`content` bucket):** Nur für `authenticated` Benutzer.

## Wichtige Funktionen und Logiken

* **Bild-Upload:** Erfolgt über `UploadForm.tsx`. Die Datei wird in den `content`-Bucket hochgeladen, die resultierende öffentliche URL und der `storage_path` werden in `content_items` gespeichert.
* **iFrame-Handling:** `UploadForm.tsx` extrahiert die `src`-URL aus dem eingefügten iFrame-Code oder validiert eine direkte Databox-URL. Nur die `src`-URL wird in `content_items.url` gespeichert.
* **Sortierung:** Die `sort_order` Spalte in `content_items` wird durch Drag & Drop im Frontend (`ContentList.tsx`) aktualisiert und in der Datenbank persistiert (`AdminPage.tsx`).
* **Slideshow-Logik:** `useSlideshowData.ts` ist der zentrale Hook für das Abrufen von `content_items` und `settings` für die Präsentationsansicht. Er implementiert auch Realtime-Subscriptions für Änderungen.

## Zukünftige Überlegungen / Verbesserungen

* **ENUM Typen:** Konsequente Nutzung von PostgreSQL ENUMs für Felder wie `content_items.type` und das neue `content_items.category`.
* **JSON Validierung:** Für die `settings.value` Spalte (insbesondere das komplexe `slideshow_settings` JSON) könnte eine JSON Schema Validierung auf Datenbankebene (mittels `CHECK` Constraints und JSON Funktionen) oder zumindest serverseitig in Betracht gezogen werden, um die Datenintegrität zu erhöhen.
* **RLS für Tags/Kategorien:** Die RLS-Policies müssen ggf. angepasst werden, wenn Filterung nach Tags/Kategorien implementiert wird, um sicherzustellen, dass nur autorisierte Daten gelesen/geschrieben werden können.
* **Trigger für `settings_history`:** Die Logik des Triggers (ob `OLD.value` oder `NEW.value` gespeichert wird) sollte basierend auf dem gewünschten Verhalten (echte Historie vs. Audit Log des neuen Zustands) vereinheitlicht werden.
