const questions = [
    {
        id: 1,
        title: "Junkyard Magnet",
        description: "We need to lift a 2-ton car. The electromagnet needs a field strength of at least <strong>3.0 T</strong>. Setting the current too high (>80A) will fuse the circuits!",
        type: "simulation_slider",
        targetStrength: 3.0,
        maxCurrent: 80,
        setup: (container) => {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-slate-900 p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden h-72">
                         <!-- SVG Simulation -->
                         <svg viewBox="0 0 200 200" class="w-full h-full absolute inset-0 z-0">
                            <!-- Background -->
                            <rect width="200" height="200" fill="#0f172a" />
                            
                            <!-- Crane Cable -->
                            <line x1="100" y1="0" x2="100" y2="40" stroke="#475569" stroke-width="4" />
                            
                            <!-- Magnet Core -->
                             <rect x="60" y="40" width="80" height="20" fill="#334155" />
                             
                             <!-- Coils Container -->
                             <g id="coil-group" stroke="#fb923c" stroke-width="2" fill="none"></g>

                            <!-- Field Lines (Animated opacity) -->
                            <g id="field-lines" stroke="#10b981" stroke-width="1" opacity="0" fill="none">
                                <path d="M70 60 Q 60 100 70 140" />
                                <path d="M130 60 Q 140 100 130 140" />
                                <path d="M80 60 Q 75 100 85 140" />
                                <path d="M120 60 Q 125 100 115 140" />
                            </g>

                            <!-- Car -->
                            <g id="junk-car" transform="translate(100, 160)">
                                 <!-- Car Body -->
                                 <path d="M-40 0 L-40 -15 L-20 -25 L20 -25 L40 -15 L40 0 Z" fill="#64748b" />
                                 <rect x="-35" y="0" width="70" height="15" fill="#64748b" />
                                 <!-- Wheels -->
                                 <circle cx="-25" cy="15" r="8" fill="#1e293b" />
                                 <circle cx="25" cy="15" r="8" fill="#1e293b" />
                            </g>
                         </svg>

                         <!-- Overlay Display -->
                        <div class="z-10 bg-slate-800/80 px-4 py-2 rounded backdrop-blur-sm border border-slate-700 mt-[-100px]">
                            <div class="text-3xl font-mono text-emerald-400" id="strength-display">0.0 T</div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="flex justify-between text-sm font-bold">Current (<span id="val-c">0</span> A)</label>
                            <input type="range" min="0" max="100" value="0" class="w-full accent-indigo-500" id="game-current">
                        </div>
                        <div>
                            <label class="flex justify-between text-sm font-bold">Turns (<span id="val-t">10</span>)</label>
                            <input type="range" min="10" max="50" value="10" class="w-full accent-indigo-500" id="game-turns">
                        </div>
                        <button onclick="checkLevel1()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition">ACTIVATE MAGNET</button>
                    </div>
                </div>
                <div id="game-feedback" class="mt-4 text-center font-bold h-6"></div>
            `;
            
            const update = () => {
                const c = parseInt(document.getElementById('game-current').value);
                const t = parseInt(document.getElementById('game-turns').value);
                document.getElementById('val-c').innerText = c;
                document.getElementById('val-t').innerText = t;
                const strength = (c * t) / 1000;
                document.getElementById('strength-display').innerText = strength.toFixed(1) + " T";

                 // Update SVG Visualization
                const coilGroup = document.getElementById('coil-group');
                if(coilGroup) {
                    coilGroup.innerHTML = '';
                    const visTurns = 5 + Math.floor(t / 5); 
                    for(let i=0; i<visTurns; i++) {
                        let y = 40 + (20/visTurns)*i;
                        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", "60"); line.setAttribute("y1", y+2);
                        line.setAttribute("x2", "140"); line.setAttribute("y2", y+2);
                        let warmColor = `rgb(${150 + c}, ${100 + c/2}, 50)`;
                        line.setAttribute("stroke", warmColor);
                        coilGroup.appendChild(line);
                    }
                }

                const fieldLines = document.getElementById('field-lines');
                if(fieldLines) {
                     const opacity = Math.min(strength / 4.0, 1.0);
                     fieldLines.setAttribute('opacity', opacity);
                }
            };
            
            document.getElementById('game-current').addEventListener('input', update);
            document.getElementById('game-turns').addEventListener('input', update);
            update();
        }
    },
    {
        id: 2,
        title: "Motor Wire Repair",
        description: "A wire is in a magnetic field pointing <strong>RIGHT (N to S)</strong>. We need the wire to feel a force <strong>UPWARDS</strong>. According to Fleming's Left Hand Rule, which way should the current flow?",
        type: "choice",
        options: [
            { text: "INTO the page (Cross)", correct: true }, // Field Right, Current In -> Force Down? Wait. Index Right, Middle In -> Thumb Down. 
            // Correct: Force UP. Index Right. Thumb Up. Middle must be OUT.
            // Let's re-verify. 
            // Left Hand: 
            // Index (Field) = Right.
            // Thumb (Force) = Up.
            // Middle (Current) sticks out towards me? 
            // Let's rotate hand. Index Right. Thumb Up. Middle points OUT of page.
            // So "Out of Page" is correct.
            { text: "OUT of the page (Dot)", correct: true }, 
            { text: "INTO the page (Cross)", correct: false }
        ],
        setup: (container) => {
            container.innerHTML = `
                <div class="flex flex-col items-center space-y-6">
                    <div class="relative w-64 h-40 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden border border-slate-600">
                        <div class="absolute inset-0 flex items-center justify-between px-4 opacity-50">
                            <span class="text-4xl font-bold text-red-400">N</span>
                            <div class="h-1 bg-slate-400 w-full mx-4 relative">
                                <div class="absolute right-0 -top-1.5 transform rotate-45 border-r-2 border-t-2 border-slate-400 w-3 h-3"></div>
                            </div>
                            <span class="text-4xl font-bold text-blue-400">S</span>
                        </div>
                        <div class="z-10 bg-yellow-500 w-4 h-full"></div>
                        <div class="absolute top-4 font-bold text-white text-shadow animate-bounce">FORCE NEEDED: UP ⬆</div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 w-full">
                        <button onclick="checkLevel2(false)" class="bg-slate-700 hover:bg-slate-600 p-6 rounded-xl border border-slate-600 transition group">
                            <div class="text-4xl mb-2 group-hover:scale-110 transition">☒</div>
                            <div class="font-bold">INTO Page</div>
                        </button>
                        <button onclick="checkLevel2(true)" class="bg-slate-700 hover:bg-slate-600 p-6 rounded-xl border border-slate-600 transition group">
                            <div class="text-4xl mb-2 group-hover:scale-110 transition">⊙</div>
                            <div class="font-bold">OUT of Page</div>
                        </button>
                    </div>
                    <div id="game-feedback" class="mt-4 text-center font-bold h-6"></div>
                </div>
            `;
        }
    },
    {
        id: 3,
        title: "Generator Emergency",
        description: "The main power is out! You see a wire in a field pointing <strong>RIGHT (N to S)</strong>. To generate current flowing <strong>INTO (Cross)</strong> the page, which way must you move the wire?",
        type: "choice",
        setup: (container) => {
             container.innerHTML = `
                <div class="flex flex-col items-center space-y-6">
                     <div class="relative w-64 h-40 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden border border-slate-600">
                        <div class="absolute inset-0 flex items-center justify-between px-4 opacity-50">
                            <span class="text-4xl font-bold text-red-400">N</span>
                            <div class="h-1 bg-slate-400 w-full mx-4 relative"></div>
                            <span class="text-4xl font-bold text-blue-400">S</span>
                        </div>
                        <div class="z-10 bg-yellow-500 rounded-full w-12 h-12 flex items-center justify-center text-4xl font-bold text-black border-4 border-black">
                            ✕
                        </div>
                    </div>
                    <p class="text-sm text-slate-400">Use Fleming's <strong>Right</strong> Hand Rule!</p>
                    <div class="grid grid-cols-2 gap-4 w-full">
                        <button onclick="checkLevel3('UP')" class="bg-slate-700 hover:bg-slate-600 p-6 rounded-xl border border-slate-600 transition font-bold">
                            MOVE UP ⬆
                        </button>
                        <button onclick="checkLevel3('DOWN')" class="bg-slate-700 hover:bg-slate-600 p-6 rounded-xl border border-slate-600 transition font-bold">
                             MOVE DOWN ⬇
                        </button>
                    </div>
                    <div id="game-feedback" class="mt-4 text-center font-bold h-6"></div>
                </div>
            `;
        }
    }
];

let currentLevel = 0;
let score = 0;

function initGame() {
    currentLevel = 0;
    score = 0;
    loadLevel(0);
    updateScore();
}

function loadLevel(index) {
    const container = document.getElementById('game-container');
    container.innerHTML = ''; // clear
    
    if (index >= questions.length) {
        showVictory();
        return;
    }

    const q = questions[index];
    
    // Header
    const header = document.createElement('div');
    header.innerHTML = `
        <h3 class="text-xl font-bold text-indigo-300 mb-2">Level ${index + 1}: ${q.title}</h3>
        <p class="text-slate-300 mb-6">${q.description}</p>
    `;
    container.appendChild(header);

    // Interaction Area
    const interactionWrapper = document.createElement('div');
    container.appendChild(interactionWrapper);
    q.setup(interactionWrapper);
}

function updateScore() {
    const display = document.getElementById('score-display');
    const badge = document.getElementById('rank-badge');
    display.innerText = score;
    
    if (score < 100) badge.innerText = "Apprentice";
    else if (score < 250) badge.innerText = "Engineer";
    else badge.innerText = "Chief Scientist";
}

// --- Level Logic ---

window.checkLevel1 = () => {
    const c = parseInt(document.getElementById('game-current').value);
    const t = parseInt(document.getElementById('game-turns').value);
    const strength = (c * t) / 1000;
    const feedback = document.getElementById('game-feedback');
    const car = document.getElementById('junk-car');

    if (c > 80) {
        feedback.innerText = "WARNING: Circuit Overload! Reduce current!";
        feedback.className = "mt-4 text-center font-bold h-6 text-red-500";
        score = Math.max(0, score - 10);
        if(car) car.setAttribute("transform", "translate(100, 160)");
    } else if (strength >= 3.0) {
        feedback.innerText = "Success! Magnet engaged. Lifting car...";
        feedback.className = "mt-4 text-center font-bold h-6 text-emerald-500";
        score += 100;
        
        if (car) {
            let currentY = 160;
            const animateLift = () => {
                currentY -= 2;
                car.setAttribute("transform", `translate(100, ${currentY})`);
                if (currentY > 80) requestAnimationFrame(animateLift);
                else setTimeout(nextLevel, 800);
            };
            animateLift();
        } else {
            setTimeout(nextLevel, 1000);
        }
    } else {
        feedback.innerText = "Field too weak. Needs > 3.0 T";
        feedback.className = "mt-4 text-center font-bold h-6 text-yellow-500";
        if(car) car.setAttribute("transform", "translate(100, 160)");
    }
    updateScore();
};

window.checkLevel2 = (isOut) => {
    // Goal: Force UP. Field RIGHT.
    // LHR: Index Right, Thumb Up -> Middle must be OUT.
    const feedback = document.getElementById('game-feedback');
    if (isOut) {
        feedback.innerText = "Correct! Current OUT + Field RIGHT = Force UP.";
        feedback.className = "mt-4 text-center font-bold h-6 text-emerald-500";
        score += 100;
        setTimeout(nextLevel, 1000);
    } else {
        feedback.innerText = "Incorrect. Index=Right, Middle=Into -> Thumb=Down.";
        feedback.className = "mt-4 text-center font-bold h-6 text-red-500";
        score = Math.max(0, score - 20);
    }
    updateScore();
};

window.checkLevel3 = (dir) => {
    // Goal: Current INTO (Cross). Field RIGHT.
    // RHR: Index Right. Middle Into.
    // Thumb must point... UP.
    // Let's check: Index Right. Thumb Up. Middle points Into. Correct.
    
    const feedback = document.getElementById('game-feedback');
    if (dir === 'UP') {
        feedback.innerText = "Correct! Moving Up induces current Into page.";
        feedback.className = "mt-4 text-center font-bold h-6 text-emerald-500";
        score += 100;
        setTimeout(nextLevel, 1000);
    } else {
        feedback.innerText = "Incorrect. Moving Down triggers current Out.";
        feedback.className = "mt-4 text-center font-bold h-6 text-red-500";
        score = Math.max(0, score - 20);
    }
    updateScore();
};

function nextLevel() {
    currentLevel++;
    loadLevel(currentLevel);
    updateScore();
}

function showVictory() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
        <div class="text-center py-10">
            <h2 class="text-4xl font-bold text-emerald-400 mb-4">Assessment Complete!</h2>
            <p class="text-xl text-slate-300">Final Score: ${score}/300</p>
            <p class="text-lg text-indigo-300 mt-2">Rank: ${document.getElementById('rank-badge').innerText}</p>
            <button onclick="initGame()" class="mt-8 bg-white text-indigo-900 px-6 py-2 rounded-full font-bold hover:bg-indigo-50 transition">Restart</button>
        </div>
    `;
}