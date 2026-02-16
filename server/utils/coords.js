// Server uses 2D (x, y). Client Three.js uses (x, y, z).
// Server x = Client x (horizontal)
// Server y = Client z (depth/forward)
// Client y = height (derived from terrain, not stored on server)

function to2D(x3d, z3d) {
    return { x: x3d, y: z3d };
}

function to3D(x2d, y2d) {
    return { x: x2d, y: 0, z: y2d };
}

function distance2D(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

module.exports = { to2D, to3D, distance2D };
