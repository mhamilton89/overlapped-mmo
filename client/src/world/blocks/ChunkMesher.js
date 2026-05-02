/**
 * ChunkMesher — AO-aware greedy meshing for a 16³ chunk.
 *
 * Per-vertex ambient occlusion gives natural shadowing at corners/edges.
 * Color noise breaks up flat surfaces. AO-aware greedy merge only combines
 * faces with identical AO patterns, preserving visual detail.
 *
 * Works on main thread and inside a Web Worker.
 */

const SIZE = 16;

// Block def offsets (10 bytes per block)
const BD_R = 1, BD_G = 2, BD_B = 3, BD_TRANSPARENT = 4;

// AO brightness multipliers [occluded → open]
// Used with MeshBasicMaterial (unlit) — bakes shading directly into vertex colors.
const AO_CURVE = [0.75, 0.85, 0.93, 1.0];

// Per-face direction shading — matches classic Minecraft convention:
// top brightest, bottom darkest, sides medium. Baked into vertex colors.
// Order: -X, +X, -Y, +Y, -Z, +Z
const FACE_SHADE = [0.80, 0.80, 0.55, 1.0, 0.90, 0.90];

function idx(x, y, z) {
    return (y * SIZE + z) * SIZE + x;
}

function getBlock(neighbors, blocks, x, y, z) {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE && z >= 0 && z < SIZE) {
        return blocks[idx(x, y, z)];
    }
    let ni = -1, nx = x, ny = y, nz = z;
    if (x < 0)       { ni = 0; nx = x + SIZE; }
    else if (x >= SIZE) { ni = 1; nx = x - SIZE; }
    if (y < 0)       { ni = 2; ny = y + SIZE; }
    else if (y >= SIZE) { ni = 3; ny = y - SIZE; }
    if (z < 0)       { ni = 4; nz = z + SIZE; }
    else if (z >= SIZE) { ni = 5; nz = z - SIZE; }
    if (ni >= 0 && neighbors[ni]) {
        return neighbors[ni][idx(nx, ny, nz)];
    }
    return 0;
}

function isOpaque(neighbors, blocks, blockDefs, x, y, z) {
    const id = getBlock(neighbors, blocks, x, y, z);
    return id !== 0 && blockDefs[id * 10 + BD_TRANSPARENT] === 0;
}

function isTransparent(blockId, blockDefs) {
    return blockDefs[blockId * 10 + BD_TRANSPARENT] === 1;
}

function getColor(blockId, blockDefs) {
    const off = blockId * 10;
    return [blockDefs[off + BD_R], blockDefs[off + BD_G], blockDefs[off + BD_B]];
}

/**
 * Compute AO value for one vertex of a face.
 * side1, side2 = edge neighbors; corner = diagonal neighbor.
 * Returns 0 (fully occluded) to 3 (fully open).
 */
function vertexAO(s1, s2, c) {
    if (s1 && s2) return 0;
    return 3 - (s1 + s2 + c);
}

/**
 * Simple position-based hash for subtle color noise.
 * Returns a value in [-1, 1].
 */
function colorNoise(x, y, z) {
    let n = x * 73856093 ^ y * 19349669 ^ z * 83492791;
    n = ((n >> 13) ^ n) * 0x45d9f3b;
    n = (n >> 16) ^ n;
    return ((n & 0xff) / 255.0) * 2.0 - 1.0;
}

/**
 * Compute 4 AO values for a face on block at (bx,by,bz).
 * Face defined by axis (0=X,1=Y,2=Z), sign (+1/-1), uAxis, vAxis.
 * Returns [ao00, ao10, ao01, ao11] each 0-3.
 */
function computeFaceAO(neighbors, blocks, blockDefs, bx, by, bz, axis, sign, uAxis, vAxis) {
    // The "air" position on the other side of the face
    const n = [bx, by, bz];
    n[axis] += sign;

    const result = [];

    for (let cv = 0; cv < 2; cv++) {
        for (let cu = 0; cu < 2; cu++) {
            const du = 2 * cu - 1; // -1 or +1
            const dv = 2 * cv - 1;

            // Side and corner neighbor positions
            const s1 = [n[0], n[1], n[2]];
            s1[uAxis] += du;

            const s2 = [n[0], n[1], n[2]];
            s2[vAxis] += dv;

            const co = [n[0], n[1], n[2]];
            co[uAxis] += du;
            co[vAxis] += dv;

            const s1Opaque = isOpaque(neighbors, blocks, blockDefs, s1[0], s1[1], s1[2]) ? 1 : 0;
            const s2Opaque = isOpaque(neighbors, blocks, blockDefs, s2[0], s2[1], s2[2]) ? 1 : 0;
            const coOpaque = isOpaque(neighbors, blocks, blockDefs, co[0], co[1], co[2]) ? 1 : 0;

            result.push(vertexAO(s1Opaque, s2Opaque, coOpaque));
        }
    }

    return result; // [ao00, ao10, ao01, ao11]
}

/**
 * Greedy mesh one chunk with ambient occlusion.
 */
export function greedyMesh(blocks, neighbors, blockDefs) {
    const opaqueP = [], opaqueN = [], opaqueC = [], opaqueI = [];
    let oVerts = 0;

    const transP = [], transN = [], transC = [], transI = [];
    let tVerts = 0;

    // u/v axes chosen so cross(uAxis, vAxis) = +axis direction.
    // This keeps triangle winding consistent across all 6 faces — the sign-based
    // flip below then produces correct CCW winding for the outward normal.
    const faces = [
        { axis: 0, sign: -1, normal: [-1, 0, 0], u: 1, v: 2 }, // -X: u=Y, v=Z
        { axis: 0, sign: 1,  normal: [1, 0, 0],  u: 1, v: 2 }, // +X: u=Y, v=Z
        { axis: 1, sign: -1, normal: [0, -1, 0], u: 2, v: 0 }, // -Y: u=Z, v=X
        { axis: 1, sign: 1,  normal: [0, 1, 0],  u: 2, v: 0 }, // +Y: u=Z, v=X
        { axis: 2, sign: -1, normal: [0, 0, -1], u: 0, v: 1 }, // -Z: u=X, v=Y
        { axis: 2, sign: 1,  normal: [0, 0, 1],  u: 0, v: 1 }, // +Z: u=X, v=Y
    ];

    for (let fi = 0; fi < faces.length; fi++) {
        const { axis, sign, normal, u: uAxis, v: vAxis } = faces[fi];
        const shade = FACE_SHADE[fi];

        for (let d = 0; d < SIZE; d++) {
            // Mask: encode blockId + AO pattern as a single key
            // key = blockId | (ao00<<8) | (ao10<<10) | (ao01<<12) | (ao11<<14)
            // -1 = no face
            const mask = new Int32Array(SIZE * SIZE);
            mask.fill(-1);

            // Also store raw AO per face for vertex color computation
            const aoData = new Uint8Array(SIZE * SIZE * 4); // 4 AO values per face

            for (let v = 0; v < SIZE; v++) {
                for (let u = 0; u < SIZE; u++) {
                    const pos = [0, 0, 0];
                    pos[axis] = d;
                    pos[uAxis] = u;
                    pos[vAxis] = v;

                    const blockId = blocks[idx(pos[0], pos[1], pos[2])];
                    if (blockId === 0) continue;

                    const nPos = [pos[0], pos[1], pos[2]];
                    nPos[axis] += sign;
                    const neighborId = getBlock(neighbors, blocks, nPos[0], nPos[1], nPos[2]);

                    const blockIsTrans = isTransparent(blockId, blockDefs);
                    const neighborIsTrans = isTransparent(neighborId, blockDefs);

                    if (neighborIsTrans && (blockId !== neighborId || !blockIsTrans)) {
                        // Compute AO for this face
                        const ao = computeFaceAO(
                            neighbors, blocks, blockDefs,
                            pos[0], pos[1], pos[2],
                            axis, sign, uAxis, vAxis
                        );

                        const mi = v * SIZE + u;
                        aoData[mi * 4] = ao[0];
                        aoData[mi * 4 + 1] = ao[1];
                        aoData[mi * 4 + 2] = ao[2];
                        aoData[mi * 4 + 3] = ao[3];

                        // Encode key: blockId + AO pattern
                        mask[mi] = blockId
                            | (ao[0] << 8)
                            | (ao[1] << 10)
                            | (ao[2] << 12)
                            | (ao[3] << 14);
                    }
                }
            }

            // Greedy merge — only merges faces with identical key (blockId + AO)
            for (let v = 0; v < SIZE; v++) {
                for (let u = 0; u < SIZE; ) {
                    const key = mask[v * SIZE + u];
                    if (key === -1) { u++; continue; }

                    const blockId = key & 0xff;

                    // Expand width
                    let w = 1;
                    while (u + w < SIZE && mask[v * SIZE + u + w] === key) w++;

                    // Expand height
                    let h = 1;
                    let done = false;
                    while (v + h < SIZE && !done) {
                        for (let k = 0; k < w; k++) {
                            if (mask[(v + h) * SIZE + u + k] !== key) { done = true; break; }
                        }
                        if (!done) h++;
                    }

                    // Clear merged area
                    for (let dv = 0; dv < h; dv++) {
                        for (let du = 0; du < w; du++) {
                            mask[(v + dv) * SIZE + u + du] = -1;
                        }
                    }

                    // Get AO from first face in merged region (all identical)
                    const mi0 = v * SIZE + u;
                    const ao = [
                        aoData[mi0 * 4],
                        aoData[mi0 * 4 + 1],
                        aoData[mi0 * 4 + 2],
                        aoData[mi0 * 4 + 3],
                    ];

                    const blockTrans = isTransparent(blockId, blockDefs);
                    const baseColor = getColor(blockId, blockDefs);

                    // Grass block: top face gets green tint
                    let faceColor = baseColor;
                    if (blockId === 3 && axis === 1 && sign === 1) {
                        faceColor = [82, 168, 46];
                    }

                    // Build 4 corner vertices
                    const targetP = blockTrans ? transP : opaqueP;
                    const targetN = blockTrans ? transN : opaqueN;
                    const targetC = blockTrans ? transC : opaqueC;
                    const targetI = blockTrans ? transI : opaqueI;
                    const vertBase = blockTrans ? tVerts : oVerts;

                    // Corners: (cu=0,cv=0), (cu=1,cv=0), (cu=0,cv=1), (cu=1,cv=1)
                    for (let cv = 0; cv < 2; cv++) {
                        for (let cu = 0; cu < 2; cu++) {
                            const pos = [0, 0, 0];
                            pos[axis] = d + (sign > 0 ? 1 : 0);
                            pos[uAxis] = u + cu * w;
                            pos[vAxis] = v + cv * h;

                            targetP.push(pos[0], pos[1], pos[2]);
                            targetN.push(normal[0], normal[1], normal[2]);

                            // AO for this corner
                            const aoIdx = cv * 2 + cu;
                            const aoMul = AO_CURVE[ao[aoIdx]];

                            // Subtle color noise based on world-space block position
                            const wx = pos[0];
                            const wy = pos[1];
                            const wz = pos[2];
                            const noise = colorNoise(wx, wy, wz) * 0.04;

                            const mul = shade * aoMul;
                            const r = Math.max(0, Math.min(1, (faceColor[0] / 255) * mul + noise));
                            const g = Math.max(0, Math.min(1, (faceColor[1] / 255) * mul + noise));
                            const b = Math.max(0, Math.min(1, (faceColor[2] / 255) * mul + noise));

                            targetC.push(r, g, b);
                        }
                    }

                    // Triangulation — flip based on AO to fix anisotropy artifact
                    const shouldFlip = (ao[0] + ao[3]) < (ao[1] + ao[2]);

                    if (sign > 0) {
                        if (!shouldFlip) {
                            targetI.push(vertBase, vertBase + 1, vertBase + 3);
                            targetI.push(vertBase, vertBase + 3, vertBase + 2);
                        } else {
                            targetI.push(vertBase, vertBase + 1, vertBase + 2);
                            targetI.push(vertBase + 1, vertBase + 3, vertBase + 2);
                        }
                    } else {
                        if (!shouldFlip) {
                            targetI.push(vertBase, vertBase + 3, vertBase + 1);
                            targetI.push(vertBase, vertBase + 2, vertBase + 3);
                        } else {
                            targetI.push(vertBase, vertBase + 2, vertBase + 1);
                            targetI.push(vertBase + 1, vertBase + 2, vertBase + 3);
                        }
                    }

                    if (blockTrans) tVerts += 4;
                    else oVerts += 4;

                    u += w;
                }
            }
        }
    }

    return {
        positions: new Float32Array(opaqueP),
        normals: new Float32Array(opaqueN),
        colors: new Float32Array(opaqueC),
        indices: new Uint32Array(opaqueI),
        tPositions: new Float32Array(transP),
        tNormals: new Float32Array(transN),
        tColors: new Float32Array(transC),
        tIndices: new Uint32Array(transI),
    };
}
