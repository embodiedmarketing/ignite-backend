CREATE TABLE IF NOT EXISTS bonus_training_categories (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bonus_training_series (
  id VARCHAR(255) PRIMARY KEY,
  category_id VARCHAR(255) NOT NULL REFERENCES bonus_training_categories(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  theme_color VARCHAR(50) NOT NULL DEFAULT 'purple'
    CHECK (theme_color IN ('purple', 'blue', 'green', 'orange')),
  "order" INTEGER NOT NULL DEFAULT 0,
  step_number_base INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bonus_training_videos (
  id VARCHAR(255) PRIMARY KEY,
  series_id VARCHAR(255) NOT NULL REFERENCES bonus_training_series(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  vimeo_id VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  step_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bonus_training_categories_order ON bonus_training_categories("order");
CREATE INDEX IF NOT EXISTS idx_bonus_training_series_category ON bonus_training_series(category_id);
CREATE INDEX IF NOT EXISTS idx_bonus_training_series_order ON bonus_training_series("order");
CREATE INDEX IF NOT EXISTS idx_bonus_training_videos_series ON bonus_training_videos(series_id);
CREATE INDEX IF NOT EXISTS idx_bonus_training_videos_order ON bonus_training_videos("order");
