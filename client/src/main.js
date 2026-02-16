import { Game } from './Game.js';

const game = new Game();

game.init().catch((err) => {
    console.error('Failed to initialize game:', err);
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = `Error: ${err.message}`;
        loadingText.style.color = '#ff5555';
    }
});
