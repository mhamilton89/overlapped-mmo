-- World block storage (delta-only: only stores blocks that differ from flat-world default)

CREATE TABLE IF NOT EXISTS world_blocks (
    x INT NOT NULL,
    y INT NOT NULL,
    z INT NOT NULL,
    block_id SMALLINT NOT NULL,
    placed_by UUID REFERENCES characters(id) ON DELETE SET NULL,
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (x, y, z)
);

-- Index for chunk-based queries (x>>4, y>>4, z>>4 = chunk coords)
CREATE INDEX IF NOT EXISTS idx_world_blocks_chunk
    ON world_blocks ((x >> 4), (y >> 4), (z >> 4));

-- Add admin column to characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
