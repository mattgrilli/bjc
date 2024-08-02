// Symbols and pay table
const symbols = ['🚀', '🌟', '🌙', '🪐', '👽', '🛸', '🌈', '🌠'];
const payTable = {
    '🚀': 2,
    '🌟': 3,
    '🌙': 4,
    '🪐': 5,
    '👽': 7,
    '🛸': 9,
    '🌈': 12, // Wild
    '🌠': 15  // Scatter
};

// Game state
let balance = 1000;
let currentBet = 0;
let maxBet = 100;
let isAutoPlay = false;
let winStreak = 0;
let freeSpins = 0;
let freeSpinMultiplier = 1;
let activePaylines = 1;
let bonusGameType = '';

// Paylines
const paylines = [
    [[0,0], [1,0], [2,0]], // Top row
    [[0,1], [1,1], [2,1]], // Middle row
    [[0,2], [1,2], [2,2]]  // Bottom row
];

// Sound effects
const sounds = {
    spin: { audio: new Audio('sounds/spin.wav'), duration: 1000 },
    slotsWin: { audio: new Audio('sounds/slots_win.wav'), duration: 2000 },
    slotsLose: { audio: new Audio('sounds/slots_lose.wav'), duration: 1500 },
    chip: { audio: new Audio('sounds/chip.wav'), duration: 500 },
    bonus: { audio: new Audio('sounds/bonus.wav'), duration: 2000 },
    jackpot: { audio: new Audio('sounds/jackpot.wav'), duration: 3000 },
    freespin: { audio: new Audio('sounds/freespin.wav'), duration: 2000 },
    coinClink: { audio: new Audio('sounds/coin_clink.wav'), duration: 200 }
};

function playSound(soundName) {
    const sound = sounds[soundName];
    if (sound.audio.currentTime > 0) {
        sound.audio.pause();
        sound.audio.currentTime = 0;
    }
    sound.audio.play();
    setTimeout(() => {
        sound.audio.pause();
        sound.audio.currentTime = 0;
    }, sound.duration);
}

function updateBalance(amount) {
    balance += amount;
    document.getElementById('balance').textContent = `Balance: $${balance}`;
    updateMaxBet();
}

function updateMaxBet() {
    maxBet = Math.min(balance, 1000);
    const chipValues = [1, 5, 25, 100, 500];
    const chipContainer = document.getElementById('chip-container');
    chipContainer.innerHTML = '';
    chipValues.forEach(value => {
        if (value <= maxBet) {
            const chip = document.createElement('div');
            chip.className = `chip chip-${value}`;
            chip.textContent = `$${value}`;
            chip.addEventListener('click', () => placeBet(value));
            chipContainer.appendChild(chip);
        }
    });
}

function placeBet(amount) {
    if (freeSpins > 0) return true;
    const totalBet = currentBet + amount;
    if (totalBet > balance) {
        setMessage("Insufficient funds for this bet.");
        return false;
    }
    currentBet = totalBet;
    updateBalance(-amount);
    document.getElementById('bet').textContent = `Current Bet: $${currentBet}`;
    playSound('chip');
    animateChip(amount);
    updateBetDisplay();
    return true;
}

function clearBet() {
    if (freeSpins > 0) return;
    updateBalance(currentBet);
    currentBet = 0;
    document.getElementById('bet').textContent = `Current Bet: $${currentBet}`;
    updateBetDisplay();
}

function spin() {
    if (currentBet === 0 && freeSpins === 0) {
        setMessage("Please place a bet first.");
        return;
    }

    playSound('spin');

    const reelColumns = document.querySelectorAll('.reel-column');

    reelColumns.forEach(column => {
        column.style.animation = 'none';
        column.offsetHeight; // Trigger reflow
        column.style.animation = 'reelSpin 0.5s ease-out';
        
        const reels = column.querySelectorAll('.reel');
        reels.forEach(reel => {
            reel.classList.add('spinning');
            let symbolChangeInterval = setInterval(() => {
                reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            }, 50);

            setTimeout(() => {
                clearInterval(symbolChangeInterval);
                reel.classList.remove('spinning');
            }, 1000);
        });
    });

    setTimeout(() => {
        const result = Array.from(reelColumns).map(column => 
            Array.from(column.querySelectorAll('.reel')).map(reel => {
                const symbol = getRandomSymbol();
                reel.textContent = symbol;
                return symbol;
            })
        );

        checkWin(result);

        if (isAutoPlay && freeSpins === 0) {
            setTimeout(spin, 3000);
        } else if (freeSpins > 0) {
            setTimeout(spin, 2000);
        }
    }, 1500);
}

function getRandomSymbol() {
    const randomValue = Math.random();
    if (randomValue < 0.01) return '🌠'; // 1% chance for scatter
    if (randomValue < 0.03) return '🌈'; // 2% chance for wild
    return symbols[Math.floor(Math.random() * (symbols.length - 2))]; // Exclude wild and scatter from regular symbols
}

function checkWin(result) {
    let totalWin = 0;
    const paylines = document.querySelectorAll('.payline');
    
    for (let i = 0; i < activePaylines; i++) {
        paylines[i].classList.add('active');
        const lineResult = [result[0][i], result[1][i], result[2][i]];
        const win = calculateWin(lineResult);
        totalWin += win;
    }

    const scatterCount = result.flat().filter(s => s === '🌠').length;
    if (scatterCount >= 3) {
        triggerFreeSpins();
    }

    if (totalWin > 0) {
        setMessage(`You won $${totalWin}!`);
        updateBalance(totalWin);
        if (totalWin >= currentBet * 10) {
            playSound('jackpot');
        } else {
            playSound('slotsWin');
        }
        winStreak++;
        animateWin();
        animateWinnings(totalWin);
        
        if (Math.random() < 0.2) { // 20% chance to trigger bonus game
            setTimeout(startBonusGame, Math.max(3000, totalWin * 10)); // Delay based on win amount
        }
    } else {
        setMessage(freeSpins > 0 ? `${freeSpins} free spins left!` : "Better luck next time!");
        winStreak = 0;
        playSound('slotsLose');
    }

    updateWinStreak();
    updateDisplay();
    setTimeout(() => {
        paylines.forEach(line => line.classList.remove('active'));
    }, 2000);

    if (freeSpins > 0) {
        freeSpins--;
        updateFreeSpinsDisplay();
        if (freeSpins === 0) {
            freeSpinMultiplier = 1;
            setMessage("Free spins completed!");
        }
    } else {
        currentBet = 0;
    }
    
    updateBetDisplay();
}

function calculateWin(lineResult) {
    if (lineResult.includes('🌈')) {
        return handleWildWin(lineResult);
    } else if (lineResult[0] === lineResult[1] && lineResult[1] === lineResult[2]) {
        return currentBet * payTable[lineResult[0]] * freeSpinMultiplier / activePaylines;
    } else if (lineResult[0] === lineResult[1] || lineResult[1] === lineResult[2]) {
        return currentBet * Math.floor(payTable[lineResult[1]] / 2) * freeSpinMultiplier / activePaylines;
    }
    return 0;
}

function handleWildWin(lineResult) {
    const wildIndices = lineResult.map((s, i) => s === '🌈' ? i : -1).filter(i => i !== -1);
    let maxWin = 0;

    for (let symbol of symbols.filter(s => s !== '🌈' && s !== '🌠')) {
        let testResult = [...lineResult];
        wildIndices.forEach(i => testResult[i] = symbol);

        let winAmount = 0;
        if (testResult[0] === testResult[1] && testResult[1] === testResult[2]) {
            winAmount = currentBet * payTable[testResult[0]] * freeSpinMultiplier / activePaylines;
        } else if (testResult[0] === testResult[1] || testResult[1] === testResult[2]) {
            winAmount = currentBet * Math.floor(payTable[testResult[1]] / 2) * freeSpinMultiplier / activePaylines;
        }

        if (winAmount > maxWin) {
            maxWin = winAmount;
        }
    }

    return maxWin;
}

function triggerFreeSpins() {
    freeSpins = 10;
    freeSpinMultiplier = 2;
    setMessage("You've won 10 free spins with 2x multiplier!");
    playSound('freespin');
    updateFreeSpinsDisplay();
}

function startBonusGame() {
    playSound('bonus');
    const bonusGame = document.getElementById('bonus-game');
    bonusGame.classList.remove('hidden');

    // Randomly choose a bonus game type
    const bonusTypes = ['planetPicker', 'treasureChest', 'alienInvasion'];
    bonusGameType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];

    switch(bonusGameType) {
        case 'planetPicker':
            setupPlanetPicker();
            break;
        case 'treasureChest':
            setupTreasureChest();
            break;
        case 'alienInvasion':
            setupAlienInvasion();
            break;
    }
}

function setupPlanetPicker() {
    const planets = document.getElementById('planets');
    planets.innerHTML = '';
    setMessage("Pick a planet to reveal your bonus!");

    const bonusMultipliers = [2, 3, 4, 5, 6, 8];
    const shuffledMultipliers = shuffleArray(bonusMultipliers);

    for (let i = 0; i < 3; i++) {
        const planet = document.createElement('div');
        planet.classList.add('planet');
        planet.dataset.multiplier = shuffledMultipliers[i];
        planet.style.backgroundImage = `url('images/planet${i+1}.png')`;
        planet.addEventListener('click', () => endBonusGame(planet));
        planets.appendChild(planet);
    }
}

function setupTreasureChest() {
    const planets = document.getElementById('planets');
    planets.innerHTML = '';
    setMessage("Choose a treasure chest to reveal your prize!");

    const prizes = ['2x', '3x', '4x', '5x', 'jackpot'];
    const shuffledPrizes = shuffleArray(prizes);

    for (let i = 0; i < 3; i++) {
        const chest = document.createElement('div');
        chest.classList.add('treasure-chest');
        chest.dataset.prize = shuffledPrizes[i];
        chest.style.backgroundImage = `url('images/chest.png')`;
        chest.addEventListener('click', () => endBonusGame(chest));
        planets.appendChild(chest);
    }
}

function setupAlienInvasion() {
    const planets = document.getElementById('planets');
    planets.innerHTML = '';
    setMessage("Defeat the aliens to win bonus prizes!");

    for (let i = 0; i < 5; i++) {
        const alien = document.createElement('div');
        alien.classList.add('alien');
        alien.dataset.prize = Math.floor(Math.random() * 100) + 50; // Random prize between 50 and 150
        alien.style.backgroundImage = `url('images/alien${i+1}.png')`;
        alien.addEventListener('click', () => hitAlien(alien));
        planets.appendChild(alien);
    }
}

function hitAlien(alien) {
    alien.classList.add('defeated');
    const prize = parseInt(alien.dataset.prize);
    updateBalance(prize);
    setMessage(`You defeated an alien and won $${prize}!`);
    
    const remainingAliens = document.querySelectorAll('.alien:not(.defeated)');
    if (remainingAliens.length === 0) {
        setTimeout(() => {
            endBonusGame();
        }, 2000);
    }
}

function endBonusGame(selectedItem) {
    let bonusWin = 0;

    switch(bonusGameType) {
        case 'planetPicker':
            const multiplier = parseInt(selectedItem.dataset.multiplier);
            bonusWin = currentBet * multiplier;
            revealAllItems('.planet', 'multiplier');
            break;
        case 'treasureChest':
            const prize = selectedItem.dataset.prize;
            if (prize === 'jackpot') {
                bonusWin = currentBet * 50; // Jackpot is 50x the bet
            } else {
                bonusWin = currentBet * parseInt(prize);
            }
            revealAllItems('.treasure-chest', 'prize');
            break;
        case 'alienInvasion':
            // Bonus win is already added in hitAlien function
            bonusWin = 0;
            break;
    }

    updateBalance(bonusWin);
    
    if (bonusWin > 0) {
        setMessage(`Bonus win: $${bonusWin}!`);
        playSound('slotsWin');
    }
    
    setTimeout(() => {
        document.getElementById('bonus-game').classList.add('hidden');
        // Reset bonus game elements
        document.getElementById('planets').innerHTML = '';
    }, 3000);
}

function revealAllItems(selector, dataAttribute) {
    const items = document.querySelectorAll(selector);
    items.forEach(item => {
        const value = item.dataset[dataAttribute];
        item.textContent = value;
        item.style.color = 'white';
        item.style.display = 'flex';
        item.style.justifyContent = 'center';
        item.style.alignItems = 'center';
        item.style.fontSize = '24px';
        item.style.fontWeight = 'bold';
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateWinStreak() {
    document.getElementById('win-streak').textContent = `Win Streak: ${winStreak}`;
    if (winStreak > 0) {
        document.getElementById('win-streak').style.color = `hsl(${winStreak * 30}, 100%, 50%)`;
    } else {
        document.getElementById('win-streak').style.color = '#00ffff';
    }
}

function animateWin() {
    const slotMachine = document.getElementById('slot-machine');
    slotMachine.classList.add('win-animation');
    setTimeout(() => {
        slotMachine.classList.remove('win-animation');
    }, 2000);
}

function setMessage(msg) {
    document.getElementById('message').textContent = msg;
}

function animateChip(amount) {
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
        updateBetDisplay();
    }, animationDuration);
}

function updateBetDisplay() {
    const betChips = document.getElementById('bet-chips');
    betChips.innerHTML = '';
    if (currentBet > 0) {
        const chipValues = [500, 100, 25, 5, 1];
        let remainingBet = currentBet;
        let stackOffset = 0;

        chipValues.forEach(value => {
            const count = Math.floor(remainingBet / value);
            for (let i = 0; i < count; i++) {
                const chip = document.createElement('div');
                chip.className = `chip chip-${value}`;
                chip.textContent = `$${value}`;
                chip.style.position = 'absolute';
                chip.style.bottom = `${stackOffset}px`;
                chip.style.left = `${stackOffset}px`;
                chip.style.zIndex = chipValues.length - chipValues.indexOf(value);
                betChips.appendChild(chip);
                stackOffset += 5;
            }
            remainingBet %= value;
        });
    }

    document.getElementById('bet').textContent = `Current Bet: $${currentBet}`;
}

function toggleAutoPlay() {
    isAutoPlay = !isAutoPlay;
    const autoPlayButton = document.getElementById('auto-play');
    autoPlayButton.textContent = isAutoPlay ? 'Stop Auto' : 'Auto Play';
    if (isAutoPlay) {
        spin();
    }
}

function changePaylines() {
    activePaylines = activePaylines % 3 + 1;
    document.getElementById('paylines').textContent = `Active Paylines: ${activePaylines}`;
    clearBet();
    updatePaylineDisplay();
}

function updatePaylineDisplay() {
    const paylineElements = document.querySelectorAll('.payline');
    paylineElements.forEach((el, index) => {
        el.style.display = index < activePaylines ? 'block' : 'none';
    });
}

function displayPayTable() {
    const payTableDisplay = document.getElementById('pay-table');
    payTableDisplay.innerHTML = '<h3>Cosmic Rewards</h3>';
    for (const [symbol, multiplier] of Object.entries(payTable)) {
        payTableDisplay.innerHTML += `<p>${symbol} x3: ${multiplier}x bet</p>`;
    }
    payTableDisplay.innerHTML += `<p>🌈 Wild: Substitutes for any symbol</p>`;
    payTableDisplay.innerHTML += `<p>🌠 Scatter: 3 or more trigger 10 free spins with 2x multiplier</p>`;
}

function updateDisplay() {
    document.getElementById('balance').textContent = `Balance: $${balance}`;
    document.getElementById('bet').textContent = `Current Bet: $${currentBet}`;
    updateFreeSpinsDisplay();
}

function updateFreeSpinsDisplay() {
    const freeSpinsDisplay = document.getElementById('free-spins-display');
    if (freeSpins > 0) {
        freeSpinsDisplay.textContent = `FREE SPINS: ${freeSpins}`;
        freeSpinsDisplay.style.display = 'block';
    } else {
        freeSpinsDisplay.style.display = 'none';
    }
}

function animateWinnings(amount) {
    const winningsDisplay = document.getElementById('winnings-display');
    const winOverlay = document.getElementById('win-overlay');
    winOverlay.style.display = 'flex';
    winningsDisplay.style.display = 'block';
    let currentDisplay = 0;
    const duration = Math.min(5000, amount * 20); // Longer duration for bigger wins, max 5 seconds
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    const increment = amount / steps;

    winningsDisplay.style.fontSize = '72px';
    winningsDisplay.style.fontWeight = 'bold';
    winningsDisplay.style.color = '#FFD700';
    winningsDisplay.style.textShadow = '0 0 10px #FF4500';

    const animation = setInterval(() => {
        currentDisplay += increment;
        winningsDisplay.textContent = `$${Math.floor(currentDisplay)}`;
        if (Math.random() < 0.3) {
            playSound('coinClink');
        }
        
        // Add pulsating effect
        winningsDisplay.style.transform = `scale(${1 + Math.sin(Date.now() / 100) * 0.1})`;

        if (currentDisplay >= amount) {
            clearInterval(animation);
            winningsDisplay.textContent = `$${amount}`;
            winningsDisplay.style.color = '#00FF00';
            winningsDisplay.style.fontSize = '96px';
            playSound('slotsWin');
            
            // Add a celebratory message
            const celebrationMsg = document.createElement('div');
            celebrationMsg.textContent = 'BIG WIN!';
            celebrationMsg.style.fontSize = '48px';
            celebrationMsg.style.color = '#FF4500';
            celebrationMsg.style.marginTop = '20px';
            winOverlay.appendChild(celebrationMsg);

            setTimeout(() => {
                winOverlay.style.display = 'none';
                winningsDisplay.style.display = 'none';
                winningsDisplay.style.fontSize = '72px';
                winningsDisplay.style.color = '#FFD700';
                winOverlay.removeChild(celebrationMsg);
            }, 3000);
        }
    }, interval);
}

function initializeGame() {
    document.getElementById('spin').addEventListener('click', spin);
    document.getElementById('max-bet').addEventListener('click', () => {
        clearBet();
        placeBet(maxBet);
    });
    document.getElementById('clear-bet').addEventListener('click', clearBet);
    document.getElementById('back-to-lobby').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('auto-play').addEventListener('click', toggleAutoPlay);
    document.getElementById('change-paylines').addEventListener('click', changePaylines);

    updateMaxBet();
    updatePaylineDisplay();

    // Set initial random symbols on the reels
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        reel.textContent = getRandomSymbol();
    });

    displayPayTable();
    updateDisplay();
    updateWinStreak();
}

document.addEventListener('DOMContentLoaded', initializeGame);

// Helper function for random number generation
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}