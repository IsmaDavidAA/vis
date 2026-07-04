-- Métricas personalizadas generadas por IA (DeepSeek)
-- Ejecutar en SQL Editor después de setup.sql

ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS custom_title TEXT;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS custom_icon TEXT DEFAULT '✨';
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS custom_description TEXT DEFAULT '';
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS custom_type TEXT DEFAULT 'boolean';
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS custom_unit TEXT;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS goal_category TEXT;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS difficulty TEXT;
