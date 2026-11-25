-- CAT-01 (launch blocker): catalog fields the app uses but 0001_init.sql never stored. See docs/review/08_STORE_AUDIT.md.
--   level    -> Essential / Standard / Premium within a gear slot (item_group). Without it every slot loads as one
--               undifferentiated level, so budget defaults, à la carte switching and Compare options break.
--   excludes -> item ids a choice replaces (e.g. a standby generator replaces gas cans).
-- Safe to run on a live table: new nullable / defaulted columns, no rewrite of existing data.
alter table gear_catalog add column if not exists level text;
alter table gear_catalog drop constraint if exists gear_catalog_level_check;
alter table gear_catalog add constraint gear_catalog_level_check check (level is null or level in ('essential', 'standard', 'premium'));
alter table gear_catalog add column if not exists excludes text[] not null default '{}';

-- Backfill from lib/catalog/seed.ts for rows seeded before this migration. Only rows still missing both values are
-- touched, so admin edits made after this migration are never overwritten. tests/store.migrations.test.ts checks
-- these lines against the seed.
update gear_catalog set level = 'standard' where id = 'water-jug' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'water-gallons' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'filter-basic' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'filter-gravity' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'generator-dual' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'generator-small' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'power-station' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'water-bricks' and level is null and excludes = '{}';
update gear_catalog set level = 'premium', excludes = array['gas-cans', 'gen-cord', 'propane-20', 'inlet-interlock']::text[] where id = 'generator-standby' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'power-station-small' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'power-station-large' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'power-station-house-large' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'filter-gravity-bag' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'frs-radios' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'sat-messenger' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'go-bag-basic' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'go-bag-kit' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'tarp-shelter' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'canvas-tent' and level is null and excludes = '{}';
update gear_catalog set level = 'essential' where id = 'vehicle-kit-basic' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'vehicle-kit-premium' and level is null and excludes = '{}';
update gear_catalog set level = 'premium' where id = 'food-freeze-dried' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'power-station-house' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'gmrs' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'go-bag' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'vehicle-kit' and level is null and excludes = '{}';
update gear_catalog set level = 'standard' where id = 'tent' and level is null and excludes = '{}';
