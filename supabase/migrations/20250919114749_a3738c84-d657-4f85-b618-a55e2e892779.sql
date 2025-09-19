-- Activate existing subjects and exams so students can see them
UPDATE subjects SET is_active = true WHERE is_active = false;
UPDATE exams SET is_active = true WHERE is_active = false;