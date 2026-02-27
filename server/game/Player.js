const { getTotalStats, calculateDerivedStats, checkLevelUp } = require('../utils/stats');
const equipmentRegistry = require('../registries/equipmentRegistry');
const config = require('../config');

class Player {
    constructor(ws, characterData, inventory, equipment) {
        this.ws = ws;
        this.socketId = ws._socketId;

        // Identity
        this.accountId = characterData.account_id;
        this.characterId = characterData.id;
        this.name = characterData.name;
        this.class = characterData.class;

        // Progression
        this.level = characterData.level;
        this.xp = characterData.xp;
        this.gold = characterData.gold;

        // Position (2D server coords)
        this.x = characterData.pos_x;
        this.y = characterData.pos_y;
        this.rotation = characterData.rotation;

        // Equipment (slot → itemKey map)
        this.equipment = equipment || {};

        // Calculate stats
        this.recalculateStats();

        // Set current HP/mana from DB (clamped to max)
        this.currentHp = Math.min(characterData.current_hp, this.maxHp);
        this.currentMana = Math.min(characterData.current_mana, this.maxMana);

        // Combat state
        this.powerStacks = 0;
        this.lastAttackTime = 0;
        this.lastCombatTime = 0;
        this.lastPowerDecayCheck = Date.now();

        // Movement validation
        this.lastMoveTime = Date.now();
        this.lastPositionX = this.x;
        this.lastPositionY = this.y;

        // Gathering state
        this.gatherState = null; // { resourceId, startTime, hitsCompleted }

        // Inventory (array of { item_key, quantity })
        this.inventory = inventory || [];

        // Dirty flag for periodic saves
        this.dirty = false;
    }

    recalculateStats() {
        // Sum equipment bonuses from registry
        const equipBonuses = {};
        for (const itemKey of Object.values(this.equipment)) {
            const def = equipmentRegistry[itemKey];
            if (def && def.stats) {
                for (const [stat, val] of Object.entries(def.stats)) {
                    equipBonuses[stat] = (equipBonuses[stat] || 0) + val;
                }
            }
        }

        const totalStats = getTotalStats(this.class, this.level, equipBonuses);
        const derived = calculateDerivedStats(totalStats, this.level);

        this.totalStats = totalStats;
        this.maxHp = derived.maxHp;
        this.maxMana = derived.maxMana;
        this.attack = derived.attack;
        this.magicAttack = derived.magicAttack;
        this.defense = derived.defense;
        this.critChance = derived.critChance;
    }

    awardXp(amount) {
        this.xp += amount;
        const result = checkLevelUp(this.level, this.xp);

        if (result.level > this.level) {
            this.level = result.level;
            this.xp = result.xp;
            this.recalculateStats();
            // Heal to full on level up
            this.currentHp = this.maxHp;
            this.currentMana = this.maxMana;
            this.dirty = true;
            return { leveledUp: true, newLevel: this.level };
        }

        this.dirty = true;
        return { leveledUp: false };
    }

    takeDamage(amount) {
        const mitigated = Math.max(1, amount - Math.floor(this.defense * 0.3));
        this.currentHp = Math.max(0, this.currentHp - mitigated);
        this.lastCombatTime = Date.now();
        this.dirty = true;
        return {
            damage: mitigated,
            died: this.currentHp <= 0
        };
    }

    heal(amount) {
        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
        this.dirty = true;
    }

    useMana(amount) {
        if (this.currentMana < amount) return false;
        this.currentMana -= amount;
        this.dirty = true;
        return true;
    }

    regenMana(amount) {
        if (this.currentMana >= this.maxMana) return false;
        this.currentMana = Math.min(this.maxMana, this.currentMana + amount);
        return true;
    }

    regenHp(amount) {
        if (this.currentHp >= this.maxHp) return false;
        if (this.isInCombat()) return false;
        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
        return true;
    }

    isInCombat() {
        return (Date.now() - this.lastCombatTime) < config.COMBAT_REGEN_DELAY_MS;
    }

    canMeleeAttack() {
        return (Date.now() - this.lastAttackTime) >= config.MELEE_COOLDOWN_MS;
    }

    isAlive() {
        return this.currentHp > 0;
    }

    send(message) {
        if (this.ws.readyState === 1) { // WebSocket.OPEN
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Data sent to other players (public info)
     */
    toPublicData() {
        return {
            id: this.characterId,
            name: this.name,
            class: this.class,
            level: this.level,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            hp: this.currentHp,
            maxHp: this.maxHp,
            equipment: this.equipment,
        };
    }

    /**
     * Full data sent to the owning client
     */
    toSelfData() {
        return {
            id: this.characterId,
            name: this.name,
            class: this.class,
            level: this.level,
            xp: this.xp,
            gold: this.gold,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            hp: this.currentHp,
            maxHp: this.maxHp,
            mana: this.currentMana,
            maxMana: this.maxMana,
            attack: this.attack,
            magicAttack: this.magicAttack,
            defense: this.defense,
            critChance: this.critChance,
            powerStacks: this.powerStacks,
            totalStats: this.totalStats,
        };
    }

    /**
     * State to save to database
     */
    toSaveState() {
        return {
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            hp: this.currentHp,
            mana: this.currentMana,
            xp: this.xp,
            level: this.level,
            gold: this.gold,
        };
    }
}

module.exports = Player;
