// Game variables
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let playerWins = 0;
let aiWins = 0;
let difficulty = 'medium';
let aiTimer = null;
let gameMode = 'ai';
let onlineRoomCode = '';
let onlinePlayerId = '';
let onlineMark = '';
let onlineRevision = 0;
let onlinePolling = false;

const aiNames = ['David', 'Alex', 'Mason', 'Ryan', 'Ethan', 'Noah', 'Lucas', 'Daniel', 'James', 'Leo'];
let currentAI = 'David';
let boardCells = [];

const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function cacheBoardCells() {
  if (!boardCells.length) {
    boardCells = Array.from(document.querySelectorAll('.cell'));
  }
  return boardCells;
}

let gameInitialized = false;

function bootstrapGame() {
  if (gameInitialized) return;
  gameInitialized = true;

  gameMode = localStorage.getItem('gameMode') || 'ai';
  setDifficulty(localStorage.getItem('selectedDifficulty') || 'medium');

  if (document.querySelector('.board')) {
    initializeGame();
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', bootstrapGame);

function initializeGame() {
  gameMode = localStorage.getItem('gameMode') || 'ai';

  // Load stats and settings
  playerWins = parseInt(localStorage.getItem('wins') || '0');
  aiWins = parseInt(localStorage.getItem('losses') || '0');
  difficulty = localStorage.getItem('selectedDifficulty') || 'medium';
  currentAI = localStorage.getItem('currentAI') || 'David';

  // Update UI
  document.getElementById('playerScore').textContent = playerWins;
  document.getElementById('aiScore').textContent = aiWins;

  const difficultySelect = document.getElementById('matchDifficulty');
  if (gameMode === 'offline') {
    currentAI = 'Player 2';
    document.getElementById('aiLabel').textContent = 'Player 2';
    document.getElementById('matchOpponent').textContent = 'Player 2';
    document.getElementById('matchStatus').textContent = 'Local offline duel • two players on one device';
    if (difficultySelect) {
      difficultySelect.disabled = true;
      difficultySelect.style.opacity = '0.5';
      difficultySelect.title = 'Offline mode uses local play';
    }
  } else if (gameMode === 'online') {
    currentAI = 'Waiting for player';
    document.getElementById('aiLabel').textContent = 'Opponent';
    document.getElementById('matchOpponent').textContent = currentAI;
    document.getElementById('matchStatus').textContent = 'Connecting to the live room...';
    if (difficultySelect) difficultySelect.closest('.difficulty-inline').hidden = true;
    onlineRoomCode = sessionStorage.getItem('onlineRoomCode') || '';
    onlinePlayerId = sessionStorage.getItem('onlinePlayerId') || '';
    if (onlineRoomCode) {
      document.getElementById('onlineRoomInvite').hidden = false;
      document.getElementById('onlineRoomCode').textContent = onlineRoomCode;
      document.getElementById('copyRoomCodeButton').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(onlineRoomCode);
          document.getElementById('copyRoomCodeButton').textContent = 'Copied';
        } catch {
          document.getElementById('matchStatus').textContent = `Share room code ${onlineRoomCode} with your friend.`;
        }
      });
    }
  } else {
    document.getElementById('aiLabel').textContent = currentAI;
    document.getElementById('matchOpponent').textContent = currentAI;
    document.getElementById('matchStatus').textContent = 'AI challenge selected';
    if (difficultySelect) {
      difficultySelect.value = difficulty;
      difficultySelect.disabled = false;
      difficultySelect.style.opacity = '1';
      difficultySelect.addEventListener('change', (e) => {
        difficulty = e.target.value;
        localStorage.setItem('selectedDifficulty', difficulty);
        updateAiName();
        resetBoard();
      });
    }
  }

  // Setup cells
  const cells = cacheBoardCells();
  cells.forEach(cell => {
    cell.removeEventListener('click', handleCellClick);
    cell.addEventListener('click', handleCellClick);
  });

  updateStatus();
  if (gameMode === 'online') startOnlineRoomPolling();
}

function updateAiName() {
  const randomName = aiNames[Math.floor(Math.random() * aiNames.length)];
  currentAI = randomName;
  localStorage.setItem('currentAI', randomName);
  document.getElementById('aiLabel').textContent = currentAI;
  document.getElementById('matchOpponent').textContent = currentAI;
}

function handleCellClick(e) {
  const indexValue = e.target.getAttribute('data-index');
  const index = Number(indexValue);

  if (Number.isNaN(index) || board[index] !== '' || !gameActive) return;

  if (gameMode === 'online') {
    requestOnlineMove(index);
    return;
  }

  if (gameMode === 'offline') {
    board[index] = currentPlayer;
    renderBoard();

    if (checkWinner(currentPlayer)) {
      handleWin(currentPlayer);
      return;
    }

    if (isBoardFull()) {
      handleDraw();
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
    return;
  }

  if (currentPlayer === 'X') {
    board[index] = 'X';
    renderBoard();

    if (checkWinner('X')) {
      handleWin('X');
    } else if (isBoardFull()) {
      handleDraw();
    } else {
      currentPlayer = 'O';
      updateStatus();
      aiTurn();
    }
  }
}

async function requestOnlineMove(index) {
  if (!onlineMark || currentPlayer !== onlineMark) return;

  try {
    const response = await fetch(`/api/rooms/${onlineRoomCode}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: onlinePlayerId, index })
    });
    if (!response.ok) {
      const result = await response.json();
      document.getElementById('gameStatus').textContent = result.error || 'Move not accepted.';
    }
  } catch {
    document.getElementById('gameStatus').textContent = 'Lost connection to the room server.';
  }
}

async function startOnlineRoomPolling() {
  if (!onlineRoomCode || !onlinePlayerId) {
    document.getElementById('gameStatus').textContent = 'This match has no room details. Return to the Arena and create or join a room.';
    return;
  }

  onlinePolling = true;
  while (onlinePolling) {
    try {
      const query = new URLSearchParams({ player_id: onlinePlayerId });
      const response = await fetch(`/api/rooms/${onlineRoomCode}/events?${query}`);
      const state = await response.json();
      if (!response.ok) throw new Error(state.error || 'Room connection failed.');

      if (state.revision !== onlineRevision) {
        onlineRevision = state.revision;
        applyOnlineRoomState(state);
      }
      if (state.status === 'closed') onlinePolling = false;
      if (onlinePolling) await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      document.getElementById('gameStatus').textContent = error.message || 'Reconnecting to the room...';
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}

function applyOnlineRoomState(state) {
  onlineMark = state.yourMark;
  board = state.board;
  currentPlayer = state.currentPlayer;
  gameActive = state.status === 'playing';
  currentAI = state.opponentName || 'Waiting for player';

  document.getElementById('aiLabel').textContent = currentAI;
  document.getElementById('matchOpponent').textContent = currentAI;
  document.querySelector('.score-section .score-label').textContent = `You (${onlineMark})`;
  renderBoard();

  if (state.status === 'waiting') {
    document.getElementById('gameStatus').textContent = `Waiting for an opponent. Share room code ${onlineRoomCode}.`;
  } else if (state.status === 'closed') {
    announceWinner('Room closed', 'The other player left the match.');
  } else if (state.status === 'finished') {
    recordOnlineResult(state);
    if (state.winner === 'draw') {
      announceWinner('Draw', 'The match ended in a draw.');
    } else {
      const winnerName = state.winner === onlineMark ? 'You win!' : `${currentAI} wins.`;
      announceWinner(state.winner === onlineMark ? 'Winner' : 'Defeat', winnerName);
    }
  } else {
    updateStatus();
  }
}

function recordOnlineResult(state) {
  const resultKey = `onlineResult:${onlineRoomCode}:${state.round}`;
  if (localStorage.getItem(resultKey)) return;
  localStorage.setItem(resultKey, 'saved');

  let result;
  if (state.winner === 'draw') {
    const draws = parseInt(localStorage.getItem('draws') || '0', 10) + 1;
    localStorage.setItem('draws', draws);
    result = 'Draw';
  } else if (state.winner === onlineMark) {
    playerWins++;
    localStorage.setItem('wins', playerWins);
    const points = parseInt(localStorage.getItem('points') || '0', 10) + 1;
    localStorage.setItem('points', points);
    result = 'Win';
  } else {
    aiWins++;
    localStorage.setItem('losses', aiWins);
    result = 'Loss';
  }

  document.getElementById('playerScore').textContent = playerWins;
  document.getElementById('aiScore').textContent = aiWins;
  const matchHistory = JSON.parse(localStorage.getItem('matchHistory') || '[]');
  matchHistory.unshift({ opponent: currentAI, result, date: new Date().toLocaleDateString() });
  localStorage.setItem('matchHistory', JSON.stringify(matchHistory.slice(0, 10)));
  if (typeof saveCurrentAccountData === 'function') saveCurrentAccountData();
}

function aiTurn() {
  if (!gameActive) return;

  // Clear any pending AI timer
  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  aiTimer = setTimeout(() => {
    const move = aiChooseMove();
    board[move] = 'O';
    renderBoard();

    if (checkWinner('O')) {
      handleWin('O');
    } else if (isBoardFull()) {
      handleDraw();
    } else {
      currentPlayer = 'X';
      updateStatus();
    }
  }, 500);
}

function aiChooseMove() {
  const emptySquares = [];
  for (let index = 0; index < board.length; index++) {
    if (board[index] === '') emptySquares.push(index);
  }

  const tacticalChance = difficulty === 'hard' ? 0.7 : difficulty === 'medium' ? 0.5 : 0.2;
  if (Math.random() < tacticalChance) {
    const tacticalMove = findBestMove();
    if (tacticalMove !== null) return tacticalMove;
  }

  return emptySquares[Math.floor(Math.random() * emptySquares.length)];
}

function findBestMove() {
  // Check if AI can win
  for (let combo of winningCombinations) {
    const [a, b, c] = combo;
    if (board[a] === 'O' && board[b] === 'O' && board[c] === '') return c;
    if (board[a] === 'O' && board[c] === 'O' && board[b] === '') return b;
    if (board[b] === 'O' && board[c] === 'O' && board[a] === '') return a;
  }

  // Block player from winning
  for (let combo of winningCombinations) {
    const [a, b, c] = combo;
    if (board[a] === 'X' && board[b] === 'X' && board[c] === '') return c;
    if (board[a] === 'X' && board[c] === 'X' && board[b] === '') return b;
    if (board[b] === 'X' && board[c] === 'X' && board[a] === '') return a;
  }

  // Prefer center
  if (board[4] === '') return 4;

  return null;
}

function checkWinner(player) {
  return winningCombinations.some(combo => {
    return combo.every(index => board[index] === player);
  });
}

function isBoardFull() {
  return board.every(cell => cell !== '');
}

function announceWinner(label, detail) {
  const banner = document.getElementById('winnerBanner');
  const status = document.getElementById('gameStatus');

  if (banner) {
    banner.hidden = false;
    banner.textContent = label;
  }

  if (status) {
    status.textContent = detail;
  }
}

function handleWin(player) {
  gameActive = false;

  if (gameMode === 'offline') {
    if (player === 'X') {
      playerWins++;
      localStorage.setItem('wins', playerWins);
      document.getElementById('playerScore').textContent = playerWins;
      announceWinner('Winner', 'Player 1 wins the round!');
    } else {
      aiWins++;
      localStorage.setItem('losses', aiWins);
      document.getElementById('aiScore').textContent = aiWins;
      announceWinner('Winner', 'Player 2 wins the round!');
    }
    return;
  }

  if (player === 'X') {
    playerWins++;
    localStorage.setItem('wins', playerWins);
    document.getElementById('playerScore').textContent = playerWins;
    const points = parseInt(localStorage.getItem('points') || '0') + 1;
    localStorage.setItem('points', points);
    announceWinner('Winner', 'You win! +1 point');
  } else {
    aiWins++;
    localStorage.setItem('losses', aiWins);
    document.getElementById('aiScore').textContent = aiWins;
    const points = parseInt(localStorage.getItem('points') || '0') + 1;
    localStorage.setItem('points', points);
    announceWinner('Winner', `${currentAI} wins! +1 point`);
  }

  // Save match history
  const matchHistory = JSON.parse(localStorage.getItem('matchHistory') || '[]');
  const today = new Date().toLocaleDateString();
  matchHistory.unshift({
    opponent: currentAI,
    result: player === 'X' ? 'Win' : 'Loss',
    date: today
  });
  localStorage.setItem('matchHistory', JSON.stringify(matchHistory.slice(0, 10)));
}

function handleDraw() {
  gameActive = false;
  const draws = parseInt(localStorage.getItem('draws') || '0') + 1;
  localStorage.setItem('draws', draws);
  announceWinner('Draw', 'Match Draw!');
}

function renderBoard() {
  const cells = cacheBoardCells();
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    if (cell.textContent !== board[index]) {
      cell.textContent = board[index];
    }
  }
}

function updateStatus() {
  const status = document.getElementById('gameStatus');
  const banner = document.getElementById('winnerBanner');
  if (banner) {
    banner.hidden = true;
  }

  if (status) {
    if (!gameActive) {
      // Status already updated by win/draw handler
    } else if (gameMode === 'offline') {
      status.textContent = currentPlayer === 'X' ? 'Player 1 turn' : 'Player 2 turn';
    } else if (gameMode === 'online') {
      status.textContent = currentPlayer === onlineMark ? `Your turn (${onlineMark})` : `${currentAI}'s turn`;
    } else if (currentPlayer === 'X') {
      status.textContent = 'Your turn';
    } else {
      status.textContent = `${currentAI} thinking...`;
    }
  }
}

function resetBoard() {
  if (gameMode === 'online') {
    fetch(`/api/rooms/${onlineRoomCode}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: onlinePlayerId })
    }).then(async response => {
      if (!response.ok) {
        const result = await response.json();
        document.getElementById('gameStatus').textContent = result.error || 'Could not start a new round.';
      }
    }).catch(() => {
      document.getElementById('gameStatus').textContent = 'Lost connection to the room server.';
    });
    return;
  }

  // Clear AI timer
  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  const banner = document.getElementById('winnerBanner');
  if (banner) {
    banner.hidden = true;
  }

  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  gameActive = true;
  renderBoard();
  updateStatus();
  document.getElementById('gameStatus').textContent = gameMode === 'offline' ? 'New offline round starting...' : 'New round starting...';
}

function goHome() {
  // Clear AI timer
  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }
  if (gameMode === 'online' && onlineRoomCode && onlinePlayerId) {
    fetch(`/api/rooms/${onlineRoomCode}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: onlinePlayerId }),
      keepalive: true
    });
    sessionStorage.removeItem('onlineRoomCode');
    sessionStorage.removeItem('onlinePlayerId');
    localStorage.setItem('gameMode', 'ai');
  }
  window.location.href = 'index.html';
}

function setDifficulty(level) {
  difficulty = level;
  if (document.getElementById('matchDifficulty')) {
    document.getElementById('matchDifficulty').value = level;
  }
}
