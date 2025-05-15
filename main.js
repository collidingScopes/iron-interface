/*
Different hand motion to control wave intensity
Hand motion to switch colors
Blur shader?
*/

// main.js
const patterns = [createGrid, createSphere, createSpiral,
createHelix, createTorus, createGalaxy, createWave,
createSupernova, createFlower, createVoronoi,];

const patternNames = ["Cube", "Sphere", "Spiral",
    "Helix", "Torus", "Galaxy", "Wave",
    "Supernova", "Flower", "Voronoi", 
];

let hands;
let handDetected = false; // Flag if *any* hand is detected
let isLeftHandPresent = false;
let isRightHandPresent = false;
let leftHandLandmarks = null;
let rightHandLandmarks = null;

let targetCameraZ = 100; // Target Z position for smooth zoom - increased for wider view
const MIN_CAMERA_Z = 20;
const MAX_CAMERA_Z = 200;
const MIN_PINCH_DIST = 0.04; // Minimum distance between thumb and index for max zoom-in
const MAX_PINCH_DIST = 0.16; // Maximum distance for max zoom-out (adjust based on testing)

let lastPatternChangeTime = 0;
const patternChangeCooldown = 1500;

const clock = new THREE.Clock();

// Clap detection variables
let lastHandDistance = Infinity;
let handsComeCloser = false;
let handsMovingApart = false;
let clapDetected = false;
let lastClapTime = 0;
const MIN_HANDS_DISTANCE = 0.12; // Threshold for hands being close enough
const CLAP_COOLDOWN = 1500; // Cooldown between claps (ms)

let targetCameraAngleX = 0;   // Target horizontal rotation angle (radians) based on hand
let currentCameraAngleX = 0; // Current smoothed horizontal rotation angle
let initialHandAngle = null; // Store initial angle when right hand appears
const rotationSensitivity = 0.8; // Increased sensitivity for more noticeable rotation
const rotationSmoothing = 0.03; // Smoothing factor for rotation (lower = smoother)

let targetCameraAngleY = 0;   // Target vertical rotation angle (radians)
let currentCameraAngleY = 0;  // Current smoothed vertical rotation angle
const maxYAngle = Math.PI / 4; // Limit the vertical rotation to prevent flipping (45 degrees)
let initialHandYPosition = null; // Store initial Y position when right hand appears
const yRotationSensitivity = 0.5; // Sensitivity for Y rotation (lower than X for more control)

let canvasCtx, canvasElement, videoElement;
let scene, camera, renderer, particles;
let composer;
let time = 0;
let currentPattern = 0;
let transitionProgress = 0;
let isTransitioning = false;
let gui;

const params = {
    particleCount: 15000,
    transitionSpeed: 0.005,
    cameraSpeed: 0.0, // Set to 0 to disable default camera movement
    waveIntensity: 0.0,
    particleSize: 0.5,
    changePattern: function() {
        forcePatternChange();
    }
};

// --- START Execution ---
// Use DOMContentLoaded to ensure HTML is parsed and elements are available
function startExperience() {
    // Basic check for THREE core first
    if (typeof THREE === 'undefined') {
      console.error("THREE.js core library not found!");
      alert("Error: THREE.js library failed to load.");
      return;
    }
    
    // Proceed with initialization
    init();
    if (renderer) {
      animate();
    } else {
      console.error("Renderer initialization failed. Animation cannot start.");
    }
}

window.onload = startExperience;

// --- INIT THREE.JS ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.z = targetCameraZ; // Starting with a wider default view

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const container = document.getElementById('container');
    if (container) {
    container.appendChild(renderer.domElement);
    } else {
    console.error("HTML element with id 'container' not found!");
    return;
    }

    particles = createParticleSystem();
    scene.add(particles);
    window.addEventListener('resize', onWindowResize);
    initGUI();

    // --- Get references for drawing ---
    videoElement = document.querySelector('.input_video');
    canvasElement = document.querySelector('.output_canvas');
    if (canvasElement) {
        canvasCtx = canvasElement.getContext('2d');
    } else {
        console.error("Output canvas element not found!");
    }
    // ---

    setupBloom();
    setupHandTracking(); // Setup hand tracking last
}

// --- WINDOW RESIZE ---
function onWindowResize() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Update composer size if it exists
    if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- PATTERN CHANGE / TRANSITION ---
function forcePatternChange() {
    if (isTransitioning) {
    completeCurrentTransition(); // Finish current transition instantly
    }
    const nextPattern = (currentPattern + 1) % patterns.length;
    transitionToPattern(nextPattern);
}

function completeCurrentTransition() {
    if (!isTransitioning || !particles || !particles.geometry || !particles.userData.toPositions || !particles.userData.toColors) {
    // Clear transition state if data is missing or geometry invalid
    isTransitioning = false;
    transitionProgress = 0;
    if (particles && particles.userData) {
        delete particles.userData.fromPositions;
        delete particles.userData.toPositions;
        delete particles.userData.fromColors;
        delete particles.userData.toColors;
        delete particles.userData.targetPattern;
    }
    return;
    }

    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;

    // Ensure arrays are valid before setting
    if (positions && colors &&
    particles.userData.toPositions && particles.userData.toColors &&
    positions.length === particles.userData.toPositions.length &&
    colors.length === particles.userData.toColors.length) {
        positions.set(particles.userData.toPositions);
        colors.set(particles.userData.toColors);
        particles.geometry.userData.currentColors = new Float32Array(particles.userData.toColors); // Update stored colors
        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;
        currentPattern = particles.userData.targetPattern; // Update current pattern index
    } else {
    console.error("Transition data length mismatch or invalid data on completion!");
    }

    // Clean up transition data
    delete particles.userData.fromPositions;
    delete particles.userData.toPositions;
    delete particles.userData.fromColors;
    delete particles.userData.toColors;
    delete particles.userData.targetPattern;
    isTransitioning = false;
    transitionProgress = 0;
}

function transitionToPattern(newPattern) {
    if (!particles || !particles.geometry || !particles.geometry.attributes.position) return;

    isTransitioning = true;
    const posAttr = particles.geometry.attributes.position;
    const colAttr = particles.geometry.attributes.color;

    // Ensure current colors are stored correctly before starting
    if (!particles.geometry.userData.currentColors || particles.geometry.userData.currentColors.length !== colAttr.array.length) {
    particles.geometry.userData.currentColors = new Float32Array(colAttr.array);
    }

    const curPos = new Float32Array(posAttr.array);
    const curCol = new Float32Array(particles.geometry.userData.currentColors); // Use stored colors as 'from'

    const newPos = new Float32Array(curPos.length);
    const patternFn = patterns[newPattern];
    const count = params.particleCount;

    // Generate new positions
    for (let i = 0; i < count; i++) {
        const p = patternFn(i, count);
        newPos[i * 3] = p.x;
        newPos[i * 3 + 1] = p.y;
        newPos[i * 3 + 2] = p.z;
    }

    // Generate new colors
    const newCol = new Float32Array(curCol.length);
    const palette = colorPalettes[newPattern%colorPalettes.length];
    for (let i = 0; i < count; i++) {
        const base = palette[0];
        const variation = 1.0; // Keep color variation consistent
        newCol[i * 3] = base.r * variation;
        newCol[i * 3 + 1] = base.g * variation;
        newCol[i * 3 + 2] = base.b * variation;
    }

    // Store transition data
    particles.userData.fromPositions = curPos;
    particles.userData.toPositions = newPos;
    particles.userData.fromColors = curCol;
    particles.userData.toColors = newCol;
    particles.userData.targetPattern = newPattern; // Store the target pattern index
    transitionProgress = 0; // Reset progress
}


// --- Helper function to map a value from one range to another ---
function mapRange(value, inMin, inMax, outMin, outMax) {
    // Clamp value to input range
    value = Math.max(inMin, Math.min(inMax, value));
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !camera || !scene) return;

    const deltaTime = clock.getDelta();
    time += deltaTime; // Keep time updating for other potential uses

    // --- Particle Update ---
    if (particles && particles.geometry && particles.geometry.attributes.position) {
        const positions = particles.geometry.attributes.position.array;
        const count = params.particleCount;

        // Apply wave motion (if not transitioning)
        if (!isTransitioning) {
            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                const noise1 = Math.cos(time * 0.5 + i * 0.05) * params.waveIntensity;
                const noise2 = Math.sin(time * 0.5 + i * 0.05) * params.waveIntensity;
                positions[idx] += noise1 * deltaTime * 20;
                positions[idx + 1] += noise2 * deltaTime * 20;
            }
            particles.geometry.attributes.position.needsUpdate = true;
        }

        // --- Transition Logic ---
        if (isTransitioning && particles.userData.fromPositions && particles.userData.toPositions && particles.userData.fromColors && particles.userData.toColors) {
            transitionProgress += params.transitionSpeed * deltaTime * 60; // Scale speed by frame time (approx)

            if (transitionProgress >= 1.0) {
                transitionProgress = 1.0;
                completeCurrentTransition(); // Finalize positions and clean up
            } else {
                const colors = particles.geometry.attributes.color.array; // Get color buffer
                const fromPos = particles.userData.fromPositions;
                const toPos = particles.userData.toPositions;
                const fromCol = particles.userData.fromColors;
                const toCol = particles.userData.toColors;
                const t = transitionProgress;
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

                // Check array lengths before interpolation
                if (positions && colors && fromPos && toPos && fromCol && toCol &&
                    fromPos.length === positions.length && toPos.length === positions.length &&
                    fromCol.length === colors.length && toCol.length === colors.length) {

                    for (let i = 0; i < count; i++) {
                        const index = i * 3;
                        // Interpolate positions
                        positions[index] = fromPos[index] * (1 - ease) + toPos[index] * ease;
                        positions[index + 1] = fromPos[index + 1] * (1 - ease) + toPos[index + 1] * ease;
                        positions[index + 2] = fromPos[index + 2] * (1 - ease) + toPos[index + 2] * ease;
                        // Interpolate colors
                        colors[index] = fromCol[index] * (1 - ease) + toCol[index] * ease;
                        colors[index + 1] = fromCol[index + 1] * (1 - ease) + toCol[index + 1] * ease;
                        colors[index + 2] = fromCol[index + 2] * (1 - ease) + toCol[index + 2] * ease;
                    }

                    particles.geometry.attributes.position.needsUpdate = true;
                    particles.geometry.attributes.color.needsUpdate = true;
                    particles.geometry.userData.currentColors = new Float32Array(colors); // Update during transition

                } else {
                    console.error("Transition data length mismatch or invalid data during interpolation!");
                    completeCurrentTransition(); // Attempt to recover by completing
                }
            }
        }
    }

    if (camera) {
        // --- Smooth Zoom Distance (Driven by Left Hand Pinch) ---
        const zoomSpeed = 0.04;
        const currentDistance = camera.position.length() > 0.1 ? camera.position.length() : targetCameraZ;
        let smoothedDistance = currentDistance + (targetCameraZ - currentDistance) * zoomSpeed;
        smoothedDistance = Math.max(MIN_CAMERA_Z, Math.min(MAX_CAMERA_Z, smoothedDistance));
    
        // --- Smooth Rotation Angle (X and Y axes) ---
        // X-axis (horizontal rotation)
        let deltaAngleX = targetCameraAngleX - currentCameraAngleX;
        while (deltaAngleX > Math.PI) deltaAngleX -= Math.PI * 2;
        while (deltaAngleX < -Math.PI) deltaAngleX += Math.PI * 2;
        currentCameraAngleX += deltaAngleX * rotationSmoothing;
        currentCameraAngleX = (currentCameraAngleX + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        
        // Y-axis (vertical rotation)
        let deltaAngleY = targetCameraAngleY - currentCameraAngleY;
        currentCameraAngleY += deltaAngleY * rotationSmoothing;
        
        // Clamp Y rotation to prevent flipping
        currentCameraAngleY = Math.max(-maxYAngle, Math.min(maxYAngle, currentCameraAngleY));
    
        // --- Set Camera Position using Spherical Coordinates ---
        // Convert spherical coordinates (distance, xAngle, yAngle) to cartesian (x, y, z)
        camera.position.set(
            Math.sin(currentCameraAngleX) * Math.cos(currentCameraAngleY) * smoothedDistance,
            Math.sin(currentCameraAngleY) * smoothedDistance,
            Math.cos(currentCameraAngleX) * Math.cos(currentCameraAngleY) * smoothedDistance
        );
    
        camera.lookAt(0, 0, 0); // Always look at the center of the scene
    }

    if (composer) {
        composer.render();
    } else if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// --- DAT.GUI ---
function initGUI() {
// Check if dat exists
if (typeof dat === 'undefined') {
console.warn("dat.GUI library not found. GUI controls will be unavailable.");
return; // Exit if dat.GUI is not loaded
}

try {
// Create GUI
gui = new dat.GUI({ width: 300 });
gui.close(); // Start with closed panel

// --- Animation Parameters ---
const animFolder = gui.addFolder('Animation');
// Remove cameraSpeed option since we're not using default camera movement
animFolder.add(params, 'waveIntensity', 0, 1, 0.05).name('Wave Intensity');
animFolder.add(params, 'transitionSpeed', 0.001, 0.05, 0.001).name('Transition Speed');
animFolder.open();

// --- Visual Parameters ---
const visualFolder = gui.addFolder('Visual');
visualFolder.add(params, 'particleSize', 0.1, 10, 0.1).onChange(function(value) {
    if (particles && particles.material) {
        particles.material.size = value;
    }
}).name('Particle Size');
visualFolder.open();

// --- Pattern Controls ---
gui.add(params, 'changePattern').name('Next Pattern');

// Add GUI styling (optional)
const guiElement = document.querySelector('.dg.ac');
if (guiElement) {
    guiElement.style.zIndex = "1000"; // Ensure GUI is above other elements
}

} catch (error) {
console.error("Error initializing dat.GUI:", error);
if(gui) gui.destroy(); // Clean up partial GUI if error occurred
gui = null;
}
}

// --- Updated onResults with Pinch and Rotation ---
function onResults(results) {
    if (!canvasCtx || !canvasElement || !videoElement || typeof drawConnectors === 'undefined' || typeof drawLandmarks === 'undefined') {
        return;
    }

    // --- Reset Hand States ---
    let wasLeftHandPresent = isLeftHandPresent; // Keep track if hand disappears
    let wasRightHandPresent = isRightHandPresent;
    isLeftHandPresent = false;
    isRightHandPresent = false;
    leftHandLandmarks = null;
    rightHandLandmarks = null;
    handDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    // --- Drawing Setup ---
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // --- Process Detected Hands ---
    if (handDetected) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            // Ensure handedness data exists for the current hand index
            if (!results.multiHandedness || !results.multiHandedness[i]) continue;

            const classification = results.multiHandedness[i];
            const landmarks = results.multiHandLandmarks[i];
            const isLeft = classification.label === 'Left';

            // --- Assign Landmarks based on Handedness ---
            if (isLeft) {
                isLeftHandPresent = true;
                leftHandLandmarks = landmarks;

                // --- Left Hand: Pinch for Zoom ---
                if (landmarks && landmarks.length > 8) { // Ensure landmarks are available
                    const thumbTip = landmarks[4];
                    const indexTip = landmarks[8];
                    const pinchDist = calculateDistance(thumbTip, indexTip);

                    // Map pinch distance to camera Z (zoom)
                    // Closer pinch = smaller Z (zoom in), wider pinch = larger Z (zoom out)
                    targetCameraZ = mapRange(pinchDist, MIN_PINCH_DIST, MAX_PINCH_DIST, MIN_CAMERA_Z, MAX_CAMERA_Z);
                    // Clamp value just in case mapRange doesn't clamp perfectly
                    targetCameraZ = Math.max(MIN_CAMERA_Z, Math.min(MAX_CAMERA_Z, targetCameraZ));
                    
                    // --- Draw a white line connecting thumb and index finger ---
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                    canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                    canvasCtx.strokeStyle = 'red';
                    canvasCtx.lineWidth = 5;
                    canvasCtx.stroke();
                }

            } else { // Right Hand
                isRightHandPresent = true;
                rightHandLandmarks = landmarks;

                // --- Right Hand: Rotation for Orbit ---
                if (landmarks && landmarks.length > 9) { // Ensure landmarks are available
                    const wrist = landmarks[0];
                    const middleMcp = landmarks[9];
                
                    // Calculate angle of the hand (vector from wrist to middle finger base)
                    const handAngleRad = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x) - (Math.PI / 2);
                    
                    // Use the wrist Y position for vertical tilt
                    const handYPosition = wrist.y;
                
                    // If this is the first frame the right hand is detected, store the initial values
                    if (!wasRightHandPresent || initialHandAngle === null) {
                        initialHandAngle = handAngleRad;
                        initialHandYPosition = handYPosition;
                        // Reset current camera angles to avoid jumps
                        currentCameraAngleX = targetCameraAngleX;
                        currentCameraAngleY = targetCameraAngleY;
                    }
                
                    // Calculate the change in horizontal angle
                    let angleDelta = handAngleRad - initialHandAngle;
                    
                    // Normalize delta angle to handle wrap-around
                    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
                    while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
                    
                    // Calculate the change in vertical position
                    // We invert this because screen Y coordinates increase downward
                    const yDelta = initialHandYPosition - handYPosition;
                    
                    // Update target camera angles based on hand movements
                    targetCameraAngleX = currentCameraAngleX - (angleDelta * rotationSensitivity);
                    targetCameraAngleY = currentCameraAngleY + (yDelta * yRotationSensitivity);
                    
                    // Clamp Y angle to prevent flipping
                    targetCameraAngleY = Math.max(-maxYAngle, Math.min(maxYAngle, targetCameraAngleY));
                    
                    // Draw a visual indicator of vertical rotation
                    if (canvasCtx) {
                        const yIndicatorX = middleMcp.x * canvasElement.width;
                        const yIndicatorY = middleMcp.y * canvasElement.height;
                        const yIndicatorLength = 30 * Math.sin(targetCameraAngleY);
                        
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(yIndicatorX, yIndicatorY);
                        canvasCtx.lineTo(yIndicatorX, yIndicatorY + yIndicatorLength);
                        canvasCtx.strokeStyle = '#FFFF00'; // Yellow
                        canvasCtx.lineWidth = 4;
                        canvasCtx.stroke();
                    }
                }
                
                // --- Reset initial values if right hand disappears ---
                if (!isRightHandPresent) {
                    initialHandAngle = null;
                    initialHandYPosition = null;
                }
            }

            // --- Draw Landmarks (Color-coded: Green=Left, Blue=Right) ---
            const color = isLeft ? '#00FF00' : '#0088FF'; // Green lines Left, Blue lines Right
            const dotColor = isLeft ? '#FF0044' : '#FFFF00'; // Red dots Left, Yellow dots Right
            if (landmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: color, lineWidth: 2 });
                drawLandmarks(canvasCtx, landmarks, { color: dotColor, lineWidth: 1, radius: 3 });
                
                // --- Draw hand function label ---
                const wrist = landmarks[0]; // Use wrist as reference point
                const labelText = isLeft ? "Zoom" : "Rotate";
                
                // Position label near but slightly offset from the wrist
                const labelX = wrist.x * canvasElement.width - (isLeft ? -30 : 30);
                const labelY = wrist.y * canvasElement.height - 25;
                
                // Draw text with shadow for better visibility
                canvasCtx.save(); // Save the current state
                
                // Apply counter-transformation to make text readable (flip horizontally)
                canvasCtx.scale(-1, 1);
                const flippedX = -labelX; // Negate x position for proper placement after flip
                
                // Add semi-transparent black rectangle background
                canvasCtx.font = "32px 'Courier New', monospace"; // Set font first to measure text
                const textMetrics = canvasCtx.measureText(labelText);
                const textWidth = textMetrics.width;
                const textHeight = 32; // Approximate height based on font size
                const padding = 8; // Padding around text

                // Draw the background rectangle
                canvasCtx.fillStyle = "rgba(0, 8, 255, 0.6)"; // Semi-transparent black
                canvasCtx.fillRect(
                    flippedX - padding, 
                    labelY - textHeight + padding/2, 
                    textWidth + padding*2, 
                    textHeight + padding
                );

                // Now draw the text on top of the rectangle
                canvasCtx.font = "32px 'Courier New', monospace";
                canvasCtx.fillStyle = "white"; // White text
                canvasCtx.fillText(labelText, flippedX, labelY);

                canvasCtx.restore(); // Restore the previous state
            }
        }

        // --- Reset initial angle if right hand disappears ---
        if (!isRightHandPresent) {
            initialHandAngle = null;
        }

        // --- Two-Hand Clap Detection Logic ---
        if (isLeftHandPresent && isRightHandPresent && leftHandLandmarks && rightHandLandmarks) {
            // Calculate distance between the two index fingertips
            const leftIndex = leftHandLandmarks[8]; // Index fingertip
            const rightIndex = rightHandLandmarks[8]; // Index fingertip

            // Calculate the Euclidean distance between hands
            const dx = leftIndex.x - rightIndex.x;
            const dy = leftIndex.y - rightIndex.y;
            const handDistance = Math.sqrt(dx * dx + dy * dy);

            const now = Date.now();

            // Check for the clap gesture pattern:
            // 1. Hands coming closer together
            // 2. Reaching minimum distance
            // 3. Then moving apart again

            // Step 1: Detect hands coming closer
            if (handDistance < lastHandDistance - 0.01) { // Added threshold to avoid noise
                handsComeCloser = true;
            }

            // Step 2: Detect when hands are close enough *after* coming closer
            if (handsComeCloser && handDistance < MIN_HANDS_DISTANCE) {
                handsMovingApart = true; // Mark that they *were* close
            }

            // Step 3: Detect hands moving apart significantly *after* being close
            if (handsComeCloser && handsMovingApart && handDistance > lastHandDistance + 0.02) { // Increased threshold
                if (now > lastClapTime + CLAP_COOLDOWN) {
                    console.log("Clap gesture detected!");
                    forcePatternChange();
                    lastClapTime = now;

                    // Reset clap detection state immediately after detection
                    handsComeCloser = false;
                    handsMovingApart = false;
                    lastHandDistance = handDistance; // Update distance to prevent immediate re-trigger
                }
            } else if (handDistance >= MIN_HANDS_DISTANCE && handsComeCloser && !handsMovingApart) {
                // If hands start moving apart before reaching the MIN distance, reset
                 handsComeCloser = false;
            } else if (handDistance >= MIN_HANDS_DISTANCE) {
                 // Reset if hands are far apart and weren't in the 'close' phase
                handsComeCloser = false;
                handsMovingApart = false;
            }

            // Update for next frame
            lastHandDistance = handDistance;

        } else {
            // Reset tracking if we don't have both hands
            lastHandDistance = Infinity;
            handsComeCloser = false;
            handsMovingApart = false;
        }
    } else {
        // No hands detected, reset states
        initialHandAngle = null; // Reset rotation anchor
        lastHandDistance = Infinity;
        handsComeCloser = false;
        handsMovingApart = false;
    }

    canvasCtx.restore();
}

function setupHandTracking() {
    if (!videoElement || !canvasElement || !canvasCtx) {
      console.error("Video or Canvas element not ready for Hand Tracking setup.");
      return;
    }

    // Check if MediaPipe components are loaded
    if (typeof Hands === 'undefined' || typeof Camera === 'undefined' ||
        typeof drawConnectors === 'undefined' || typeof drawLandmarks === 'undefined') {
      console.error("MediaPipe Hands/Camera/Drawing library not found.");
      const instructions = document.getElementById('instructions');
      if(instructions) instructions.textContent = "Hand tracking library failed to load.";
      return;
    }

    // Reset clap detection variables
    lastHandDistance = Infinity;
    handsComeCloser = false;
    handsMovingApart = false;

    try {
      hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});

      hands.setOptions({
        // --- Track up to two hands ---
        maxNumHands: 2,
        // ---
        modelComplexity: 1,
        minDetectionConfidence: 0.6, // Adjusted confidence
        minTrackingConfidence: 0.6
      });

      hands.onResults(onResults);

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or more
            await hands.send({image: videoElement});
          }
        },
        width: 640, // Internal processing resolution
        height: 360
      });

      camera.start()
        .then(() => console.log("Camera started successfully."))
        .catch(err => {
            console.error("Error starting webcam:", err);
            const instructions = document.getElementById('instructions');
            if(instructions) instructions.textContent = "Could not access webcam. Please grant permission and reload.";
        });

      console.log("Hand tracking setup complete.");

    } catch (error) {
      console.error("Error setting up MediaPipe Hands:", error);
      const instructions = document.getElementById('instructions');
      if(instructions) instructions.textContent = "Error initializing hand tracking.";
    }
}

// Modifications to the setupBloom function
function setupBloom() {
    // Create a new EffectComposer
    composer = new THREE.EffectComposer(renderer);
    
    // Add the base render pass (required)
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add the UnrealBloomPass with nice default values for particles
    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), // resolution
      2.0,    // strength (intensity of the bloom)
      0.1,    // radius (how far the bloom extends)
      0.1,    // threshold (minimum brightness to apply bloom)
    );
    composer.addPass(bloomPass);
    
    // Add Chromatic Aberration Effect
    const chromaticAberrationPass = new THREE.ShaderPass(ChromaticAberrationShader);
    chromaticAberrationPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    chromaticAberrationPass.uniforms.strength.value = 0.5; // Adjust default strength
    composer.addPass(chromaticAberrationPass);
    
    // Add effect controls to the GUI if it exists
    if (gui) {
      const bloomFolder = gui.addFolder('Bloom Effect');
      bloomFolder.add(bloomPass, 'strength', 0, 3, 0.05).name('Intensity');
      bloomFolder.add(bloomPass, 'radius', 0, 1, 0.05).name('Radius');
      bloomFolder.add(bloomPass, 'threshold', 0, 1, 0.05).name('Threshold');
      bloomFolder.open();
      
      // Add Chromatic Aberration controls
      const chromaticFolder = gui.addFolder('Chromatic Aberration');
      chromaticFolder.add(chromaticAberrationPass.uniforms.strength, 'value', 0, 0.5, 0.001).name('Strength');
      chromaticFolder.open();
    }
    
    // Update the resize handler to include the composer
    const originalResize = onWindowResize;
    onWindowResize = function() {
      originalResize();
      if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
        // Update shader resolution uniform when window is resized
        if (chromaticAberrationPass) {
          chromaticAberrationPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
        }
      }
    };
}

function calculateDistance(landmark1, landmark2) {
    if (!landmark1 || !landmark2) return Infinity;
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    return Math.sqrt(dx * dx + dy * dy);
}