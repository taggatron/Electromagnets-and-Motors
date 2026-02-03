// --- Simulation Magnet: Bar Magnet & Filings ---
const sketchMagnet = (p) => {
    let filings = [];
    const magnetWidth = 120;
    const magnetHeight = 40;
    
    // Grid for uncovering field lines ("scratch card" effect)
    // Map<String "gx,gy", Number count>
    let revealedGrid = new Map();
    const GRID_SIZE = 20;

    // Toggle Button
    let linesVisible = true;
    let toggleBtn;

    // Virtual Shaker State
    let shaker = {
        x: 50,
        y: 50,
        width: 40,
        height: 60,
        dragging: false,
        tilt: 0
    };

    p.setup = () => {
        let parent = p.select('#canvas-magnet');
        // Ensure parent exists before size calculation
        let w = parent ? parent.width : 400;
        let h = parent ? parent.height : 300;
        let cnv = p.createCanvas(w, h);
        
        // Handle Resize
        window.addEventListener('resize', () => {
             if (parent) {
                p.resizeCanvas(parent.width, parent.height);
             }
        });

        // Set initial shaker pos
        shaker.x = w - 80;
        shaker.y = 80;

        // Clear btn
        const btn = p.select('#sim-magnet-clear');
        if (btn) btn.mousePressed(() => {
            filings = [];
            revealedGrid.clear();
            if(toggleBtn) toggleBtn.addClass('hidden');
        });

        // Toggle Lines Button logic
        toggleBtn = p.select('#sim-magnet-toggle-lines');
        if (toggleBtn) {
            toggleBtn.mousePressed(() => {
                linesVisible = !linesVisible;
                toggleBtn.html(linesVisible ? "Hide Field Lines" : "Show Field Lines");
            });
        }
    };

    p.draw = () => {
        p.clear(); // Transparent background

        // Magnet Center
        const cx = p.width / 2;
        const cy = p.height / 2;

        // 1. Draw Field Lines (Revealed by filings)
        // Only draw if toggled ON
        if (linesVisible) {
            drawFieldLines();
        }

        // Check if enough filings to show button
        // Threshold: e.g. 50 grid cells have at least 1 filing
        if (toggleBtn && toggleBtn.hasClass('hidden')) {
            if (revealedGrid.size > 25) { 
                toggleBtn.removeClass('hidden');
                // Ensure text is correct if logic reset
                toggleBtn.html(linesVisible ? "Hide Field Lines" : "Show Field Lines");
            }
        }

        // 2. Draw Magnet
        p.push();
        p.translate(cx, cy);
        p.noStroke();
        // South Pole (Blue) - Right
        p.fill(59, 130, 246); // slate-500 ish / blue
        p.rect(0, -magnetHeight/2, magnetWidth/2, magnetHeight);
        
        // North Pole (Red) - Left
        p.fill(239, 68, 68); // red-500
        p.rect(-magnetWidth/2, -magnetHeight/2, magnetWidth/2, magnetHeight);
        
        // Labels
        p.fill(255);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(20);
        p.textStyle(p.BOLD);
        p.text("N", -magnetWidth/4, 0);
        p.text("S", magnetWidth/4, 0);
        p.pop();

        // 3. Draw Filings
        p.stroke(200);
        p.strokeWeight(1.5);
        for (let f of filings) {
            p.push();
            p.translate(f.x, f.y);
            p.rotate(f.angle);
            p.line(-3, 0, 3, 0); // Small filing line
            p.pop();
        }

        // 4. Draw Shaker (if not dragging, reset tilt)
        if (!shaker.dragging) {
            shaker.tilt = p.lerp(shaker.tilt, 0, 0.2);
        }
        
        drawShaker();

        // 5. Sprinkle logic
        if (shaker.dragging) {
            // Drag logic
            shaker.x = p.mouseX;
            shaker.y = p.mouseY;
            shaker.tilt = (p.mouseX - p.pmouseX) * 0.1; // Lean into movement
            
            // Spawn filings
            if (p.frameCount % 2 === 0) { // Rate limiter
                for(let i=0; i<3; i++) {
                    spawnFiling(shaker.x + p.random(-15, 15), shaker.y + 30);
                }
            }
        }
    };

    function calculateField(x, y) {
        const cx = p.width / 2;
        const cy = p.height / 2;
        const poleDist = magnetWidth * 0.4;
        const northX = cx - poleDist;
        const southX = cx + poleDist;

        // North Pole (Source)
        const rNx = x - northX;
        const rNy = y - cy;
        const distN = Math.hypot(rNx, rNy) || 1;
        
        // South Pole (Sink)
        const rSx = x - southX;
        const rSy = y - cy;
        const distS = Math.hypot(rSx, rSy) || 1;

        // Field Sum (1/r^2 magnitude, direction r_hat) -> vector / r^3
        const Bnx = rNx / Math.pow(distN, 3);
        const Bny = rNy / Math.pow(distN, 3);
        const Bsx = -rSx / Math.pow(distS, 3);
        const Bsy = -rSy / Math.pow(distS, 3);

        return { x: Bnx + Bsx, y: Bny + Bsy };
    }

    // Helper: Returns alpha/intensity (0-100) for a grid cell based on count
    // Uses 3x3 neighbor averaging for smoothness
    function getGridIntensity(x, y) {
        let gx = Math.floor(x / GRID_SIZE);
        let gy = Math.floor(y / GRID_SIZE);
        let validNeighbors = 0;
        let totalCount = 0;
        
        for(let i=-1; i<=1; i++){
            for(let j=-1; j<=1; j++){
                let key = `${gx+i},${gy+j}`;
                if(revealedGrid.has(key)) {
                    totalCount += revealedGrid.get(key);
                    validNeighbors++;
                }
            }
        }

        if (validNeighbors === 0) return 0;
        // require e.g. 15 filings total in neighborhood to fully show
        return Math.min(totalCount * 8, 100); 
    }

    function drawFieldLines() {
        p.noFill();
        p.strokeWeight(2);

        const cx = p.width / 2;
        const cy = p.height / 2;
        const poleDist = magnetWidth * 0.4;
        const northX = cx - poleDist;
        const southX = cx + poleDist;
        const stepSize = 10;
        
        // Seed Points
        let seeds = [];
        
        // 1. From North Pole (Integrating Forward)
        for(let a = -p.PI/2; a <= p.PI/2; a+=0.3) {
           seeds.push({x: northX - 10, y: cy + p.sin(a)*10, dir: 1});
        }
        // Top/Bottom lines
        for(let x = -magnetWidth/2; x <= magnetWidth/2; x+=15) {
             seeds.push({x: cx + x, y: cy - magnetHeight/2 - 5, dir: 1}); // Top
             seeds.push({x: cx + x, y: cy + magnetHeight/2 + 5, dir: 1}); // Bottom
        }
         // 2. From South Pole (Backward)
        for(let a = -p.PI/2; a <= p.PI/2; a+=0.3) {
            seeds.push({x: southX + 10, y: cy + p.sin(a)*10, dir: -1});
        }

        seeds.forEach(seed => {
            let currX = seed.x;
            let currY = seed.y;
            let drawing = false;

            let distAcc = 0; // Accumulator for arrows
            
            p.beginShape();
            for(let i=0; i<400; i++) { 
                let intensity = getGridIntensity(currX, currY);
                let alpha = p.map(intensity, 0, 100, 0, 60); // Max alpha 60

                if (intensity > 5) { // Minimum threshold to draw
                    if (!drawing) {
                        p.beginShape();
                        p.vertex(currX, currY);
                        drawing = true;
                    }
                    // Apply alpha - p5.js shape vertex colors!
                    // Note: stroke() inside beginShape usually acts globally or per vertex if using WEBGL, 
                    // but in 2D mode, it's tricky.
                    // Instead, we will break the line into small segments if we want variable alpha 
                    // or just use a uniform alpha based on a larger grid check.
                    // For performance, let's just stick to "if revealed, draw with constant alpha".
                    // But user wants "requires a few more passes".
                    // The 'alpha' calc above handles that logic.
                    // To do variable alpha in 2D P5, we must emit independent lines.
                } else {
                     if (drawing) {
                         p.vertex(currX, currY);
                         p.endShape();
                         drawing = false;
                     }
                }

                if (drawing) {
                    p.stroke(255, 255, 255, alpha); // This won't work inside beginShape for 2D. 
                    p.vertex(currX, currY);
                }

                // Physics Trace
                let B = calculateField(currX, currY);
                let mag = Math.hypot(B.x, B.y);
                if (mag === 0) break;
                
                let dx = (B.x / mag) * stepSize * seed.dir;
                let dy = (B.y / mag) * stepSize * seed.dir;

                // --- Arrow Drawing Logic ---
                distAcc += stepSize;
                if (drawing && distAcc > 50) { // Draw arrow every 50px
                    p.endShape(); // End current line segment
                    
                    // Draw precise arrow
                    p.push();
                    p.translate(currX, currY);
                    // Angle for arrow: Standard North->South.
                    // B vector is N->S.
                    // If seed.dir is 1 (Forward trace), we align with B.
                    // If seed.dir is -1 (Backward trace), we align against trace direction (align with B).
                    let arrowAngle = Math.atan2(B.y, B.x);
                    p.rotate(arrowAngle);
                    p.stroke(255, 255, 255, alpha); 
                    p.line(0, 0, -5, -3);
                    p.line(0, 0, -5, 3);
                    p.pop();

                    distAcc = 0;
                    p.beginShape(); // Resume line
                    p.vertex(currX + dx, currY + dy); // Gap fill
                }
                // ---------------------------
                
                currX += dx;
                currY += dy;

                if (currX < 0 || currX > p.width || currY < 0 || currY > p.height) {
                    if(drawing) p.endShape();
                    break;
                }
                if (Math.abs(currX - cx) < magnetWidth/2 && Math.abs(currY - cy) < magnetHeight/2) {
                    if(drawing) p.endShape();
                    break;
                }
            }
            if (drawing) p.endShape();
        });
    }

    function drawShaker() {
        p.push();
        p.translate(shaker.x, shaker.y);
        p.rotate(shaker.tilt);
        
        // Shaker Body
        p.fill(200); // Silver/Metal
        p.stroke(100);
        p.strokeWeight(2);
        // Cylinder shape approx
        p.rect(-15, -30, 30, 60, 5);
        
        // Cap
        p.fill(50); // Dark cap
        p.rect(-16, 20, 32, 10, 2);
        
        // Label
        p.noStroke();
        p.fill(100);
        p.textAlign(p.CENTER);
        p.textSize(20);
        p.text("Fe", 0, 5);
        
        p.pop();
    }

    function spawnFiling(x, y) {
        // Prevent drawing INSIDE magnet
        const cx = p.width / 2;
        const cy = p.height / 2;
        if (x > cx - magnetWidth/2 - 5 && x < cx + magnetWidth/2 + 5 && 
            y > cy - magnetHeight/2 - 5 && y < cy + magnetHeight/2 + 5) {
            return;
        }

        const field = calculateField(x, y);
        const angle = Math.atan2(field.y, field.x);

        filings.push({
            x: x,
            y: y,
            angle: angle
        });
        
        // Mark grid cell with count
        let gx = Math.floor(x / GRID_SIZE);
        let gy = Math.floor(y / GRID_SIZE);
        let key = `${gx},${gy}`;
        let count = (revealedGrid.get(key) || 0) + 1;
        revealedGrid.set(key, count);
        
        // Limit increased significantly to prevent disappearance
        if (filings.length > 5000) filings.shift();
    }

    p.mousePressed = () => {
        // Check if clicking shaker
        if (p.dist(p.mouseX, p.mouseY, shaker.x, shaker.y) < 40) {
            shaker.dragging = true;
        }
    };

    p.mouseReleased = () => {
        shaker.dragging = false;
    };
};
new p5(sketchMagnet, 'canvas-magnet');

// --- Simulation 0: Magnetic Field (Straight Wire) ---
const sketch0 = (p) => {
    let compass = { x: 0, y: 0, dragging: false };
    let currentUp = true; // true = UP, false = DOWN
    
    p.setup = () => {
        let cnv = p.createCanvas(p.select('#canvas0').width, p.select('#canvas0').height);
        cnv.style('z-index', '10'); // Ensure on top
        compass.x = p.width / 2 + 100;
        compass.y = p.height / 2 + 50;
        
        const btn = p.select('#sim0-toggle-current');
        if (btn) btn.mousePressed(() => {
            currentUp = !currentUp;
            
            // Update HTML Thumb Icon
            const thumbIcon = p.select('#grip-thumb-icon');
            if (thumbIcon) {
                // Initial state (UP) was scaleX(-1) -> mirror image
                // User wants:
                // UP: scale(-1, 1)  (Maintains the initial mirror)
                // DOWN: scale(1, -1) (Removes horizontal mirror, flips vertical)
                if (currentUp) {
                    thumbIcon.style('transform', 'scale(-1, 1)');
                } else {
                    thumbIcon.style('transform', 'scale(1, -1)');
                }
            }
        });
    };

    p.draw = () => {
        p.clear(); // Transparent background to show SVG
        
        let cx = p.width / 2;
        let cy = p.height / 2;

        // Draw Animated Current Arrows on Wire
        drawCurrentFlow(p, cx, cy);

        // Draw "Glass Plane" visual hint (Horizontal slice)
        p.push();
        p.translate(cx, cy);
        p.noFill();
        p.stroke(255, 255, 255, 50);
        p.strokeWeight(1);
        p.ellipse(0, 0, 300, 150); // Large boundary
        
        // Draw Field Lines (Concentric ellipses) representing horizontal circles
        p.stroke(255, 255, 255, 100);
        p.strokeWeight(2);
        
        [40, 70, 100, 130].forEach(r => {
            let rx = r;
            let ry = r * 0.5; // Aspect ratio for isometric/perspective
            p.ellipse(0, 0, rx*2, ry*2);
            
            // Draw Arrows on the ellipses
            // User requested to move arrows to the vertical midpoint (y=0, x=rx and x=-rx)
            // User requested to change current directions (Invert logic)
            
            // Right Point (x = rx, y = 0)
            // Standard Physics: Current Up -> Field Into Page (Up/-90).
            // User Request (Change Dir): Down (+90)
            drawIsoArrow(p, rx, 0, currentUp ? -90 : 90);
            
            // Left Point (x = -rx, y = 0)
            // Standard Physics: Current Up -> Field Out of Page (Down/+90).
            // User Request (Change Dir): Up (-90)
            drawIsoArrow(p, -rx, 0, currentUp ? 90 : -90);
        });
        p.pop();

        // --- Compass Logic ---
        handleCompassDrag(p);
        
        // Clamp compass to pseudo-3D plane area? 
        // Just let it float, but calculate needle based on position relative to center
        
        p.push();
        p.translate(compass.x, compass.y);
        
        // Compass Body (Perspective Disc)
        p.fill(255);
        p.stroke(50);
        p.strokeWeight(1);
        p.ellipse(0, 0, 40, 20); // Flattened disc
        
        // Needle Calculation
        let dx = compass.x - cx;
        let dy = (compass.y - cy) * 2; // Project screen Y back to 3D Z space
        let angle3D = p.atan2(dy, dx);
        
        // Tangent in 3D:
        // Current UP -> Field CCW. 
        // Tangent Angle = angle3D + 90 deg (CCW) or -90 (CW)
        let tangAngle3D = angle3D + (currentUp ? -p.HALF_PI : p.HALF_PI); 
        // Wait, standard math: CCW from X axis. Tangent is +90.
        // If Current UP => Thumb Up => Fingers CCW. 
        // So Tangent = +HALF_PI.
        // Let's check: Front (Pos Y/Z). Angle PI/2. Tangent PI. (Left). Correct.
        
        // Vector 3D
        let vx = p.cos(tangAngle3D);
        let vz = p.sin(tangAngle3D);
        
        // Project Vector back to Screen
        // Screen Vx = Vx
        // Screen Vy = Vz * 0.5
        let svx = vx * 20; // Length 20
        let svy = vz * 10; 
        
        p.strokeWeight(3);
        // North Pole (Red)
        p.stroke(239, 68, 68);
        p.line(0, 0, svx, svy);
        
        // South Pole (Blue)
        p.stroke(59, 130, 246);
        p.line(0, 0, -svx, -svy);
        
        // Center pin
        p.noStroke();
        p.fill(50);
        p.ellipse(0,0,4,2);
        
        p.pop();
    };
    
    function drawIsoArrow(p, x, y, angleDeg) {
        // Simple arrow head pointing in direction
        p.push();
        p.translate(x, y);
        drawArrowHead(p, angleDeg);
        p.pop();
    }
    
    function drawArrowHead(p, rotationDeg) {
        p.rotate(p.radians(rotationDeg));
        p.noFill();
        p.stroke(255, 255, 0); // Yellow
        p.strokeWeight(2);
        p.beginShape();
        p.vertex(-5, -5);
        p.vertex(5, 0);
        p.vertex(-5, 5);
        p.endShape();
    }

    function handleCompassDrag(p) {
        let d = p.dist(p.mouseX, p.mouseY, compass.x, compass.y);
        if (p.mouseIsPressed) {
            if (d < 30 && !compass.dragging) {
                compass.dragging = true;
            }
        } else {
            compass.dragging = false;
        }
        
        if (compass.dragging) {
            compass.x = p.mouseX;
            compass.y = p.mouseY;
            compass.x = p.constrain(compass.x, 20, p.width-20);
            compass.y = p.constrain(compass.y, 20, p.height-20);
        }
    }

    function drawCurrentFlow(p, cx, cy) {
        // Wire is roughly x=cx, from cy-140 to cy+140 (SVG coords)
        // Draw moving arrows
        p.stroke(255);
        p.strokeWeight(2);
        p.noFill();
        
        // Speed and phase
        const speed = 1.5;
        const spacing = 60;
        let offset = (p.frameCount * speed) % spacing;
        
        let topY = cy - 130;
        let bottomY = cy + 130;
        
        for (let y = topY; y <= bottomY; y += spacing) {
            let drawY = y + (currentUp ? -offset : offset);
            // Wrap around logic
            if (currentUp) {
                if (drawY < topY) drawY += (bottomY - topY);
            } else {
                if (drawY > bottomY) drawY -= (bottomY - topY);
            }
            
            // Draw Chevron Arrow on top of wire
            p.push();
            p.translate(cx, drawY);
            if (!currentUp) p.rotate(p.PI); // Point down
            
            // Chevron shape
            p.beginShape();
            p.vertex(-5, 5);
            p.vertex(0, -5); // Tip
            p.vertex(5, 5);
            p.endShape();
            p.pop();
        }
    }
};
new p5(sketch0, 'canvas0');

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
        p.clear();
        
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
        
        p.stroke(255, 255, 255, opacity); // White lines for dark background
        p.strokeWeight(2);
        for(let i=1; i<=3; i++) {
            p.arc(p.width/2, p.height/2 - 50, 220 + i*40, 100 + i*60, p.PI, 0);
            p.arc(p.width/2, p.height/2 - 50, 220 + i*40, 100 + i*60, 0, p.PI);
        }
        
        // --- Draw Wires & Current Arrows ---
        let wireY = p.height/2 + 50; 
        
        // Wires
        p.stroke(184, 115, 51); // Copper color (same as coil)
        p.strokeWeight(3);
        p.noFill();
        // Left Wire (In)
        p.line(0, p.height, p.width/2 - 90, p.height/2 - 50); 
        // Right Wire (Out)
        p.line(p.width, p.height, p.width/2 + 90, p.height/2 - 50);

        // Current Arrows (Animated)
        if (current > 5) {
            // Number of arrows increases with current (1 to 5)
            let numArrows = p.floor(p.map(current, 0, 100, 1, 6)); 
            
            for (let i = 0; i < numArrows; i++) {
                let offset = i / numArrows;
                // Slower animation (120 frames = ~2 seconds per loop)
                let arrowPos = ((p.frameCount % 120) / 120 + offset) % 1;
                
                // Left Wire Arrow (Going Up/In)
                let x1 = p.lerp(0, p.width/2 - 90, arrowPos);
                let y1 = p.lerp(p.height, p.height/2 - 50, arrowPos);
                drawArrowHead(p, x1, y1, Math.atan2((p.height/2 - 50) - p.height, (p.width/2 - 90) - 0));

                // Right Wire Arrow (Going Down/Out)
                let x2 = p.lerp(p.width/2 + 90, p.width, arrowPos);
                let y2 = p.lerp(p.height/2 - 50, p.height, arrowPos);
                drawArrowHead(p, x2, y2, Math.atan2(p.height - (p.height/2 - 50), p.width - (p.width/2 + 90)));
            }
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
        p.stroke(200); // Light silver
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
        p.fill(220); // Light text
        p.noStroke();
        p.textAlign(p.CENTER);
        p.text(`Field Strength: ${strength.toFixed(2)} T`, p.width/2, p.height - 50);
        p.text(hasCore ? "Iron Core" : "Air Core", p.width/2, p.height - 30);
    };

    function drawArrowHead(p, x, y, angle) {
        p.push();
        p.translate(x, y);
        p.rotate(angle);
        p.fill(255); // White arrow
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
        p.clear();
        
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
        p.stroke(255, 100); // White with opacity
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
        p.stroke(255); // White stroke outline
        p.strokeWeight(2);
        p.ellipse(p.width/2, wireY, 60, 60);

        // Draw Current Symbol
        p.stroke(0);
        p.strokeWeight(4);
        if (currentDirection === 1) {
            // Cross (Into page) - Black on Orange is fine
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
        p.fill(220); // Light Text
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
        p.clear();
        
        // Magnets (Fixed N -> S for simplicity)
        p.noStroke();
        p.fill('#ef4444'); p.rect(0, 50, 80, p.height-100); // N
        p.fill(255); p.text('N', 30, p.height/2);
        p.fill('#3b82f6'); p.rect(p.width-80, 50, 80, p.height-100); // S
        p.fill(255); p.text('S', p.width-50, p.height/2);

        // Field Lines
        p.stroke(255, 100); // White with opacity
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
        p.stroke(255); // White wire outline
        p.strokeWeight(2);
        p.ellipse(p.width/2, wireY, 60, 60);

        // Draw Induced Current
        p.stroke(0);
        p.strokeWeight(4);
        if (inducedCurrent === 1) { // Into
            p.line(p.width/2 - 15, wireY - 15, p.width/2 + 15, wireY + 15);
            p.line(p.width/2 + 15, wireY - 15, p.width/2 - 15, wireY + 15);
             p.fill(220); p.noStroke(); p.textSize(14); p.text("INDUCED", p.width/2-30, wireY-40);
        } else if (inducedCurrent === -1) { // Out
            p.fill(0);
            p.ellipse(p.width/2, wireY, 15, 15);
            p.fill(220); p.noStroke(); p.textSize(14); p.text("INDUCED", p.width/2-30, wireY-40);
        }

        // Instructions
         p.fill(200); // Light instructions
         p.noStroke();
         p.textSize(12);
         if (!isDragging) p.text("Grab the wire and move it up/down!", p.width/2 - 60, p.height - 20);
    };
};
new p5(sketch3, 'canvas3');