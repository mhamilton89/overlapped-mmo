import * as THREE from 'three';

/**
 * Free-fly camera for editor mode.
 * Cursor stays visible; right-drag to rotate. WASD movement, Space/Z (or Q/E) vertical, Shift for speed.
 */
export class FreeFlyCamera {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.enabled = false;

        this.moveSpeed = 30;
        this.fastMultiplier = 3;
        this.sensitivity = 0.004;

        this.yaw = 0;
        this.pitch = 0;

        this.keys = { w: false, a: false, s: false, d: false, up: false, down: false, shift: false };
        this._rotating = false;
        this._lastMouse = { x: 0, y: 0 };

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        this.onExitCallback = null;
    }

    enable(startPosition, startYaw, startPitch) {
        this.enabled = true;
        this.camera.position.copy(startPosition);
        this.yaw = startYaw;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, startPitch));
        this._resetKeys();

        window.addEventListener('mousemove', this._onMouseMove);
        this.domElement.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mouseup', this._onMouseUp);
        this.domElement.addEventListener('contextmenu', this._onContextMenu);
        window.addEventListener('keydown', this._onKeyDown, true);
        window.addEventListener('keyup', this._onKeyUp, true);
    }

    disable() {
        this.enabled = false;
        this._rotating = false;
        this._resetKeys();

        window.removeEventListener('mousemove', this._onMouseMove);
        this.domElement.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.domElement.removeEventListener('contextmenu', this._onContextMenu);
        window.removeEventListener('keydown', this._onKeyDown, true);
        window.removeEventListener('keyup', this._onKeyUp, true);
    }

    _resetKeys() {
        this.keys.w = this.keys.a = this.keys.s = this.keys.d = false;
        this.keys.up = this.keys.down = this.keys.shift = false;
    }

    _onMouseDown(e) {
        if (!this.enabled) return;
        if (e.button === 2) {
            this._rotating = true;
            this._lastMouse.x = e.clientX;
            this._lastMouse.y = e.clientY;
            e.preventDefault();
        }
    }

    _onMouseUp(e) {
        if (e.button === 2) this._rotating = false;
    }

    _onContextMenu(e) {
        if (this.enabled) e.preventDefault();
    }

    _onMouseMove(e) {
        if (!this.enabled || !this._rotating) return;
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;
        this._lastMouse.x = e.clientX;
        this._lastMouse.y = e.clientY;
        this.yaw -= dx * this.sensitivity;
        this.pitch -= dy * this.sensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    }

    _onKeyDown(e) {
        if (!this.enabled) return;
        const handled = this._mapKey(e.code, true);
        if (handled) {
            e.stopPropagation(); // prevent InputManager from seeing WASD
        }
    }

    _onKeyUp(e) {
        if (!this.enabled) return;
        const handled = this._mapKey(e.code, false);
        if (handled) {
            e.stopPropagation();
        }
    }

    _mapKey(code, down) {
        switch (code) {
            case 'KeyW': this.keys.w = down; return true;
            case 'KeyA': this.keys.a = down; return true;
            case 'KeyS': this.keys.s = down; return true;
            case 'KeyD': this.keys.d = down; return true;
            case 'Space': this.keys.up = down; return true;
            case 'KeyZ': this.keys.down = down; return true;
            case 'KeyE': this.keys.up = down; return true;   // legacy alias
            case 'KeyQ': this.keys.down = down; return true; // legacy alias
            case 'ShiftLeft': case 'ShiftRight': this.keys.shift = down; return true;
            default: return false;
        }
    }

    update(deltaTime) {
        if (!this.enabled) return;

        const forward = new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const up = new THREE.Vector3(0, 1, 0);

        const speed = this.moveSpeed * (this.keys.shift ? this.fastMultiplier : 1);
        const vel = new THREE.Vector3();

        if (this.keys.w) vel.add(forward);
        if (this.keys.s) vel.sub(forward);
        if (this.keys.d) vel.add(right);
        if (this.keys.a) vel.sub(right);
        if (this.keys.up) vel.add(up);
        if (this.keys.down) vel.sub(up);

        if (vel.lengthSq() > 0) {
            vel.normalize().multiplyScalar(speed * deltaTime);
            this.camera.position.add(vel);
        }

        // Apply rotation
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    getYaw() { return this.yaw; }
    getPitch() { return this.pitch; }
}
