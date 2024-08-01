const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Initialize sound effects
const cardSound = new Audio('sounds/card.wav');
const chipSound = new Audio('sounds/chip.wav');
const winSound = new Audio('sounds/win.mp3');
const loseSound = new Audio('sounds/lose.mp3');
const drawSound = new Audio('sounds/draw.wav');
const clickSound = new Audio('sounds/click.wav');

// Function to play sound
function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

// Save and load statistics
function saveStats() {
    localStorage.setItem('blackjackStats', JSON.stringify(gameStats));
}

function loadStats() {
    const stats = localStorage.getItem('blackjackStats');
    return stats ? JSON.parse(stats) : { gamesPlayed: 0, gamesWon: 0, totalMoney: 0 };
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('stats').textContent = `Games Played: ${gameStats.gamesPlayed} | Games Won: ${gameStats.gamesWon} | Total Won/Lost: $${gameStats.totalMoney}`;
}

// Initial game statistics
let gameStats = loadStats();
updateStatsDisplay();

class Deck {
    constructor(numDecks = 1) {
        this.numDecks = numDecks;
        this.reset();
    }

    reset() {
        this.cards = [];
        for (let d = 0; d < this.numDecks; d++) {
            for (let suit of suits) {
                for (let value of values) {
                    this.cards.push({ suit, value });
                }
            }
        }
        this.shuffle();
    }

    shuffle() {
        const { cards } = this;
        let m = cards.length, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            [cards[m], cards[i]] = [cards[i], cards[m]];
        }
        const cut = Math.floor(cards.length / 2) + Math.floor(Math.random() * 20) - 10;
        this.cards = [...cards.slice(cut), ...cards.slice(0, cut)];
    }

    deal() {
        if (this.cards.length < 1) {
            this.reset();
        }
        return this.cards.pop();
    }
}

class Hand {
    constructor() {
        this.cards = [];
        this.bet = 0;
        this.doubledDown = false;
        this.surrendered = false;
    }

    addCard(card) {
        this.cards.push(card);
        playSound(cardSound);
    }

    getScore() {
        let score = 0;
        let aces = 0;
        for (let card of this.cards) {
            if (card.value === 'A') {
                aces++;
                score += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        }
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }

    canSplit() {
        return this.cards.length === 2 && this.cards[0].value === this.cards[1].value;
    }
}

class Player {
    constructor(initialBalance) {
        this.balance = initialBalance;
        this.hands = [new Hand()];
        this.insurance = 0;
    }

    placeBet(amount, handIndex = 0) {
        if (amount > this.balance) {
            throw new Error("Insufficient funds");
        }
        this.balance -= amount;
        this.hands[handIndex].bet += amount;
        playSound(chipSound);
    }

    win(handIndex) {
        this.balance += this.hands[handIndex].bet * 2;
        this.hands[handIndex].bet = 0;
    }

    lose(handIndex) {
        this.hands[handIndex].bet = 0;
    }

    push(handIndex) {
        this.balance += this.hands[handIndex].bet;
        this.hands[handIndex].bet = 0;
    }

    blackjack(handIndex) {
        this.balance += this.hands[handIndex].bet * 2.5;
        this.hands[handIndex].bet = 0;
    }

    doubleDown(handIndex) {
        const additionalBet = this.hands[handIndex].bet;
        this.balance -= additionalBet;
        this.hands[handIndex].bet += additionalBet;
        this.hands[handIndex].doubledDown = true;
        playSound(chipSound);
    }

    split(handIndex) {
        const newHand = new Hand();
        newHand.addCard(this.hands[handIndex].cards.pop());
        newHand.bet = this.hands[handIndex].bet;
        this.balance -= newHand.bet;
        this.hands.splice(handIndex + 1, 0, newHand);
        playSound(chipSound);
    }

    surrender(handIndex) {
        this.balance += this.hands[handIndex].bet / 2;
        this.hands[handIndex].bet = 0;
        this.hands[handIndex].surrendered = true;
    }

    placeInsurance(amount) {
        if (amount > this.balance) {
            throw new Error("Insufficient funds for insurance");
        }
        this.balance -= amount;
        this.insurance = amount;
        playSound(chipSound);
    }

    winInsurance() {
        this.balance += this.insurance * 3;
        this.insurance = 0;
    }

    loseInsurance() {
        this.insurance = 0;
    }
}

class Game {
    constructor(playerBalance, numDecks = 6) {
        this.deck = new Deck(numDecks);
        this.player = new Player(playerBalance);
        this.dealer = new Hand();
        this.currentHandIndex = 0;
        this.gamePhase = 'betting';
        this.currentBet = 0;
        this.allowSplit = true;
        this.allowDoubleDown = true;
        this.allowSurrender = true;
        this.allowInsurance = true;
        this.chipsInPot = [];
        this.streakCounter = 0;
        this.initializeChips();
        this.themes = ['theme1', 'theme2', 'theme3'];
        this.currentTheme = 0;
    }

    initializeChips() {
        this.availableChips = [1, 5, 25, 100, 500, 1000].filter(chip => chip <= this.player.balance);
        this.updateChips();
    }

    placeBet(amount) {
        if (this.gamePhase !== 'betting') {
            setMessage("You can only place bets before dealing.");
            return false;
        }
        if (amount > this.player.balance) {
            setMessage("Insufficient funds for this bet.");
            return false;
        }
        this.currentBet += amount;
        this.player.balance -= amount;
        this.chipsInPot.push(amount);
        this.updateUI();
        setMessage(`Added $${amount} to the bet. Total bet: $${this.currentBet}`);
        playSound(chipSound);
        this.animateChip(amount);
        return true;
    }

    removeBet(amount) {
        const index = this.chipsInPot.indexOf(amount);
        if (index > -1) {
            this.chipsInPot.splice(index, 1);
            this.currentBet -= amount;
            this.player.balance += amount;
            this.updateUI();
            setMessage(`Removed $${amount} from the bet. Total bet: $${this.currentBet}`);
            playSound(chipSound);
        }
    }

    clearBet() {
        this.player.balance += this.currentBet;
        this.currentBet = 0;
        this.chipsInPot = [];
        this.updateUI();
        setMessage("Bet cleared.");
        playSound(chipSound);
    }

    deal() {
        if (this.currentBet === 0) {
            setMessage("Please place a bet first.");
            return;
        }
        this.player.hands = [new Hand()];
        this.player.hands[0].bet = this.currentBet;
        this.dealer = new Hand();

        this.player.hands[0].addCard(this.deck.deal());
        this.dealer.addCard(this.deck.deal());
        this.player.hands[0].addCard(this.deck.deal());
        this.dealer.addCard(this.deck.deal());

        this.currentHandIndex = 0;
        this.gamePhase = 'playerTurn';
        this.checkForBlackjack();
        this.updateUI();
        this.offerInsurance();
        playSound(cardSound);
    }

    hit(handIndex) {
        this.player.hands[handIndex].addCard(this.deck.deal());
        if (this.player.hands[handIndex].getScore() > 21) {
            this.endHand('loss', handIndex);
        } else if (this.player.hands[handIndex].doubledDown) {
            this.stand(handIndex);
        }
        this.updateUI();
    }

    stand(handIndex) {
        this.nextHand();
    }

    doubleDown(handIndex) {
        const hand = this.player.hands[handIndex];
        if (this.player.balance >= hand.bet && hand.cards.length === 2) {
            this.player.doubleDown(handIndex);
            this.hit(handIndex);
        } else {
            setMessage("Cannot double down. Insufficient funds or more than two cards in hand.");
        }
        this.updateUI();
    }

    split(handIndex) {
        const hand = this.player.hands[handIndex];
        if (this.player.balance >= hand.bet && hand.canSplit()) {
            this.player.split(handIndex);
            this.player.hands[handIndex].addCard(this.deck.deal());
            this.player.hands[handIndex + 1].addCard(this.deck.deal());
            this.updateUI();
        } else {
            setMessage("Cannot split. Insufficient funds or cards don't match.");
        }
    }

    surrender() {
        if (this.gamePhase === 'playerTurn' && this.player.hands[this.currentHandIndex].cards.length === 2) {
            this.player.surrender(this.currentHandIndex);
            this.endHand('surrender', this.currentHandIndex);
        } else {
            setMessage("You can only surrender on your first action.");
        }
    }

    offerInsurance() {
        if (this.allowInsurance && this.dealer.cards[0].value === 'A' && this.player.balance >= this.player.hands[0].bet / 2) {
            setMessage("Dealer's up card is an Ace. Would you like to buy insurance?");
            document.getElementById('insurance').style.display = 'inline-block';
        }
    }

    buyInsurance() {
        const insuranceAmount = this.player.hands[0].bet / 2;
        try {
            this.player.placeInsurance(insuranceAmount);
            setMessage("Insurance bought.");
            document.getElementById('insurance').style.display = 'none';
            if (this.dealer.getScore() === 21) {
                this.player.winInsurance();
                setMessage("Dealer has Blackjack. Insurance pays 2:1.");
                this.endHand('loss', 0);
            } else {
                this.player.loseInsurance();
                setMessage("Dealer does not have Blackjack. Insurance lost.");
            }
        } catch (error) {
            setMessage(error.message);
        }
        this.updateUI();
    }

    nextHand() {
        this.currentHandIndex++;
        if (this.currentHandIndex >= this.player.hands.length) {
            this.dealerPlay();
        } else {
            this.updateUI();
        }
    }

    dealerPlay() {
        this.gamePhase = 'dealerTurn';
        this.updateUI();
        while (this.dealer.getScore() < 17) {
            this.dealer.addCard(this.deck.deal());
        }
        this.determineWinner();
    }

    determineWinner() {
        const dealerScore = this.dealer.getScore();
        this.player.hands.forEach((hand, index) => {
            if (hand.surrendered) {
                return;
            }
            const playerScore = hand.getScore();
            if (playerScore > 21) {
                this.endHand('loss', index);
            } else if (dealerScore > 21) {
                this.endHand('win', index);
            } else if (playerScore > dealerScore) {
                this.endHand('win', index);
            } else if (playerScore < dealerScore) {
                this.endHand('loss', index);
            } else {
                this.endHand('push', index);
            }
        });
    }

    checkForBlackjack() {
        const playerScore = this.player.hands[0].getScore();
        const dealerScore = this.dealer.getScore();

        if (playerScore === 21 && dealerScore === 21) {
            this.endHand('push', 0, "Both have Blackjack! It's a push.");
        } else if (playerScore === 21) {
            this.endHand('blackjack', 0);
        } else if (dealerScore === 21) {
            this.endHand('loss', 0, "Dealer has Blackjack! You lose.");
        }
    }

    endHand(result, handIndex = 0, customMessage = null) {
        const hand = this.player.hands[handIndex];
        let amount = hand.bet;
        let message = customMessage || `Hand ${handIndex + 1}: `;
        let popupMessage = '';

        switch (result) {
            case 'win':
                this.player.balance += amount * 2;
                gameStats.totalMoney += amount;
                gameStats.gamesWon++;
                message += `You win $${amount}!`;
                popupMessage = `WIN<br>$${amount}`;
                playSound(winSound);
                this.streakCounter = Math.max(0, this.streakCounter + 1);
                break;
            case 'loss':
                gameStats.totalMoney -= amount;
                message += `You lose $${amount}.`;
                popupMessage = `LOSE<br>$${amount}`;
                playSound(loseSound);
                this.streakCounter = Math.min(0, this.streakCounter - 1);
                break;
            case 'push':
                this.player.balance += amount;
                message += "It's a push. Your bet is returned.";
                popupMessage = 'PUSH';
                playSound(drawSound);
                break;
            case 'blackjack':
                const blackjackAmount = amount * 2.5;
                this.player.balance += blackjackAmount;
                gameStats.totalMoney += (blackjackAmount - amount);
                gameStats.gamesWon++;
                message += `Blackjack! You win $${blackjackAmount - amount}!`;
                popupMessage = `BLACKJACK<br>$${blackjackAmount - amount}`;
                playSound(winSound);
                this.streakCounter = Math.max(0, this.streakCounter + 1);
                break;
            case 'surrender':
                this.player.balance += amount / 2;
                gameStats.totalMoney -= amount / 2;
                message += `You surrendered. Half of your bet ($${amount / 2}) is returned.`;
                popupMessage = `SURRENDER<br>$${amount / 2} returned`;
                playSound(drawSound);
                this.streakCounter = 0;
                break;
        }

        gameStats.gamesPlayed++;
        saveStats();
        updateStatsDisplay();
        this.showPopupMessage(popupMessage, handIndex);
        setMessage(message);
        this.gamePhase = 'gameOver';
        this.updateUI();
        document.getElementById('next-hand').style.display = 'inline-block';
        this.checkHotStreak();
    }

    showPopupMessage(message, handIndex) {
        const handElement = document.querySelectorAll('.hand')[handIndex];
        if (!handElement) {
            console.error(`Hand element not found for index ${handIndex}`);
            return;
        }
        const popup = document.createElement('div');
        popup.className = 'result-popup';
        popup.innerHTML = message;
        handElement.appendChild(popup);

        setTimeout(() => {
            popup.remove();
        }, 3000);
    }

    checkHotStreak() {
        if (this.streakCounter === 3) {
            this.showHotStreakAnimation();
        } else if (this.streakCounter === -3) {
            this.showColdStreakAnimation();
        }
    }

    showHotStreakAnimation() {
        const gameContainer = document.getElementById('game-container');
        const streakMsg = document.createElement('div');
        streakMsg.className = 'streak-message hot-streak';
        streakMsg.textContent = "You're on fire! 🔥";
        gameContainer.appendChild(streakMsg);

        setTimeout(() => {
            streakMsg.remove();
        }, 3000);
    }

    showColdStreakAnimation() {
        const gameContainer = document.getElementById('game-container');
        const streakMsg = document.createElement('div');
        streakMsg.className = 'streak-message cold-streak';
        streakMsg.textContent = "Chilly streak! ❄️";
        gameContainer.appendChild(streakMsg);

        setTimeout(() => {
            streakMsg.remove();
        }, 3000);
    }

    updateUI() {
        document.getElementById('balance').textContent = `Balance: $${this.player.balance}`;
        document.getElementById('bet').textContent = `Current Bet: $${this.currentBet}`;

        let dealerCardsEl = document.getElementById('dealer-cards');
        dealerCardsEl.innerHTML = this.dealer.cards.map((card, index) => 
            this.gamePhase === 'playerTurn' && index === 1 ? this.createCardElement({value: '?', suit: '?'}) : this.createCardElement(card)
        ).join('');
        
        if (this.gamePhase !== 'playerTurn') {
            document.getElementById('dealer-hand').querySelector('.hand-title').textContent = `Dealer's Hand (Score: ${this.dealer.getScore()})`;
        } else {
            document.getElementById('dealer-hand').querySelector('.hand-title').textContent = "Dealer's Hand";
        }

        let playerHandsEl = document.getElementById('player-hands');
        if (this.player.hands.length > 0 && this.gamePhase !== 'betting') {
            playerHandsEl.innerHTML = this.player.hands.map((hand, index) => `
                <div class="hand ${index === this.currentHandIndex && this.gamePhase === 'playerTurn' ? 'active-hand' : ''}">
                    <div class="hand-title">Hand ${index + 1} (Score: ${hand.getScore()})</div>
                    <div class="hand-cards">${hand.cards.map(card => this.createCardElement(card)).join('')}</div>
                    <div class="hand-bet">Bet: $${hand.bet}</div>
                </div>
            `).join('');
        } else {
            playerHandsEl.innerHTML = ''; // Clear the player hands area if no hands or in betting phase
        }

        this.updateActionButtons();
        this.updateChips();
    }

    updateActionButtons() {
        const actions = ['hit', 'stand', 'double', 'split', 'surrender'];
        actions.forEach(action => {
            const button = document.getElementById(action);
            const isEnabled = this[`can${action.charAt(0).toUpperCase() + action.slice(1)}`]();
            button.disabled = !isEnabled;
            button.classList.toggle('enabled', isEnabled);
        });
        document.getElementById('deal').disabled = this.gamePhase !== 'betting' || this.currentBet === 0;
        document.getElementById('insurance').style.display = this.canInsurance() ? 'inline-block' : 'none';
    }

    updateChips() {
        const chipContainer = document.getElementById('chip-container');
        chipContainer.innerHTML = '';
        this.availableChips.forEach(chipValue => {
            const chip = document.createElement('div');
            chip.className = `chip chip-${chipValue}`;
            chip.innerHTML = `
                <span class="chip-value">$${chipValue}</span>
            `;
            chip.onclick = () => this.placeBet(chipValue);
            chipContainer.appendChild(chip);
        });
    
        const betChips = document.getElementById('bet-chips');
        betChips.innerHTML = this.chipsInPot.map(chip => `
            <div class="chip chip-${chip}" onclick="game.removeBet(${chip})">
                <span class="chip-value">$${chip}</span>
            </div>
        `).join('');
    }

    canHit() {
        return this.gamePhase === 'playerTurn' && !this.player.hands[this.currentHandIndex].doubledDown;
    }

    canStand() {
        return this.gamePhase === 'playerTurn';
    }

    canDouble() {
        const currentHand = this.player.hands[this.currentHandIndex];
        return this.gamePhase === 'playerTurn' && currentHand.cards.length === 2 && this.player.balance >= currentHand.bet;
    }

    canSplit() {
        const currentHand = this.player.hands[this.currentHandIndex];
        return this.gamePhase === 'playerTurn' && currentHand.canSplit() && this.player.balance >= currentHand.bet;
    }

    canSurrender() {
        return this.allowSurrender && this.gamePhase === 'playerTurn' && this.player.hands[this.currentHandIndex].cards.length === 2;
    }

    canInsurance() {
        return this.allowInsurance && this.gamePhase === 'playerTurn' && this.dealer.cards[0].value === 'A' && this.player.balance >= this.player.hands[0].bet / 2;
    }

    createCardElement(card) {
        let color = (card.suit === '♥' || card.suit === '♦') ? 'red' : '';
        return `<div class="card ${color}">${card.value}${card.suit}</div>`;
    }

    animateChip(amount) {
        const chipElement = document.querySelector(`.chip-${amount}`);
        const betDisplay = document.getElementById('bet-display');
        
        if (!chipElement || !betDisplay) {
            console.error('Required elements for chip animation not found');
            return;
        }

        const clone = chipElement.cloneNode(true);
        const rect = chipElement.getBoundingClientRect();
        const betRect = betDisplay.getBoundingClientRect();

        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);

        const animationDuration = 500; // ms
        clone.animate([
            { transform: 'scale(1)', top: `${rect.top}px`, left: `${rect.left}px` },
            { transform: 'scale(0.5)', top: `${betRect.top + betRect.height / 2}px`, left: `${betRect.left + betRect.width / 2}px` }
        ], {
            duration: animationDuration,
            easing: 'ease-in-out'
        });

        setTimeout(() => {
            clone.remove();
            this.updateChips();
        }, animationDuration);
    }

    prepareNextHand() {
        this.gamePhase = 'betting';
        this.currentHandIndex = 0;
        this.currentBet = 0;
        this.chipsInPot = [];
        this.player.hands = [new Hand()];
        this.dealer = new Hand();
        document.getElementById('next-hand').style.display = 'none';
        this.updateUI();
        setMessage("Place your bet for the next hand.");
    }

    // Change theme
    changeTheme() {
        this.currentTheme = (this.currentTheme + 1) % this.themes.length;
        document.body.className = this.themes[this.currentTheme];
    }
}

let game = new Game(1000);

function setMessage(msg) {
    document.getElementById('message').textContent = msg;
}

// Event Listeners
document.getElementById('deal').addEventListener('click', () => game.deal());
document.getElementById('hit').addEventListener('click', () => game.hit(game.currentHandIndex));
document.getElementById('stand').addEventListener('click', () => game.stand(game.currentHandIndex));
document.getElementById('double').addEventListener('click', () => game.doubleDown(game.currentHandIndex));
document.getElementById('split').addEventListener('click', () => game.split(game.currentHandIndex));
document.getElementById('surrender').addEventListener('click', () => game.surrender());
document.getElementById('insurance').addEventListener('click', () => game.buyInsurance());
document.getElementById('next-hand').addEventListener('click', () => game.prepareNextHand());
document.getElementById('clear-bet').addEventListener('click', () => game.clearBet());
document.getElementById('change-theme').addEventListener('click', () => game.changeTheme());

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (game.gamePhase === 'playerTurn') {
        switch(event.key.toLowerCase()) {
            case 'h': game.hit(game.currentHandIndex); break;
            case 's': game.stand(game.currentHandIndex); break;
            case 'd': 
                if (!document.getElementById('double').disabled) {
                    game.doubleDown(game.currentHandIndex);
                }
                break;
            case 'p':
                if (!document.getElementById('split').disabled) {
                    game.split(game.currentHandIndex);
                }
                break;
            case 'r':
                if (!document.getElementById('surrender').disabled) {
                    game.surrender();
                }
                break;
        }
    } else if (game.gamePhase === 'betting' && event.key === 'Enter') {
        game.deal();
    }
});

// Initial UI update
game.updateUI();

// Add tooltips to explain keyboard shortcuts
const tooltips = [
    { id: 'hit', text: 'Hit (Keyboard: H)' },
    { id: 'stand', text: 'Stand (Keyboard: S)' },
    { id: 'double', text: 'Double Down (Keyboard: D)' },
    { id: 'split', text: 'Split (Keyboard: P)' },
    { id: 'surrender', text: 'Surrender (Keyboard: R)' },
    { id: 'deal', text: 'Deal (Keyboard: Enter)' }
];

tooltips.forEach(tooltip => {
    const element = document.getElementById(tooltip.id);
    if (element) {
        element.title = tooltip.text;
    }
});
