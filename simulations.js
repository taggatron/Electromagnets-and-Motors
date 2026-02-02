// --- Simulation 1: Electromagnet ---
const sketch1 = (p) => {
    let currentSlider, turnsSlider, coreToggle;
    let hasCore = true; // Default
    let paperclips = [];

    p.setup = () => {
        let canvas = p.createCanvas(p.select('#canvas1').width, p.select('#canvas1').height);
        currentSlider = p.select('#sim1-current');
        turnsSlider = p.select('#sim1-turns');
        coreToggle = p.select('#sim1-core-toggle');
        
        // Ensure UI matches state
        updateToggleUI();

        if (coreToggle) {
            coreToggle.mousePressed(() => {
                hasCore = !hasCore;
                updateToggleUI();
            });
        }
        
        // Initialize paperclips
        for(let i=0; i<15; i++) {
            paperclips.push({
                x: p.random(100, p.width-100),
                y: p.height - 20,
                angle: p.random(p.TWO_PI),
                captured: false
            });
        }
    };

    function updateToggleUI() {
        const bg = p.select('#core-toggle-bg');
        const dot = p.select('#core-toggle-dot');
        if (hasCore) {
            bg.style('background-color', '#10b981'); // emerald-500
            dot.style('transform', 'translateX(1.25rem)');
        } else {
            bg.style('background-color', '#1e293b'); // slate-800
            dot.style('transform', 'translateX(0)');
        }
    }

    p.draw = () => {
        p.background(241, 245, 249); // light gray
        
        let current = parseInt(currentSlider.value());
        let turns = parseInt(turnsSlider.value());
        
        // Calculate Magnetic Strength (arbitrary units)
        // With core: Divide by 500 (Existing logic for reasonable max)
        // Without core: Divide by 2000 (Much weaker)
        let strength = hasCore ? (current * turns) / 500 : (current * turns) / 2500; 

        // Draw Core (or Air Core placeholder)
        p.noStroke();
        p.rectMode(p.CENTER);
        if (hasCore) {
            p.fill(100); // Iron gray
        } else {
            p.fill(220); // Light air/plastic holder
            p.stroke(200);
            p.strokeWeight(1);
        }
        p.rect(p.width/2, p.height/2 - 50, 200, 40, 5);

        // Draw Field Lines (opacity based on strength)
        p.noFill();
        // Scale opacity so lines are visible but faint if weak
        let opacity = hasCore ? p.map(strength, 0, 4, 0, 255) : p.map(strength, 0, 0.8, 0, 150);
        
        p.stroke(100, 116, 139, opacity);
        p.strokeWeight(2);
        for(let i=1; i<=3; i++) {
            p.arc(p.width/2, p.height/2 - 50, 220 + i*40, 100 + i*60, p.PI, 0);
            p.arc(p.width/2, p.height/2 - 50, 220 + i*40, 100 + i*60, 0, p.PI);
        }
        
        // --- Draw Wires & Current Arrows ---
        let wireY = p.height/2 + 50; 
        
        // Wires
        p.stroke(50);
        p.strokeWeight(3);
        p.noFill();
        // Left Wire (In)
        p.line(0, p.height, p.width/2 - 90, p.height/2 - 50); 
        // Right Wire (Out)
        p.line(p.width, p.height, p.width/2 + 90, p.height/2 - 50);

        // Current Arrows (Animated)
        if (current > 5) {
            p.fill(255, 0, 0);
            p.noStroke();
            let arrowPos = (p.frameCount % 60) / 60; // 0 to 1 loop
            
            // Left Wire Arrow (Going Up/In)
            let x1 = p.lerp(0, p.width/2 - 90, arrowPos);
            let y1 = p.lerp(p.height, p.height/2 - 50, arrowPos);
            drawArrowHead(p, x1, y1, Math.atan2((p.height/2 - 50) - p.height, (p.width/2 - 90) - 0));

            // Right Wire Arrow (Going Down/Out)
            let x2 = p.lerp(p.width/2 + 90, p.width, arrowPos);
            let y2 = p.lerp(p.height/2 - 50, p.height, arrowPos);
            drawArrowHead(p, x2, y2, Math.atan2(p.height - (p.height/2 - 50), p.width - (p.width/2 + 90)));
        }
        // -----------------------------

        // Draw Coils
        p.strokeWeight(4);
        // Color shifts from copper to bright yellow based on current
        let c = p.lerpColor(p.color(184, 115, 51), p.color(255, 255, 0), current/100);
        p.stroke(c);
        p.noFill();

        let startX = p.width/2 - 90;
        let endX = p.width/2 + 90;
        let spacing = (endX - startX) / turns;

        for(let i=0; i < turns; i++) {
            let x = startX + i * spacing;
            // Draw front part of coil
            p.arc(x + spacing/2, p.height/2 - 50, spacing, 50, 0, p.PI);
            // Back part simplified
            p.line(x + spacing/2, p.height/2 - 25, x + spacing * 1.5, p.height/2 - 75); 
        }

        // Draw Paperclips
        p.stroke(80);
        p.strokeWeight(2);
        p.noFill();

        paperclips.forEach(clip => {
            // Threshold logic needs to adjust for much lower strength without core
            // But realistically, without iron core, it shouldn't pick up much unless HUGE current.
            // Let's keep the threshold fixed at 2.0 T for pickup.
            // Without core, max strength is (100*50)/2500 = 2.0 T. So barely picks up at max.
            
            if (strength > 2 && !clip.captured) {
                // Fly towards magnet
                clip.y = p.lerp(clip.y, p.height/2, 0.1);
                clip.x = p.lerp(clip.x, p.width/2 + p.random(-50, 50), 0.1);
                if (p.abs(clip.y - p.height/2) < 5) clip.captured = true;
            } else if (strength <= 2 && clip.captured) {
                // Drop
                clip.y = p.lerp(clip.y, p.height - 20, 0.1);
                if (p.abs(clip.y - (p.height - 20)) < 5) clip.captured = false;
            }

            p.push();
            p.translate(clip.x, clip.y);
            p.rotate(clip.angle);
            p.rect(0, 0, 15, 5, 2);
            p.pop();
        });
        
        // Info text
        p.fill(50);
        p.noStroke();
        p.textAlign(p.CENTER);
        p.text(`Field Strength: ${strength.toFixed(2)} T`, p.width/2, p.height - 50);
        p.text(hasCore ? "Iron Core" : "Air Core", p.width/2, p.height - 30);
    };

    function drawArrowHead(p, x, y, angle) {
        p.push();
        p.translate(x, y);
        p.rotate(angle);
        p.fill(255, 0, 0); // Red arrow
        p.noStroke();
        p.triangle(0, 0, -10, -5, -10, 5);
        p.pop();
    }

    p.windowResized = () => {
        p.resizeCanvas(p.select('#canvas1').width, p.select('#canvas1').height);
    };
};
new p5(sketch1, 'canvas1');


// --- Simulation 2: Motor Effect ---
const sketch2 = (p) => {
    let currentDirection = 1; // 1 = away, -1 = towards
    let fieldDirection = 1;   // 1 = N->S (Left to Right), -1 = S->N
    let wireY;

    p.setup = () => {
        p.createCanvas(p.select('#canvas2').width, p.select('#canvas2').height);
        wireY = p.height/2;

        p.select('#sim2-toggle-current').mousePressed(() => currentDirection *= -1);
        p.select('#sim2-toggle-field').mousePressed(() => fieldDirection *= -1);
    };

    p.draw = () => {
        p.background(241, 245, 249);
        
        // Draw Magnets
        p.noStroke();
        // Left Pole
        p.fill(fieldDirection === 1 ? '#ef4444' : '#3b82f6'); // Red(N) or Blue(S)
        p.rect(0, 50, 80, p.height-100);
        p.fill(255);
        p.textSize(32);
        p.text(fieldDirection === 1 ? 'N' : 'S', 30, p.height/2);

        // Right Pole
        p.fill(fieldDirection === 1 ? '#3b82f6' : '#ef4444'); 
        p.rect(p.width-80, 50, 80, p.height-100);
        p.fill(255);
        p.text(fieldDirection === 1 ? 'S' : 'N', p.width-50, p.height/2);

        // Magnetic Field Lines
        p.stroke(150);
        p.strokeWeight(1);
        for(let y=100; y<p.height-100; y+=40) {
            drawArrow(p, 85, y, p.width-85, y, fieldDirection);
        }

        // Calculate Force Direction (Left Hand Rule)
        // Force = Current x Field
        // We need a coordinate system. 
        // Let's say: Right is +X, Up is -Y, Into screen is +Z.
        // Screen View:
        // Field: +/- X
        // Current: +/- Z (Into/Out of screen)
        // Force: +/- Y (Up/Down)

        // If Field is RIGHT (+1) and Current is INTO (+1) -> Force is DOWN (+1 in screen Y)
        // Check FLHR: Index(Right), Second(Into), Thumb(Down). Correct.
        let forceDir = fieldDirection * currentDirection; 

        // Animate Wire
        let targetY = p.height/2 + (forceDir * 80);
        wireY = p.lerp(wireY, targetY, 0.1);

        // Draw Wire (Cross section)
        p.fill('#f59e0b');
        p.stroke(0);
        p.strokeWeight(2);
        p.ellipse(p.width/2, wireY, 60, 60);

        // Draw Current Symbol
        p.stroke(0);
        p.strokeWeight(4);
        if (currentDirection === 1) {
            // Cross (Into page)
            p.line(p.width/2 - 15, wireY - 15, p.width/2 + 15, wireY + 15);
            p.line(p.width/2 + 15, wireY - 15, p.width/2 - 15, wireY + 15);
        } else {
            // Dot (Out of page)
            p.fill(0);
            p.ellipse(p.width/2, wireY, 15, 15);
        }

        // Draw Labels / Hands hint could go here
        drawHandHint(p, 100, p.height-50, "Left Hand Rule", fieldDirection, currentDirection, forceDir);
    };

    function drawArrow(p, x1, y1, x2, y2, dir) {
        if (dir === -1) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
        p.line(x1, y1, x2, y2);
        p.push();
        p.translate(x2, y2);
        p.rotate(Math.atan2(y2-y1, x2-x1));
        p.line(0, 0, -10, -5);
        p.line(0, 0, -10, 5);
        p.pop();
    }

    function drawHandHint(p, x, y, title, fDir, cDir, mDir) {
        p.push();
        p.translate(x, y);
        p.fill(50);
        p.noStroke();
        p.textSize(12);
        p.textAlign(p.LEFT);
        p.text(title, 0, -5);
        
        let gap = 15;
        // Icons for F, B, I
        p.text(`Field (Index): ${fDir>0 ? '⮕' : '⬅'}`, 0, gap);
        p.text(`Current (SeCond): ${cDir>0 ? '☒ (Into)' : '⊙ (Out)'}`, 0, gap*2);
        p.text(`Force (Thumb): ${mDir>0 ? '⬇' : '⬆'}`, 0, gap*3);
        p.pop();
    }
};
new p5(sketch2, 'canvas2');


// --- Simulation 3: Generator Effect ---
const sketch3 = (p) => {
    let wireY; 
    let velocity = 0;
    let isDragging = false;
    let inducedCurrent = 0; // 0=none, 1=into, -1=out

    p.setup = () => {
        p.createCanvas(p.select('#canvas3').width, p.select('#canvas3').height);
        wireY = p.height/2;
    };

    p.draw = () => {
        p.background(241, 245, 249);
        
        // Magnets (Fixed N -> S for simplicity)
        p.noStroke();
        p.fill('#ef4444'); p.rect(0, 50, 80, p.height-100); // N
        p.fill(255); p.text('N', 30, p.height/2);
        p.fill('#3b82f6'); p.rect(p.width-80, 50, 80, p.height-100); // S
        p.fill(255); p.text('S', p.width-50, p.height/2);

        // Field Lines
        p.stroke(150);
        for(let y=100; y<p.height-100; y+=40) {
            p.line(85, y, p.width-85, y);
            p.line(p.width/2, y, p.width/2+10, y-5); // simple arrow head
        }

        // Handle Drag Interaction
        let targetY = wireY;
        if (p.mouseIsPressed && p.mouseX > 80 && p.mouseX < p.width-80 && p.mouseY > 50 && p.mouseY < p.height-50) {
            targetY = p.mouseY;
            isDragging = true;
        } else {
            isDragging = false;
            // Return to center slowly
            targetY = p.lerp(wireY, p.height/2, 0.05);
        }

        // Calculate Velocity
        velocity = targetY - wireY;
        wireY = targetY;

        // Right Hand Rule Logic
        // Field: Right (+X)
        // Motion: Down (+Y) -> Thumb points Down
        // Index (Field) -> Right
        // Thumb (Motion) -> Down
        // Second (Current) -> Points OUT of page (-Z)
        
        // Wait, standard RHR: index=field, thumb=motion, middle=current
        // Field (Index) = East
        // Motion (Thumb) = South (Screen Down)
        // Palm faces West. Middle finger points... towards viewer (Out). 
        
        // Velocity > 0 (Down) -> Current Out (Dot)
        // Velocity < 0 (Up) -> Current Into (Cross)
        
        // Only show if moving fast enough
        if (Math.abs(velocity) > 1) {
            inducedCurrent = velocity > 0 ? -1 : 1;
        } else {
            inducedCurrent = 0;
        }

        // Draw Wire
        p.fill('#f59e0b');
        p.stroke(0);
        p.strokeWeight(2);
        p.ellipse(p.width/2, wireY, 60, 60);

        // Draw Induced Current
        p.stroke(0);
        p.strokeWeight(4);
        if (inducedCurrent === 1) { // Into
            p.line(p.width/2 - 15, wireY - 15, p.width/2 + 15, wireY + 15);
            p.line(p.width/2 + 15, wireY - 15, p.width/2 - 15, wireY + 15);
             p.fill(0); p.noStroke(); p.textSize(14); p.text("INDUCED", p.width/2-30, wireY-40);
        } else if (inducedCurrent === -1) { // Out
            p.fill(0);
            p.ellipse(p.width/2, wireY, 15, 15);
            p.fill(0); p.noStroke(); p.textSize(14); p.text("INDUCED", p.width/2-30, wireY-40);
        }

        // Instructions
         p.fill(50);
         p.noStroke();
         p.textSize(12);
         if (!isDragging) p.text("Grab the wire and move it up/down!", p.width/2 - 60, p.height - 20);
    };
};
new p5(sketch3, 'canvas3');