-- Overlapped 3D MMO - Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(72) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name          VARCHAR(24) UNIQUE NOT NULL,
    class         VARCHAR(16) NOT NULL CHECK (class IN ('Warrior','Wizard','Paladin','Ranger')),
    level         INT NOT NULL DEFAULT 1,
    xp            INT NOT NULL DEFAULT 0,
    current_hp    INT NOT NULL,
    current_mana  INT NOT NULL,
    pos_x         FLOAT NOT NULL DEFAULT 0,
    pos_y         FLOAT NOT NULL DEFAULT 0,
    rotation      FLOAT NOT NULL DEFAULT 0,
    gold          INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_characters_account ON characters(account_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

-- Inventory (stackable items)
CREATE TABLE IF NOT EXISTS inventory (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_key      VARCHAR(64) NOT NULL,
    quantity      INT NOT NULL DEFAULT 1,
    UNIQUE(character_id, item_key)
);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory(character_id);

-- Equipment (currently equipped items)
CREATE TABLE IF NOT EXISTS equipment (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot          VARCHAR(16) NOT NULL CHECK (slot IN (
        'head','chest','legs','feet','hands',
        'main_hand','off_hand','ring','amulet'
    )),
    item_key      VARCHAR(64) NOT NULL,
    UNIQUE(character_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_equipment_character ON equipment(character_id);
