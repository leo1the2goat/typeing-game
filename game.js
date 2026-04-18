const WORD_LIST = [
    "stabilize", "coolant", "plasma", "manifold", "flux", "reactor", "thrust", "vent", 
    "purge", "align", "calibrate", "override", "bypass", "engage", "shield", "hull",
    "breach", "seal", "containment", "velocity", "vector", "orbit", "docking", "airlock",
    "oxygen", "telemetry", "nav", "gyro", "capacitor", "matrix", "fusion", "quantum"
];

// UI Elements
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const levelEl = document.getElementById('level');
const gravityScoreEl = document.getElementById('gravity-score');
const coreBarFill = document.getElementById('core-bar-fill');
const coreContainer = document.getElementById('core-container');
const wordsContainer = document.getElementById('words-container');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalWpmEl = document.getElementById('final-wpm');
const finalAccuracyEl = document.getElementById('final-accuracy');
const typingFeedbackEl = document.getElementById('typing-feedback');

// Game State
let gameState = 'start'; // start, playing, gameover
let words = [];
let activeWordObj = null;
let gravityScore = 100;
let keysTypedCount = 0;
let correctKeysCount = 0;
let wordsCompleted = 0;
let startTime = 0;
let lastSpawnTime = 0;
let lastGlitchTime = 0;
let animationFrameId;

// Levels Config
const LEVELS = [
    { name: 'FLICKER', duration: 30000, speedMultiplier: 1, spawnInterval: 2500, glitch: false },
    { name: 'SURGE', duration: 60000, speedMultiplier: 1.5, spawnInterval: 2000, glitch: false },
    { name: 'CASCADE', duration: 90000, speedMultiplier: 2.2, spawnInterval: 1200, glitch: false },
    { name: 'FREEFALL', duration: Infinity, speedMultiplier: 3.0, spawnInterval: 800, glitch: true }
];

let currentLevelIndex = 0;

// Initialize
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

document.addEventListener('keydown', handleKeyPress);

function startGame() {
    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Reset state
    words.forEach(w => w.element.remove());
    words = [];
    wordsContainer.innerHTML = '';
    activeWordObj = null;
    gravityScore = 100;
    keysTypedCount = 0;
    correctKeysCount = 0;
    wordsCompleted = 0;
    currentLevelIndex = 0;
    startTime = performance.now();
    lastSpawnTime = startTime;
    typingFeedbackEl.innerText = '';
    levelEl.innerText = LEVELS[currentLevelIndex].name;
    
    updateUI();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameover';
    cancelAnimationFrame(animationFrameId);
    gameOverScreen.classList.remove('hidden');
    finalWpmEl.innerText = calculateWPM();
    finalAccuracyEl.innerText = calculateAccuracy();
}

function gameLoop(timestamp) {
    if (gameState !== 'playing') return;
    
    const elapsedTime = timestamp - startTime;
    
    // Level management
    if (currentLevelIndex < LEVELS.length - 1 && elapsedTime > LEVELS[currentLevelIndex].duration) {
        currentLevelIndex++;
        levelEl.innerText = LEVELS[currentLevelIndex].name;
    }
    
    const level = LEVELS[currentLevelIndex];
    
    // Spawning words
    if (timestamp - lastSpawnTime > level.spawnInterval) {
        spawnWord();
        lastSpawnTime = timestamp;
    }
    
    // Glitch effect for Freefall
    if (level.glitch && timestamp - lastGlitchTime > 2000) {
        applyGlitchEffect();
        lastGlitchTime = timestamp;
    }
    
    // Move words
    const containerHeight = wordsContainer.clientHeight;
    // Base speed: pixels per ms
    const baseSpeed = 0.05;
    const speed = baseSpeed * level.speedMultiplier;
    
    for (let i = words.length - 1; i >= 0; i--) {
        const wObj = words[i];
        // Move word up
        wObj.y -= speed * 16; // Approx 16ms per frame
        wObj.element.style.transform = `translate(${wObj.x}px, ${wObj.y}px)`;
        
        // Check collision with top
        if (wObj.y < -30) {
            missWord(wObj, i);
        }
    }
    
    // Update stats periodically
    if (Math.floor(elapsedTime) % 500 < 20) {
        wpmEl.innerText = calculateWPM();
        accuracyEl.innerText = calculateAccuracy();
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function spawnWord() {
    const wordText = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const el = document.createElement('div');
    el.className = 'word';
    
    // Wrap each letter in a span
    let html = '';
    for(let i=0; i<wordText.length; i++){
        html += `<span>${wordText[i]}</span>`;
    }
    el.innerHTML = html;
    
    wordsContainer.appendChild(el);
    
    const containerWidth = wordsContainer.clientWidth;
    // Random X position, keeping word inside screen
    const wordWidth = wordText.length * 15; // approximate width
    const x = Math.random() * (containerWidth - wordWidth - 40) + 20;
    const y = wordsContainer.clientHeight;
    
    el.style.transform = `translate(${x}px, ${y}px)`;
    
    words.push({
        text: wordText,
        element: el,
        x: x,
        y: y,
        typedIndex: 0
    });
}

function applyGlitchEffect() {
    words.forEach(wObj => {
        // Scramble an untyped letter occasionally
        if (wObj.typedIndex < wObj.text.length && Math.random() > 0.5) {
            const untypedLen = wObj.text.length - wObj.typedIndex;
            const scrambleIdx = wObj.typedIndex + Math.floor(Math.random() * untypedLen);
            
            // Generate random char
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
            const randomChar = chars[Math.floor(Math.random() * chars.length)].toLowerCase();
            
            // We temporarily show the random char in the DOM, but keep the real text in wObj.text
            const spans = wObj.element.querySelectorAll('span');
            const originalChar = wObj.text[scrambleIdx];
            
            spans[scrambleIdx].innerText = randomChar;
            spans[scrambleIdx].style.color = 'var(--neon-red)';
            wObj.element.classList.add('glitch');
            
            setTimeout(() => {
                if(wObj.element && spans[scrambleIdx]) {
                    spans[scrambleIdx].innerText = originalChar;
                    spans[scrambleIdx].style.color = '';
                    wObj.element.classList.remove('glitch');
                }
            }, 300);
        }
    });
}

function missWord(wObj, index) {
    wObj.element.remove();
    words.splice(index, 1);
    
    if (activeWordObj === wObj) {
        activeWordObj = null;
        typingFeedbackEl.innerText = '';
    }
    
    // Core damage
    const damage = LEVELS[currentLevelIndex].name === 'FREEFALL' ? 15 : 10;
    gravityScore = Math.max(0, gravityScore - damage);
    updateUI();
    
    // Flash screen/core
    coreContainer.classList.add('danger');
    setTimeout(() => {
        if(gravityScore > 20) coreContainer.classList.remove('danger');
    }, 500);
    
    if (gravityScore === 0) {
        gameOver();
    }
}

function handleKeyPress(e) {
    if (gameState !== 'playing') return;
    
    // Ignore meta keys
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    
    const key = e.key.toLowerCase();
    keysTypedCount++;
    
    if (activeWordObj) {
        // Continue typing active word
        const expectedChar = activeWordObj.text[activeWordObj.typedIndex].toLowerCase();
        
        if (key === expectedChar) {
            correctKeysCount++;
            advanceWord(activeWordObj);
        } else {
            // Wrong key
            gravityScore = Math.max(0, gravityScore - 1);
            updateUI();
            if (gravityScore === 0) gameOver();
            
            // Visual shake
            activeWordObj.element.style.color = 'var(--neon-red)';
            setTimeout(()=> {
                if(activeWordObj && activeWordObj.element) activeWordObj.element.style.color = '';
            }, 100);
        }
    } else {
        // Look for a new word to start
        const possibleWords = words.filter(w => w.typedIndex === 0 && w.text[0].toLowerCase() === key);
        
        if (possibleWords.length > 0) {
            correctKeysCount++;
            // If multiple, pick the lowest one (highest y)
            possibleWords.sort((a, b) => a.y - b.y);
            activeWordObj = possibleWords[0];
            activeWordObj.element.classList.add('active');
            advanceWord(activeWordObj);
        } else {
             // Wrong key, no word started
            gravityScore = Math.max(0, gravityScore - 1);
            updateUI();
            if (gravityScore === 0) gameOver();
        }
    }
}

function advanceWord(wObj) {
    const spans = wObj.element.querySelectorAll('span');
    spans[wObj.typedIndex].classList.add('typed');
    wObj.typedIndex++;
    
    typingFeedbackEl.innerText = wObj.text.substring(0, wObj.typedIndex);
    
    if (wObj.typedIndex === wObj.text.length) {
        // Word completed
        wObj.element.remove();
        words.splice(words.indexOf(wObj), 1);
        activeWordObj = null;
        wordsCompleted++;
        typingFeedbackEl.innerText = '';
        
        // Small gravity restore
        gravityScore = Math.min(100, gravityScore + 2);
        updateUI();
    }
}

function calculateWPM() {
    const elapsedMinutes = (performance.now() - startTime) / 60000;
    if (elapsedMinutes === 0) return 0;
    return Math.round((correctKeysCount / 5) / elapsedMinutes);
}

function calculateAccuracy() {
    if (keysTypedCount === 0) return 100;
    return Math.round((correctKeysCount / keysTypedCount) * 100);
}

function updateUI() {
    gravityScoreEl.innerText = Math.round(gravityScore);
    coreBarFill.style.width = `${gravityScore}%`;
    
    if (gravityScore <= 20) {
        coreContainer.classList.add('danger');
    } else {
        coreContainer.classList.remove('danger');
    }
}
