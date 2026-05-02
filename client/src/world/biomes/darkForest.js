/**
 * Dark Forest biome configuration.
 * All visual parameters for the first zone are defined here.
 * Future biomes (Frozen Tundra, Volcanic Wasteland, etc.) follow this structure.
 */
export const darkForest = {
    id: 'dark_forest',
    name: 'Dark Forest',

    terrain: {
        baseColor: '#2a1f14',
        noiseColors: [
            { r: 26, g: 21, b: 8 },    // dark dirt
            { r: 45, g: 58, b: 26 },   // dead olive-green
            { r: 58, g: 42, b: 26 },   // dry mud
            { r: 26, g: 42, b: 21 },   // withered moss
            { r: 35, g: 25, b: 15 },   // dark brown
            { r: 20, g: 15, b: 10 },   // near-black soil
        ],
        patchColor: 'rgba(10, 5, 0, 0.25)',
        crackColor: 'rgba(5, 3, 0, 0.3)',
        roughness: 0.95,
        size: 512,
    },

    sky: {
        gradientStops: [
            { stop: 0, color: '#0a0a15' },
            { stop: 0.3, color: '#1a1a2e' },
            { stop: 0.6, color: '#2d1f3d' },
            { stop: 0.85, color: '#3d2a20' },
            { stop: 1.0, color: '#1a1a1a' },
        ],
        fogColor: 0x0a0a0f,
        fogDensity: 0.008,
        moon: {
            color: 0xddeeff,
            position: [120, 280, -80],
            coronaColor: 0x8899bb,
            coronaOpacity: 0.12,
        },
    },

    lighting: {
        ambient: { color: 0x151520, intensity: 0.4 },
        hemisphere: { skyColor: 0x1a1a2e, groundColor: 0x1a0f0a, intensity: 0.3 },
        directional: { color: 0x8899aa, intensity: 0.5, position: [40, 80, 30] },
        playerTorch: { color: 0x443322, intensity: 0.3, distance: 12 },
        toneMappingExposure: 0.7,
    },

    trees: {
        count: 250,
        exclusionRadius: 15,
        // Mix weights defined in ProceduralTrees.js
    },

    particles: {
        fireflies: { count: 70, color: 0x88ff44 },
        fogWisps: { count: 35, color: 0x222233 },
        dustEmbers: { count: 45, color: 0x885533 },
        fallingLeaves: { count: 25, color: 0x664422 },
    },
};
