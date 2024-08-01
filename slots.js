const symbols = ['🚀', '🌟', '🌙', '🪐', '👽', '🛸', '🌈', '🌠'];
const payTable = {
    '🚀': 3,
    '🌟': 4,
    '🌙': 5,
    '🪐': 6,
    '👽': 8,
    '🛸': 10,
    '🌈': 15, // Wild
    '🌠': 20  // Scatter
};
let balance = 1000;
let currentBet = 0;
const maxBet = 100;
let isAutoPlay = false;
let winStreak = 0;
let freeSpins = 0;
let freeSpinMultiplier = 1;
let activePaylines = 1;

const paylines = [
    [[0,0], [1,0], [2,0]], // Top row
    [[0,1], [1,1], [2,1]], // Middle row
    [[0,2], [1,2], [2,2]]  // Bottom row
];

// Initialize sound effects
const spinSound = new Audio('sounds/card.wav');
const winSound = new Audio('sounds/win.mp3');
const chipSound = new Audio('sounds/chip.wav');

function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

function updateBalance(amount) {
    balance += amount;
    document.getElementById('balance').textContent = `Balance: $${balance}`;
}

function placeBet(amount) {
    if (freeSpins > 0) return true;
    if (amount * activePaylines > balance) {
        setMessage("Insufficient funds for this bet.");
        return false;
    }
    currentBet = amount * activePaylines;
    updateBalance(-currentBet);
    document.getElementById('bet').textContent = `Current Bet: $${currentBet}`;
    playSound(chipSound);
    animateChip(amount);
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

    playSound(spinSound);

    const reels = [
        [document.getElementById('reel1-1'), document.getElementById('reel1-2'), document.getElementById('reel1-3')],
        [document.getElementById('reel2-1'), document.getElementById('reel2-2'), document.getElementById('reel2-3')],
        [document.getElementById('reel3-1'), document.getElementById('reel3-2'), document.getElementById('reel3-3')]
    ];

    reels.forEach(column => {
        column.forEach(reel => {
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
        const result = reels.map(column => 
            column.map(reel => {
                const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                reel.textContent = symbol;
                return symbol;
            })
        );

        checkWin(result);

        if (isAutoPlay && freeSpins === 0) {
            setTimeout(spin, 2000);
        } else if (freeSpins > 0) {
            setTimeout(spin, 1000);
        }
    }, 1000);
}

function checkWin(result) {
    let totalWin = 0;
    const payline = document.querySelectorAll('.payline');
    
    for (let i = 0; i < activePaylines; i++) {
        payline[i].style.display = 'block';
        const lineResult = paylines[i].map(([x, y]) => result[x][y]);
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
        playSound(winSound);
        winStreak++;
        animateWin();
        if (Math.random() < 0.3) { // 30% chance to trigger bonus game
            setTimeout(startBonusGame, 1500);
        }
    } else {
        setMessage(freeSpins > 0 ? `${freeSpins} free spins left!` : "Better luck next time!");
        winStreak = 0;
    }

    updateWinStreak();
    setTimeout(() => {
        payline.forEach(line => line.style.display = 'none');
    }, 2000);

    if (freeSpins > 0) {
        freeSpins--;
        if (freeSpins === 0) {
            freeSpinMultiplier = 1;
            setMessage("Free spins completed!");
        }
    } else {
        currentBet = 0;
        document.getElementById('bet').textContent = `Current Bet: $${currentBet}`;
    }
    
    updateBetDisplay();
    if (Math.random() < 0.2) { // 20% chance to upgrade symbols
        upgradeSymbols();
    }
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
}

function startBonusGame() {
    const bonusGame = document.getElementById('bonus-game');
    bonusGame.classList.remove('hidden');

    const planets = document.getElementById('planets');
    planets.innerHTML = '';

    const planetImages = [
        'url("images/planet1.jpg")',
        'url("images/planet2.jpg")',
        'url("images/planet3.jpg")'
    ];

    for (let i = 0; i < 3; i++) {
        const planet = document.createElement('div');
        planet.classList.add('planet');
        planet.style.backgroundImage = planetImages[i];
        planet.addEventListener('click', () => endBonusGame(planet));
        planets.appendChild(planet);
    }
}

function endBonusGame(selectedPlanet) {
    const bonusWin = Math.floor(Math.random() * 5 + 1) * currentBet; // 1x to 5x bet
    updateBalance(bonusWin);
    setMessage(`Bonus win: $${bonusWin}!`);
    selectedPlanet.style.transform = 'scale(1.2)';
    setTimeout(() => {
        document.getElementById('bonus-game').classList.add('hidden');
    }, 2000);
}

function updateWinStreak() {
    document.getElementById('win-streak').textContent = `Win Streak: ${winStreak}`;
    if (winStreak > 0) {
        document.getElementById('win-streak').style.color = `hsl(${winStreak * 30}, 100%, 50%)`;
    } else {
        document.getElementById('win-streak').style.color = '#00ffff';
    }
}

function upgradeSymbols() {
    const symbolOrder = ['🚀', '🌟', '🌙', '🪐', '👽', '🛸'];
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        const currentSymbol = reel.textContent;
        const currentIndex = symbolOrder.indexOf(currentSymbol);
        if (currentIndex < symbolOrder.length - 1) {
            const newSymbol = symbolOrder[currentIndex + 1];
            reel.textContent = newSymbol;
            reel.classList.add('upgraded');
            setTimeout(() => reel.classList.remove('upgraded'), 500);
        }
    });
    setMessage("Symbols upgraded for the next spin!");
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
        const chip = document.createElement('div');
        chip.className = `chip chip-${currentBet}`;
        chip.textContent = `$${currentBet}`;
        betChips.appendChild(chip);
    }
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

function initializeGame() {
    document.getElementById('spin').addEventListener('click', spin);
    document.getElementById('max-bet').addEventListener('click', () => {
        clearBet();
        placeBet(maxBet / activePaylines);
    });
    document.getElementById('clear-bet').addEventListener('click', clearBet);
    document.getElementById('back-to-lobby').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('auto-play').addEventListener('click', toggleAutoPlay);
    document.getElementById('change-paylines').addEventListener('click', changePaylines);

    // Initialize chips
    const chipValues = [1, 5, 25, 100];
    const chipContainer = document.getElementById('chip-container');
    chipValues.forEach(value => {
        const chip = document.createElement('div');
        chip.className = `chip chip-${value}`;
        chip.textContent = `$${value}`;
        chip.addEventListener('click', () => placeBet(value));
        chipContainer.appendChild(chip);
    });

    // Set initial random symbols on the reels
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    });

    displayPayTable();
    updateBalance(0); // Initialize balance display
    updateWinStreak();
}

document.addEventListener('DOMContentLoaded', initializeGame);