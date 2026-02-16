export class WebSocketClient {
    constructor() {
        this.ws = null;
        this.handlers = new Map();
        this.connected = false;
        this.token = null;
        this.moveThrottleMs = 100;
        this.lastMoveSent = 0;
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            this.token = token;
            let settled = false;

            const wsUrl = `ws://localhost:3001?token=${encodeURIComponent(token)}`;
            console.log('[WS] Opening connection...');
            this.ws = new WebSocket(wsUrl);

            // Timeout after 3 seconds
            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    reject(new Error('WebSocket connection timeout'));
                    this.ws.close();
                }
            }, 3000);

            this.ws.onopen = () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    this.connected = true;
                    console.log('[WS] Connected');
                    resolve();
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    const handler = this.handlers.get(message.type);
                    if (handler) {
                        handler(message);
                    } else {
                        console.log('[WS] Unhandled message:', message.type, message);
                    }
                } catch (err) {
                    console.error('[WS] Parse error:', err);
                }
            };

            this.ws.onclose = () => {
                this.connected = false;
                console.log('[WS] Disconnected');
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(new Error('WebSocket closed before connecting'));
                }
                const handler = this.handlers.get('_disconnected');
                if (handler) handler();
            };

            this.ws.onerror = (err) => {
                console.error('[WS] Error:', err);
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(new Error('WebSocket connection failed'));
                }
            };
        });
    }

    on(type, handler) {
        this.handlers.set(type, handler);
        return this;
    }

    send(type, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }

    selectCharacter(characterId) {
        this.send('selectCharacter', { characterId });
    }

    sendMove(x, z, rotation) {
        const now = Date.now();
        if (now - this.lastMoveSent < this.moveThrottleMs) return;
        this.lastMoveSent = now;

        // Map 3D coords to 2D: x stays x, z becomes y
        this.send('move', { x, y: z, rotation });
    }

    sendGatherStart(resourceId) {
        this.send('gatherStart', { resourceId });
    }

    sendGatherCancel() {
        this.send('gatherCancel');
    }

    sendAttack(targetId) {
        this.send('attack', { targetId });
    }

    sendChat(message) {
        this.send('chatMessage', { message });
    }

    sendLootPickup(lootId) {
        this.send('lootPickup', { lootId });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
