import { Fireball } from '../entities/Fireball.js';
import { LightningBolt } from '../entities/LightningBolt.js';

// Spell definitions. Each spell is both the cast-animation config and the
// projectile factory. Keys here drive the action bar slots in Game.js.
export const SPELLS = {
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        icon: '🔥',
        castDuration: 1.0,
        pose: 'two-hand',
        orbColor: 0xff6a1a,
        barColor: '#ff8a2e',
        spawn: (scene, origin, dir) => new Fireball(scene, origin, dir),
    },
    lightning: {
        id: 'lightning',
        name: 'Lightning Bolt',
        icon: '⚡',
        castDuration: 0.6,
        pose: 'one-hand',
        orbColor: 0x88b8ff,
        barColor: '#7ec0ff',
        spawn: (scene, origin, dir) => new LightningBolt(scene, origin, dir),
    },
};

// Ordered slot assignment — index is the hotkey (1..N).
export const ACTION_BAR = [
    SPELLS.fireball,
    SPELLS.lightning,
];
