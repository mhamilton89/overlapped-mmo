import * as THREE from 'three';

/**
 * Tapered curved tube — TubeGeometry along a 4-point CatmullRom curve,
 * with cross-section taper baked into the vertices.
 *
 * Default orientation: along +Y. `length` is the total Y span.
 * `bend` displaces the curve's middle in +X (0 = straight along Y).
 * `taper` (0..1) shrinks the cross-section toward the +Y end (0 = uniform, 1 = pointed).
 */
export function createTubeGeometry({
    length = 1.5,
    radius = 0.08,
    bend = 0.2,
    taper = 0.6,
    tubularSegments = 24,
    radialSegments = 8,
} = {}) {
    const half = length / 2;
    const pts = [
        new THREE.Vector3(0, -half, 0),
        new THREE.Vector3(bend * 0.5, -half * 0.33, 0),
        new THREE.Vector3(bend, half * 0.33, 0),
        new THREE.Vector3(bend * 0.6, half, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);

    if (taper > 0) {
        const pos = geo.attributes.position;
        const tubularCount = tubularSegments + 1;
        const radialCount = radialSegments + 1;
        const tmp = new THREE.Vector3();
        for (let i = 0; i < tubularCount; i++) {
            const u = i / tubularSegments;
            const k = 1 - taper * u;
            curve.getPointAt(u, tmp);
            const cx = tmp.x, cy = tmp.y, cz = tmp.z;
            for (let j = 0; j < radialCount; j++) {
                const vIdx = i * radialCount + j;
                const px = pos.getX(vIdx);
                const py = pos.getY(vIdx);
                const pz = pos.getZ(vIdx);
                pos.setXYZ(vIdx,
                    cx + (px - cx) * k,
                    cy + (py - cy) * k,
                    cz + (pz - cz) * k,
                );
            }
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
    }
    return geo;
}
