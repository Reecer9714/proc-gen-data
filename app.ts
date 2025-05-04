import { Game } from "./js/Game.js";

// Extend the Window interface to include the 'game' property
declare global {
  interface Window {
    game: Game;
  }
}

(async () => {
  const game = new Game();
  game.initialize();
  window.game = game; // For debugging

  const resetDummyButton = document.getElementById("reset-dummy");
  if (resetDummyButton) {
    resetDummyButton.onclick = async () => {
      await game.resetRound();
      game.render();
    };
  }
  const nextRoundButton = document.getElementById("next-round");
  if (nextRoundButton) {
    nextRoundButton.onclick = () => game.nextRound();
  }

  game.render();
})();
