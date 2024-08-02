class RouletteGame {
    constructor(initialBalance) {
        this.balance = initialBalance;
        this.currentBet = 0;
        this.bets = new Map();
        this.availableChips = [1, 5, 25, 100, 500];
        this.wheelNumbers = [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];
        this.selectedChipValue = null;
        this.themes = ['theme1', 'theme2', 'theme3'];
        this.currentTheme = 0;
        this.isSpinning = false;
        this.recentNumbers = [];
        this.soundEnabled = true;
        this.sounds = {
            chip: new Audio('sounds/chip.mp3'),
            spin: new Audio('sounds/spin.mp3'),
            win: new Audio('sounds/win.mp3'),
            lose: new Audio('sounds/lose.mp3')
        };
        this.initializeGame();
    }

    initializeGame() {
        this.createWheel();
        this.createBettingBoard();
        this.createChips();
        this.updateUI();
        this.addEventListeners();
    }

    createWheel() {
        const wheelContainer = document.getElementById('roulette-wheel');
        wheelContainer.innerHTML = `
            <div class="wheel-outer">
                <div class="wheel-center"></div>
                <svg viewBox="0 0 100 100" class="wheel-numbers">
                    ${this.createWheelSVG()}
                </svg>
            </div>
        `;
    }
    
    createWheelSVG() {
        const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        let svgContent = '';
        numbers.forEach((num, index) => {
            const angle = index * 360 / numbers.length;
            const color = num === 0 ? 'green' : (index % 2 ? 'black' : 'red');
            svgContent += `
                <g transform="rotate(${angle} 50 50)">
                    <path d="M50 50 L48 5 A45 45 0 0 1 52 5 Z" fill="${color}" />
                    <text x="50" y="15" text-anchor="middle" fill="white" font-size="3" transform="rotate(${-angle} 50 50)">${num}</text>
                </g>
            `;
        });
        return svgContent;
    }

    createBettingBoard() {
        const numberGrid = document.querySelector('.number-grid');
        const outsideBets = document.querySelector('.outside-bets');
        const columnBets = document.querySelector('.column-bets');
        const zeroSpot = document.querySelector('.zero-spot');
        
        // Clear existing content
        numberGrid.innerHTML = '';
        outsideBets.innerHTML = '';
        columnBets.innerHTML = '';
        zeroSpot.innerHTML = '';
        
        // Create the zero spot
        this.createBettingSpot(zeroSpot, 0, 'green');
        
        // Create number spots (1-36)
        for (let i = 1; i <= 36; i++) {
            this.createBettingSpot(numberGrid, i, this.getNumberColor(i));
        }
    
        // Create outside bets
        const outsideBetTypes = [
            { name: '1-18', type: 'low' },
            { name: 'EVEN', type: 'even' },
            { name: 'RED', type: 'red' },
            { name: 'BLACK', type: 'black' },
            { name: 'ODD', type: 'odd' },
            { name: '19-36', type: 'high' }
        ];
    
        outsideBetTypes.forEach(bet => {
            this.createBettingSpot(outsideBets, bet.name, 'outside-bet', bet.type);
        });
    
        // Create dozen bets
        ['1st 12', '2nd 12', '3rd 12'].forEach((bet, index) => {
            this.createBettingSpot(outsideBets, bet, 'outside-bet', `dozen${index + 1}`);
        });
    
        // Create column bets
        for (let i = 3; i >= 1; i--) {
            this.createBettingSpot(columnBets, '2 to 1', 'column-bet', `column${i}`);
        }
    }

    createBettingSpot(container, number, color, specialBet = null) {
        const spot = document.createElement('div');
        spot.className = `betting-spot ${color}`;
        spot.textContent = number;
        spot.setAttribute('data-bet', specialBet || 'number');
        spot.setAttribute('data-number', number);
        spot.addEventListener('click', () => this.placeBet(specialBet || 'number', specialBet || number));
        container.appendChild(spot);
    }

    getNumberColor(number) {
        if (number === 0) return 'green';
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        return redNumbers.includes(number) ? 'red' : 'black';
    }

    createChips() {
        const chipContainer = document.getElementById('chip-container');
        chipContainer.innerHTML = '';
        this.availableChips.forEach(value => {
            const chip = document.createElement('div');
            chip.className = `chip chip-${value}`;
            chip.textContent = value;
            chip.addEventListener('click', () => this.selectChip(value));
            chipContainer.appendChild(chip);
        });
    }

    selectChip(value) {
        this.selectedChipValue = value;
        document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('selected'));
        document.querySelector(`.chip-${value}`).classList.add('selected');
    }

    placeBet(type, value) {
        if (this.isSpinning) {
            this.showMessage("Cannot place bets while wheel is spinning");
            return;
        }
        if (!this.selectedChipValue) {
            this.showMessage("Please select a chip first");
            return;
        }
        if (this.balance < this.selectedChipValue) {
            this.showMessage("Insufficient funds");
            return;
        }
        const betKey = `${type}-${value}`;
        const currentBet = this.bets.get(betKey) || 0;
        this.bets.set(betKey, currentBet + this.selectedChipValue);
        this.balance -= this.selectedChipValue;
        this.currentBet += this.selectedChipValue;
        this.updateUI();
        this.showMessage(`Bet placed on ${type} ${value}`);
        this.animateBetPlacement(type, value);
        this.playSound('chip');
    }

    animateBetPlacement(type, value) {
        let betSpot;
        if (type === 'number') {
            betSpot = document.querySelector(`.betting-spot[data-bet="number"][data-number="${value}"]`);
        } else {
            betSpot = document.querySelector(`.betting-spot[data-bet="${type}"]`);
        }
        
        if (betSpot) {
            let chipStack = betSpot.querySelector('.chip-stack');
            if (!chipStack) {
                chipStack = document.createElement('div');
                chipStack.className = 'chip-stack';
                betSpot.appendChild(chipStack);
            }

            const chip = document.createElement('div');
            chip.className = `placed-chip chip-${this.selectedChipValue}`;
            chip.textContent = this.selectedChipValue;
            chipStack.appendChild(chip);
            
            chip.animate([
                { transform: 'translateY(-20px)', opacity: 0 },
                { transform: 'translateY(0)', opacity: 1 }
            ], {
                duration: 300,
                easing: 'ease-out'
            });
        }
    }

    clearBet() {
        if (this.isSpinning) {
            this.showMessage("Cannot clear bets while wheel is spinning");
            return;
        }
        this.balance += this.currentBet;
        this.currentBet = 0;
        this.bets.clear();
        this.updateUI();
        this.showMessage("All bets cleared");
        document.querySelectorAll('.chip-stack').forEach(stack => stack.remove());
    }

    spin() {
        if (this.isSpinning) {
            this.showMessage("Wheel is already spinning");
            return;
        }
        if (this.currentBet === 0) {
            this.showMessage("Please place a bet first");
            return;
        }
        this.isSpinning = true;
        const winningNumber = this.wheelNumbers[Math.floor(Math.random() * this.wheelNumbers.length)];
        this.animateSpin(winningNumber);
        this.playSound('spin');
        setTimeout(() => this.resolveGame(winningNumber), 5500);
    }

    animateSpin(winningNumber) {
        const wheel = document.querySelector('.wheel-outer');
        const ball = document.getElementById('ball');
        const winningIndex = this.wheelNumbers.indexOf(winningNumber);
        const spinDegrees = 360 * 5 + (360 - (winningIndex * 360 / this.wheelNumbers.length));
        
        wheel.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheel.style.transform = `rotate(${spinDegrees}deg)`;
        
        ball.animate([
            { transform: 'translate(-50%, -50%) rotate(0deg) translateY(-170px) rotate(0deg)' },
            { transform: `translate(-50%, -50%) rotate(${spinDegrees * 2}deg) translateY(-170px) rotate(${-spinDegrees * 2}deg)` }
        ], {
            duration: 5000,
            easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            fill: 'forwards'
        });

        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = `rotate(${spinDegrees % 360}deg)`;
            ball.style.transform = `translate(-50%, -50%) rotate(${spinDegrees % 360}deg) translateY(-170px) rotate(${-(spinDegrees % 360)}deg)`;
        }, 5000);
    }

    resolveGame(winningNumber) {
        this.isSpinning = false;
        let winnings = 0;
        for (const [bet, amount] of this.bets) {
            const [type, value] = bet.split('-');
            if (this.isBetWon(type, value, winningNumber)) {
                winnings += amount * this.getPayoutMultiplier(type);
                this.animateWinningBet(type, value);
            }
        }
        this.balance += winnings;
        this.showMessage(`Winning number: ${winningNumber}. You won $${winnings}`);
        this.currentBet = 0;
        this.bets.clear();
        this.updateUI();
        this.highlightWinningNumber(winningNumber);
        this.updateRecentNumbers(winningNumber);
        this.playSound(winnings > 0 ? 'win' : 'lose');
        this.clearBettingBoard();
    }

    clearBettingBoard() {
        document.querySelectorAll('.chip-stack').forEach(stack => stack.remove());
    }

    animateWinningBet(type, value) {
        let betSpot;
        if (type === 'number') {
            betSpot = document.querySelector(`.betting-spot[data-bet="number"][data-number="${value}"]`);
        } else {
            betSpot = document.querySelector(`.betting-spot[data-bet="${type}"]`);
        }
        
        if (betSpot) {
            betSpot.classList.add('winning-bet');
            setTimeout(() => betSpot.classList.remove('winning-bet'), 1500);
        }
    }

    highlightWinningNumber(number) {
        const winningSpot = document.querySelector(`.betting-spot[data-bet="number"][data-number="${number}"]`);
        if (winningSpot) {
            winningSpot.classList.add('winning-number');
            setTimeout(() => winningSpot.classList.remove('winning-number'), 3000);
        }
        const winningNumberDisplay = document.getElementById('winning-number');
        winningNumberDisplay.textContent = `Winning Number: ${number}`;
        winningNumberDisplay.style.animation = 'fadeIn 0.5s ease-out';
    }

    updateRecentNumbers(number) {
        this.recentNumbers.unshift(number);
        if (this.recentNumbers.length > 10) {
            this.recentNumbers.pop();
        }
        
        const recentNumbersContainer = document.getElementById('recent-numbers');
        recentNumbersContainer.innerHTML = '';
        this.recentNumbers.forEach(num => {
            const numberElement = document.createElement('div');
            numberElement.className = `recent-number ${this.getNumberColor(num)}`;
            numberElement.textContent = num;
            recentNumbersContainer.appendChild(numberElement);
        });
    }

    isBetWon(type, value, winningNumber) {
        switch (type) {
            case 'number':
                return parseInt(value) === winningNumber;
            case 'red':
                return this.getNumberColor(winningNumber) === 'red';
            case 'black':
                return this.getNumberColor(winningNumber) === 'black';
            case 'even':
                return winningNumber % 2 === 0 && winningNumber !== 0;
            case 'odd':
                return winningNumber % 2 === 1;
            case 'low':
                return winningNumber >= 1 && winningNumber <= 18;
            case 'high':
                return winningNumber >= 19 && winningNumber <= 36;
            case 'first12':
                return winningNumber >= 1 && winningNumber <= 12;
            case 'second12':
                return winningNumber >= 13 && winningNumber <= 24;
            case 'third12':
                return winningNumber >= 25 && winningNumber <= 36;
                case 'column1':
                    return winningNumber % 3 === 1;
                case 'column2':
                    return winningNumber % 3 === 2;
                case 'column3':
                    return winningNumber % 3 === 0 && winningNumber !== 0;
                default:
                    return false;
            }
        }
    
        getPayoutMultiplier(type) {
            switch (type) {
                case 'number':
                    return 35;
                case 'red':
                case 'black':
                case 'even':
                case 'odd':
                case 'low':
                case 'high':
                    return 1;
                case 'first12':
                case 'second12':
                case 'third12':
                case 'column1':
                case 'column2':
                case 'column3':
                    return 2;
                default:
                    return 0;
            }
        }
    
        updateUI() {
            document.getElementById('balance').textContent = `Balance: $${this.balance}`;
            document.getElementById('bet').textContent = `Current Bet: $${this.currentBet}`;
            
            const betChips = document.getElementById('bet-chips');
            betChips.innerHTML = '';
            for (const [bet, amount] of this.bets) {
                const betChip = document.createElement('div');
                betChip.textContent = `${bet}: $${amount}`;
                betChips.appendChild(betChip);
            }
        }
    
        showMessage(msg) {
            const messageElement = document.getElementById('message');
            messageElement.textContent = msg;
            messageElement.classList.add('fade-in');
            setTimeout(() => messageElement.classList.remove('fade-in'), 500);
        }
    
        newGame() {
            if (this.isSpinning) {
                this.showMessage("Cannot start a new game while wheel is spinning");
                return;
            }
            this.balance = 1000;
            this.currentBet = 0;
            this.bets.clear();
            this.recentNumbers = [];
            this.updateUI();
            this.showMessage("New game started. Place your bets!");
            this.clearBettingBoard();
            document.getElementById('winning-number').textContent = '';
            document.getElementById('recent-numbers').innerHTML = '';
        }
    
        changeTheme() {
            this.currentTheme = (this.currentTheme + 1) % this.themes.length;
            document.body.className = this.themes[this.currentTheme];
        }
    
        toggleSound() {
            this.soundEnabled = !this.soundEnabled;
            this.showMessage(this.soundEnabled ? "Sound enabled" : "Sound disabled");
            document.getElementById('toggle-sound').textContent = this.soundEnabled ? "Mute Sound" : "Enable Sound";
        }
    
        playSound(soundName) {
            if (this.soundEnabled && this.sounds[soundName]) {
                this.sounds[soundName].currentTime = 0; // Reset the audio to start
                this.sounds[soundName].play();
            }
        }
    
        toggleOddsInfo() {
            const oddsInfo = document.getElementById('odds-info');
            oddsInfo.classList.toggle('hidden');
        }
    
        addEventListeners() {
            document.getElementById('spin').addEventListener('click', () => this.spin());
            document.getElementById('clear-bet').addEventListener('click', () => this.clearBet());
            document.getElementById('new-game').addEventListener('click', () => this.newGame());
            document.getElementById('change-theme').addEventListener('click', () => this.changeTheme());
            document.getElementById('toggle-sound').addEventListener('click', () => this.toggleSound());
            document.getElementById('show-odds').addEventListener('click', () => this.toggleOddsInfo());
        }
    }
    
    // Initialize the game
    const game = new RouletteGame(1000);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.key === 's' && !game.isSpinning) {
            game.spin();
        } else if (event.key === 'c' && !game.isSpinning) {
            game.clearBet();
        } else if (event.key === 'n' && !game.isSpinning) {
            game.newGame();
        }
    });