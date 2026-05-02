/**
 * BiomeManager — applies a biome config to existing systems.
 * For now this is a simple reference holder. Future zones will use this
 * to dynamically swap terrain, sky, fog, lighting, etc.
 */
export class BiomeManager {
    constructor() {
        this.activeBiome = null;
    }

    /**
     * Set the active biome. Systems can query this for config values.
     */
    loadBiome(biomeConfig) {
        this.activeBiome = biomeConfig;
        console.log(`[BiomeManager] Loaded biome: ${biomeConfig.name}`);
    }

    get terrain() {
        return this.activeBiome?.terrain ?? null;
    }

    get sky() {
        return this.activeBiome?.sky ?? null;
    }

    get lighting() {
        return this.activeBiome?.lighting ?? null;
    }

    get particles() {
        return this.activeBiome?.particles ?? null;
    }

    get trees() {
        return this.activeBiome?.trees ?? null;
    }
}
