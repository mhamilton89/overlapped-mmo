export class InputManager {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            interact: false
        };

        this.mouse = {
            x: 0,
            y: 0,
            normalizedX: 0,
            normalizedY: 0,
            rightDown: false,
            leftDown: false
        };

        this.suppressMovement = false; // set by EditorSystem in free-fly mode

        this.setupKeyboardListeners();
        this.setupMouseListeners();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.isInputFocused()) return;
            this.handleKey(e.code, true);
        });

        window.addEventListener('keyup', (e) => {
            this.handleKey(e.code, false);
        });
    }

    setupMouseListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.leftDown = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        // Prevent context menu on right click
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleKey(code, pressed) {
        switch (code) {
            case 'KeyW': if (!this.suppressMovement) this.keys.forward = pressed; break;
            case 'KeyS': if (!this.suppressMovement) this.keys.backward = pressed; break;
            case 'KeyA': if (!this.suppressMovement) this.keys.left = pressed; break;
            case 'KeyD': if (!this.suppressMovement) this.keys.right = pressed; break;
            case 'Space': if (!this.suppressMovement) this.keys.jump = pressed; break;
            case 'KeyE':
            case 'KeyF': if (!this.suppressMovement) this.keys.interact = pressed; break;
        }
    }

    isInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    }

    isMoving() {
        return this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    }
}
