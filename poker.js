const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    toString() {
        return this.value + this.suit;
    }
}

class Deck {
    constructor() {
        this.reset();
    }

    reset() {
        this.cards = [];
        for (let suit of suits) {
            for (let value of values) {
                this.cards.push(new Card(suit, value));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        if (this.cards.length === 0) {
            throw new Error("Deck is empty. Please reset the deck.");
        }
        return this.cards.pop();
    }
}

class Player {
    constructor(name, balance, position) {
        this.name = name;
        this.balance = balance;
        this.hand = [];
        this.bet = 0;
        this.totalBet = 0;
        this.folded = false;
        this.position = position;
        this.allIn = false;
        this.timer = 30;
    }

    receiveCard(card) {
        this.hand.push(card);
    }

    placeBet(amount) {
        if (amount > this.balance) {
            amount = this.balance;
            this.allIn = true;
        }
        this.balance -= amount;
        this.bet += amount;
        this.totalBet += amount;
        return amount;
    }

    fold() {
        this.folded = true;
    }

    resetHand() {
        this.hand = [];
        this.bet = 0;
        this.totalBet = 0;
        this.folded = false;
        this.allIn = false;
        this.timer = 30;
    }
}

class PokerGame {
    constructor(playerCount = 6, initialBalance = 1000) {
        this.deck = new Deck();
        this.players = [
            new Player("You", initialBalance, 0), // Human player
            new Player("Player 2", initialBalance, 1),
            new Player("Player 3", initialBalance, 2),
            new Player("Player 4", initialBalance, 3),
            new Player("Player 5", initialBalance, 4),
            new Player("Player 6", initialBalance, 5)
        ];

        this.aiPlayers = [
            { id: 'player2', skill: SKILL_LEVELS.BEGINNER },
            { id: 'player3', skill: SKILL_LEVELS.INTERMEDIATE },
            { id: 'player4', skill: SKILL_LEVELS.ADVANCED },
            { id: 'player5', skill: SKILL_LEVELS.BEGINNER },
            { id: 'player6', skill: SKILL_LEVELS.INTERMEDIATE }
        ];

        this.communityCards = [];
        this.pot = 0;
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.smallBlindIndex = 1;
        this.bigBlindIndex = 2;
        this.currentBet = 0;
        this.smallBlind = 5;
        this.bigBlind = 10;
        this.minRaise = this.bigBlind;
        this.gamePhase = 'betting'; // betting, preflop, flop, turn, river, showdown
        this.betInputValue = 0;
        this.roundBets = new Array(playerCount).fill(0);
        this.lastRaiseIndex = -1;
        this.actionStartIndex = -1;
        this.initializeChips();
        this.timerInterval = null;
        this.chatWindow = document.getElementById('chat-window');
    }

    initializeChips() {
        this.availableChips = [1, 5, 25, 100, 500, 1000].filter(chip => chip <= this.players[0].balance);
        this.updateChips();
    }

    updateChips() {
        const chipContainer = document.getElementById('chip-container');
        chipContainer.innerHTML = '';
        this.availableChips.forEach(chipValue => {
            const chip = document.createElement('div');
            chip.className = `chip chip-${chipValue}`;
            chip.innerHTML = `<span class="chip-value">$${chipValue}</span>`;
            chip.onclick = () => this.addChipToBet(chipValue);
            chipContainer.appendChild(chip);
        });
    }

    addChipToBet(amount) {
        if (this.gamePhase !== 'betting' || amount > this.players[0].balance) {
            return;
        }
        this.betInputValue += amount;
        this.updateBetDisplay();
    }

    updateBetDisplay() {
        document.getElementById('bet-display').textContent = `Your Bet: $${this.betInputValue}`;
    }

    clearBet() {
        this.betInputValue = 0;
        this.updateBetDisplay();
    }

    placeBet() {
        if (this.betInputValue > 0 && this.betInputValue <= this.players[0].balance) {
            this.currentBet = this.betInputValue;
            this.players[0].placeBet(this.betInputValue);
            this.pot += this.betInputValue;
            this.roundBets[0] = this.betInputValue;
            this.lastRaiseIndex = 0;
            this.showMessage(`You bet $${this.betInputValue}`);
            this.betInputValue = 0;
            this.updateBetDisplay();
            this.nextPlayer();
        } else {
            this.showMessage(`Invalid bet. Please select an amount between $1 and $${this.players[0].balance}.`);
        }
    }

    startHand() {
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.players.forEach(player => player.resetHand());
        this.gamePhase = 'preflop';
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
        this.bigBlindIndex = (this.smallBlindIndex + 1) % this.players.length;
        this.actionStartIndex = (this.bigBlindIndex + 1) % this.players.length;
        
        // Post blinds
        this.pot += this.players[this.smallBlindIndex].placeBet(this.smallBlind);
        this.pot += this.players[this.bigBlindIndex].placeBet(this.bigBlind);
        this.currentBet = this.bigBlind;
        this.roundBets[this.smallBlindIndex] = this.smallBlind;
        this.roundBets[this.bigBlindIndex] = this.bigBlind;
        
        this.dealInitialCards();
        this.currentPlayerIndex = this.actionStartIndex;
        this.updateUI();
        this.startBettingRound();
    }

    dealInitialCards() {
        for (let i = 0; i < 2; i++) {
            for (let player of this.players) {
                player.receiveCard(this.deck.deal());
            }
        }
    }

    startBettingRound() {
        this.updateUI();
        this.nextPlayer();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        const currentPlayer = this.players[this.currentPlayerIndex];
        currentPlayer.timer = 30;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            currentPlayer.timer--;
            this.updateTimerDisplay();
            if (currentPlayer.timer <= 0) {
                clearInterval(this.timerInterval);
                this.autoPlayTurn();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const timerElement = document.querySelector(`#player${this.currentPlayerIndex + 1} .player-timer`);
        if (timerElement) {
            timerElement.textContent = `${this.players[this.currentPlayerIndex].timer}s`;
        }
    }

    autoPlayTurn() {
        if (this.roundBets[this.currentPlayerIndex] >= this.currentBet) {
            this.check();
        } else {
            this.fold();
        }
    }

    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            this.communityCards.push(this.deck.deal());
        }
        this.updateUI();
    }

    check() {
        if (this.roundBets[this.currentPlayerIndex] < this.currentBet) {
            this.showMessage("Cannot check, must call or raise");
            return;
        }
        this.showPlayerAction(this.currentPlayerIndex, 'Check');
        this.nextPlayer();
    }

    call() {
        const player = this.players[this.currentPlayerIndex];
        const callAmount = this.currentBet - this.roundBets[this.currentPlayerIndex];
        if (callAmount > 0) {
            const betAmount = player.placeBet(callAmount);
            this.pot += betAmount;
            this.roundBets[this.currentPlayerIndex] += betAmount;
            this.showPlayerAction(this.currentPlayerIndex, `Call $${betAmount}`);
        } else {
            this.showPlayerAction(this.currentPlayerIndex, 'Check');
        }
        this.nextPlayer();
    }

    raise(amount) {
        const player = this.players[this.currentPlayerIndex];
        const minRaise = Math.max(this.bigBlind, this.currentBet * 2);
        if (amount < minRaise) {
            this.showMessage(`Minimum raise is $${minRaise}`);
            return;
        }
        const raiseAmount = amount - this.roundBets[this.currentPlayerIndex];
        const betAmount = player.placeBet(raiseAmount);
        this.pot += betAmount;
        this.roundBets[this.currentPlayerIndex] += betAmount;
        this.currentBet = this.roundBets[this.currentPlayerIndex];
        this.lastRaiseIndex = this.currentPlayerIndex;
        this.showPlayerAction(this.currentPlayerIndex, `Raise to $${this.currentBet}`);
        this.nextPlayer();
    }

    fold() {
        this.players[this.currentPlayerIndex].fold();
        this.showPlayerAction(this.currentPlayerIndex, 'Fold');
        this.nextPlayer();
    }

    nextPlayer() {
        clearInterval(this.timerInterval);
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].folded || this.players[this.currentPlayerIndex].allIn);

        if (this.currentPlayerIndex === this.lastRaiseIndex || this.allPlayersCalled() || this.onlyOnePlayerLeft()) {
            this.nextPhase();
        } else {
            this.updatePlayerTurn();
            if (this.currentPlayerIndex !== 0) { // AI player's turn
                const aiPlayer = this.aiPlayers.find(player => player.id === `player${this.currentPlayerIndex + 1}`);
                if (aiPlayer) {
                    setTimeout(() => handleAITurn(aiPlayer), 1000); // Added delay for AI to simulate thinking
                }
            } else {
                this.startTimer();
            }
        }
    }

    allPlayersCalled() {
        const activePlayers = this.players.filter(player => !player.folded && !player.allIn);
        return activePlayers.every(player => this.roundBets[player.position] === this.currentBet);
    }

    onlyOnePlayerLeft() {
        return this.players.filter(player => !player.folded).length === 1;
    }

    nextPhase() {
        switch (this.gamePhase) {
            case 'preflop':
                this.gamePhase = 'flop';
                this.dealCommunityCards(3);
                this.startBettingRound();
                break;
            case 'flop':
                this.gamePhase = 'turn';
                this.dealCommunityCards(1);
                this.startBettingRound();
                break;
            case 'turn':
                this.gamePhase = 'river';
                this.dealCommunityCards(1);
                this.startBettingRound();
                break;
            case 'river':
                this.gamePhase = 'showdown';
                this.showdown();
                break;
        }
    }

    showdown() {
        const activePlayers = this.players.filter(player => !player.folded);
        const winner = this.determineWinner(activePlayers);
        this.showMessage(`${winner.name} wins the pot of $${this.pot}`);
        winner.balance += this.pot;
        this.endHand();
    }

    determineWinner(players) {
        let bestHand = null;
        let winner = null;

        players.forEach(player => {
            const handStrength = evaluateHand(player.hand, this.communityCards);
            if (!bestHand || handStrength > bestHand) {
                bestHand = handStrength;
                winner = player;
            }
        });

        return winner;
    }

    endHand() {
        // Reset for next hand
        this.gamePhase = 'betting';
        this.showMessage("Hand over. Place your bets for the next hand.");
        this.updateUI();
    }

    updateUI() {
        document.getElementById('balance').textContent = `Balance: $${this.players[0].balance}`;
        document.getElementById('pot').textContent = `Pot: $${this.pot}`;
        document.getElementById('current-bet').textContent = `Current Bet: $${this.currentBet}`;

        const communityCardsEl = document.getElementById('community-cards');
        communityCardsEl.innerHTML = this.communityCards.map(card => this.createCardElement(card)).join('');

        this.players.forEach((player, index) => {
            const playerEl = document.getElementById(`player${index + 1}`);
            let positionIndicator = '';
            if (index === this.dealerIndex) positionIndicator = ' (D)';
            else if (index === this.smallBlindIndex) positionIndicator = ' (SB)';
            else if (index === this.bigBlindIndex) positionIndicator = ' (BB)';
            
            playerEl.innerHTML = `
                <div class="player-info">
                    <div class="player-name">${player.name}${positionIndicator}</div>
                    <div class="player-balance">$${player.balance}</div>
                    <div class="player-bet">Bet: $${this.roundBets[index]}</div>
                    <div class="player-timer">${player.timer}s</div>
                </div>
                <div class="player-cards">
                    ${player.folded ? 'Folded' : player.hand.map(card => this.createCardElement(card, index !== 0)).join('')}
                </div>
            `;
            playerEl.classList.toggle('active', index === this.currentPlayerIndex);
        });

        document.getElementById('central-pot').textContent = `Pot: $${this.pot}`;

        const actionButtons = ['check', 'call', 'raise', 'fold'];
        actionButtons.forEach(action => {
            const button = document.getElementById(action);
            button.disabled = this.gamePhase === 'betting' || this.gamePhase === 'showdown' || this.currentPlayerIndex !== 0;
        });

        document.getElementById('place-bet').disabled = this.gamePhase !== 'betting';
        document.getElementById('clear-bet').disabled = this.gamePhase !== 'betting';

        this.updateChips();
        this.updateBetDisplay();
        this.updateDealerButton();
    }

    createCardElement(card, faceDown = false) {
        if (faceDown) {
            return '<div class="card card-back"></div>';
        }
        return `
            <div class="card ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}">
                <div class="card-value">${card.value}</div>
                <div class="card-suit">${card.suit}</div>
            </div>
        `;
    }

    showMessage(msg) {
        document.getElementById('message').textContent = msg;
        this.addToChat(msg);
    }

    addToChat(msg) {
        const chatEntry = document.createElement('div');
        chatEntry.textContent = msg;
        this.chatWindow.appendChild(chatEntry);
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    updatePlayerTurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        document.getElementById('turn-indicator').textContent = `${currentPlayer.name}'s turn`;
        this.updateUI();
    }

    showPlayerAction(playerIndex, action) {
        const playerEl = document.getElementById(`player${playerIndex + 1}`);
        const actionEl = document.createElement('div');
        actionEl.className = 'player-action';
        actionEl.textContent = action;
        playerEl.appendChild(actionEl);
        setTimeout(() => actionEl.remove(), 2000);

        this.addToChat(`${this.players[playerIndex].name} ${action}`);
    }

    updateDealerButton() {
        const dealerButton = document.getElementById('dealer-button');
        const dealerPlayer = document.getElementById(`player${this.dealerIndex + 1}`);
        const rect = dealerPlayer.getBoundingClientRect();
        dealerButton.style.left = `${rect.left + rect.width / 2}px`;
        dealerButton.style.top = `${rect.top + rect.height}px`;
    }
}

// AI Logic
const SKILL_LEVELS = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced'
};

const HAND_RANKINGS = {
    HIGH_CARD: 1,
    ONE_PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    ROYAL_FLUSH: 10
};

function evaluateHand(hand, communityCards) {
    const allCards = [...hand, ...communityCards];
    const rankCounts = {};
    const suitCounts = {};
    const rankValues = '23456789TJQKA';

    allCards.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });

    const flush = Object.values(suitCounts).some(count => count >= 5);
    const straight = isStraight(allCards.map(card => card.rank).sort((a, b) => rankValues.indexOf(a) - rankValues.indexOf(b)));
    const straightFlush = flush && straight;

    if (straightFlush && isRoyalFlush(allCards)) return HAND_RANKINGS.ROYAL_FLUSH;
    if (straightFlush) return HAND_RANKINGS.STRAIGHT_FLUSH;
    if (isFourOfAKind(rankCounts)) return HAND_RANKINGS.FOUR_OF_A_KIND;
    if (isFullHouse(rankCounts)) return HAND_RANKINGS.FULL_HOUSE;
    if (flush) return HAND_RANKINGS.FLUSH;
    if (straight) return HAND_RANKINGS.STRAIGHT;
    if (isThreeOfAKind(rankCounts)) return HAND_RANKINGS.THREE_OF_A_KIND;
    if (isTwoPair(rankCounts)) return HAND_RANKINGS.TWO_PAIR;
    if (isOnePair(rankCounts)) return HAND_RANKINGS.ONE_PAIR;

    return HAND_RANKINGS.HIGH_CARD;
}

function isRoyalFlush(cards) {
    const ranks = ['10', 'J', 'Q', 'K', 'A'];
    const suits = [...new Set(cards.map(card => card.suit))];
    if (suits.length > 1) return false;
    return ranks.every(rank => cards.some(card => card.rank === rank));
}

function isStraight(ranks) {
    const rankValues = 'A23456789TJQKA';
    const uniqueRanks = [...new Set(ranks)];
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        const slice = uniqueRanks.slice(i, i + 5);
        if (slice.every((val, index) => rankValues.indexOf(val) === rankValues.indexOf(slice[0]) + index)) {
            return true;
        }
    }
    return false;
}

function isFourOfAKind(rankCounts) {
    return Object.values(rankCounts).some(count => count === 4);
}

function isFullHouse(rankCounts) {
    const values = Object.values(rankCounts);
    return values.includes(3) && values.includes(2);
}

function isFlush(suitCounts) {
    return Object.values(suitCounts).some(count => count >= 5);
}

function isThreeOfAKind(rankCounts) {
    return Object.values(rankCounts).some(count === 3);
}

function isTwoPair(rankCounts) {
    return Object.values(rankCounts).filter(count => count === 2).length === 2;
}

function isOnePair(rankCounts) {
    return Object.values(rankCounts).some(count === 2);
}

function calculatePotOdds(currentBet, potSize) {
    return currentBet / (potSize + currentBet);
}

function makeDecision(player, hand, communityCards, currentBet, potSize) {
    const handStrength = evaluateHand(hand, communityCards);
    const potOdds = calculatePotOdds(currentBet, potSize);
    const skill = player.skill;

    if (skill === SKILL_LEVELS.BEGINNER) {
        return ['fold', 'check', 'call', 'raise'][Math.floor(Math.random() * 4)];
    } else if (skill === SKILL_LEVELS.INTERMEDIATE) {
        if (handStrength >= HAND_RANKINGS.ONE_PAIR) return 'raise';
        else if (handStrength >= HAND_RANKINGS.HIGH_CARD) return 'call';
        else return 'fold';
    } else if (skill === SKILL_LEVELS.ADVANCED) {
        if (handStrength >= HAND_RANKINGS.THREE_OF_A_KIND) return 'raise';
        else if (handStrength >= HAND_RANKINGS.ONE_PAIR && potOdds < 0.5) return 'call';
        else return 'fold';
    }
}

function handleAITurn(player) {
    const playerElement = document.getElementById(player.id);
    const hand = getHand(playerElement);
    const communityCards = getCommunityCards();
    const currentBet = getCurrentBet();
    const potSize = getPotSize();

    const decision = makeDecision(player, hand, communityCards, currentBet, potSize);

    if (decision === 'fold') {
        fold(playerElement);
    } else if (decision === 'check' || decision === 'call') {
        call(playerElement);
    } else if (decision === 'raise') {
        raise(playerElement);
    }

    game.updateUI();
}

function getHand(playerElement) {
    const playerId = playerElement.id;
    const hand = document.querySelector(`#${playerId} .player-cards`).dataset.cards;
    return JSON.parse(hand);
}

function getCommunityCards() {
    const communityCards = document.querySelector('#community-cards').dataset.cards;
    return JSON.parse(communityCards);
}

function getCurrentBet() {
    return parseInt(document.querySelector('#current-bet').textContent.replace('Current Bet: $', ''), 10);
}

function getPotSize() {
    return parseInt(document.querySelector('#pot').textContent.replace('Pot: $', ''), 10);
}

function fold(playerElement) {
    console.log(`${playerElement.id} folds.`);
    const playerId = playerElement.id;
    document.querySelector(`#${playerId} .player-bet`).textContent = 'Bet: $0';
    game.showPlayerAction(playerId, 'folds');
}

function call(playerElement) {
    console.log(`${playerElement.id} calls.`);
    const playerId = playerElement.id;
    const currentBet = getCurrentBet();
    const playerBetElement = document.querySelector(`#${playerId} .player-bet`);
    const playerBalanceElement = document.querySelector(`#${playerId} .player-balance`);
    const playerBet = parseInt(playerBetElement.textContent.replace('Bet: $', ''), 10);
    const playerBalance = parseInt(playerBalanceElement.textContent.replace('$', ''), 10);
    const callAmount = currentBet - playerBet;
    playerBalanceElement.textContent = `$${playerBalance - callAmount}`;
    playerBetElement.textContent = `Bet: $${currentBet}`;
    game.showPlayerAction(playerId, 'calls');
}

function raise(playerElement) {
    console.log(`${playerElement.id} raises.`);
    const playerId = playerElement.id;
    const currentBet = getCurrentBet();
    const raiseAmount = currentBet * 2;
    const playerBetElement = document.querySelector(`#${playerId} .player-bet`);
    const playerBalanceElement = document.querySelector(`#${playerId} .player-balance`);
    const playerBalance = parseInt(playerBalanceElement.textContent.replace('$', ''), 10);
    playerBalanceElement.textContent = `$${playerBalance - raiseAmount}`;
    playerBetElement.textContent = `Bet: $${raiseAmount}`;
    document.querySelector('#current-bet').textContent = `Current Bet: $${raiseAmount}`;
    game.showPlayerAction(playerId, 'raises');
}

function updateUI() {
    const potSize = game.players.reduce((sum, player) => {
        const playerBet = parseInt(document.querySelector(`#player${player.position + 1} .player-bet`).textContent.replace('Bet: $', ''), 10);
        return sum + playerBet;
    }, 0);
    document.querySelector('#pot').textContent = `Pot: $${potSize}`;
}

function takeTurns() {
    game.aiPlayers.forEach(player => {
        setTimeout(() => {
            handleAITurn(player);
        }, getRandomInt(1000, 3000));
    });
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Initialize the game
const game = new PokerGame();

// Event Listeners
document.getElementById('place-bet').addEventListener('click', () => game.placeBet());
document.getElementById('clear-bet').addEventListener('click', () => game.clearBet());
document.getElementById('check').addEventListener('click', () => game.check());
document.getElementById('call').addEventListener('click', () => game.call());
document.getElementById('raise').addEventListener('click', () => {
    const raiseAmount = prompt("Enter raise amount:");
    if (raiseAmount) game.raise(parseInt(raiseAmount));
});
document.getElementById('fold').addEventListener('click', () => game.fold());

// Function to start the game
function startGame() {
    game.clearBet();  // Clear any existing bet
    game.startHand();
}

// Add a start game button to the HTML
const startButton = document.createElement('button');
startButton.id = 'start-game';
startButton.textContent = 'Start Game';
startButton.addEventListener('click', startGame);
document.getElementById('game-container').prepend(startButton);

// Function to update the UI every second (for timers)
function updateUILoop() {
    game.updateUI();
    requestAnimationFrame(updateUILoop);
}

// Start the UI update loop
updateUILoop();

// Initial UI update
game.updateUI();
