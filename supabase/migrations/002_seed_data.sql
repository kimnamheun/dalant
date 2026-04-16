-- ============================================================
-- Seed data for Dalant Feast system
-- Run this in the Supabase SQL Editor after the initial schema
-- NOTE: Does NOT touch profiles or auth.users
-- ============================================================

-- Departments
INSERT INTO departments (id, name, sort_order) VALUES
  (uuid_generate_v4(), 'Kindergarten',    1),
  (uuid_generate_v4(), 'Elementary',      2),
  (uuid_generate_v4(), 'Middle School',   3);

-- Classes (reference department rows by name)
INSERT INTO classes (id, department_id, name, sort_order) VALUES
  -- Kindergarten classes
  (uuid_generate_v4(),
   (SELECT id FROM departments WHERE name = 'Kindergarten'),
   'Sarang',  1),
  (uuid_generate_v4(),
   (SELECT id FROM departments WHERE name = 'Kindergarten'),
   'Mideum',  2),

  -- Elementary classes
  (uuid_generate_v4(),
   (SELECT id FROM departments WHERE name = 'Elementary'),
   'Class 1', 1),
  (uuid_generate_v4(),
   (SELECT id FROM departments WHERE name = 'Elementary'),
   'Class 2', 2),

  -- Middle School classes
  (uuid_generate_v4(),
   (SELECT id FROM departments WHERE name = 'Middle School'),
   'Eunhye',  1),
  (uuid_generate_v4(),
   (SELECT id FROM departments WHERE name = 'Middle School'),
   'Somang',  2);

-- Event
INSERT INTO events (id, name, status, start_date, end_date) VALUES
  (uuid_generate_v4(),
   '2026 First-Half Dalant Feast',
   'active',
   '2026-06-01T00:00:00+09:00',
   '2026-06-30T23:59:59+09:00');

-- Event products (reference the single active event)
INSERT INTO event_products (id, event_id, name, category, price, stock, sort_order) VALUES
  -- Supplies
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Pencil Set',     'supply', 5,  20, 1),
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Notebook',       'supply', 3,  30, 2),

  -- Food
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Tteokbokki',     'food',   10, 15, 3),
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Hot Dog',         'food',   8,  20, 4),
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Cotton Candy',    'food',   5,  25, 5),

  -- Toys
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Lego Mini',       'toy',   15, 10, 6),
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Slime',           'toy',    7, 20, 7),

  -- Etc
  (uuid_generate_v4(),
   (SELECT id FROM events WHERE name = '2026 First-Half Dalant Feast'),
   'Sticker Book',    'etc',    4, 30, 8);
