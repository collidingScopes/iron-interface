// --- PATTERN FUNCTIONS ---
function createGrid(i, count) {
    const sideLength = Math.ceil(Math.cbrt(count));
    const spacing = 60 / sideLength;
    const halfGrid = (sideLength - 1) * spacing / 2;
    
    // Determine which side of the cube this particle should be on
    const totalSides = 6; // A cube has 6 sides
    const pointsPerSide = Math.floor(count / totalSides);
    const side = Math.floor(i / pointsPerSide);
    const indexOnSide = i % pointsPerSide;
    
    // Calculate a grid position on a 2D plane
    const sideLength2D = Math.ceil(Math.sqrt(pointsPerSide));
    const ix = indexOnSide % sideLength2D;
    const iy = Math.floor(indexOnSide / sideLength2D);
    
    // Map to relative coordinates (0 to 1)
    const rx = ix / (sideLength2D - 1 || 1);
    const ry = iy / (sideLength2D - 1 || 1);
    
    // Convert to actual coordinates with proper spacing (-halfGrid to +halfGrid)
    const x = rx * spacing * (sideLength - 1) - halfGrid;
    const y = ry * spacing * (sideLength - 1) - halfGrid;
    
    // Place on the appropriate face of the cube
    switch(side % totalSides) {
        case 0: return new THREE.Vector3(x, y, halfGrid); // Front face
        case 1: return new THREE.Vector3(x, y, -halfGrid); // Back face
        case 2: return new THREE.Vector3(x, halfGrid, y); // Top face
        case 3: return new THREE.Vector3(x, -halfGrid, y); // Bottom face
        case 4: return new THREE.Vector3(halfGrid, x, y); // Right face
        case 5: return new THREE.Vector3(-halfGrid, x, y); // Left face
        default: return new THREE.Vector3(0, 0, 0);
    }
}

function createSphere(i, count) {
    // Sphere distribution using spherical coordinates for surface only
    const t = i / count;
    const phi = Math.acos(2 * t - 1); // Full range from 0 to PI
    const theta = 2 * Math.PI * (i / count) * Math.sqrt(count); // Golden ratio distribution
    
    // Fixed radius for surface-only distribution
    const radius = 30;
    
    return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
        Math.cos(phi) * radius
    );
}

function createSpiral(i, count) {
    const t = i / count;
    const numArms = 3;
    const armIndex = i % numArms;
    const angleOffset = (2 * Math.PI / numArms) * armIndex;
    const angle = Math.pow(t, 0.7) * 15 + angleOffset;
    const radius = t * 40;
    
    // This is a 2D shape with particles on a thin plane by design 
    const height = 0; // Set to zero or a very small noise value for thickness
    
    return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        height
    );
}

function createHelix(i, count) {
    const numHelices = 2;
    const helixIndex = i % numHelices;
    const t = Math.floor(i / numHelices) / Math.floor(count / numHelices);
    const angle = t * Math.PI * 10;
    
    // Fixed radius for surface-only distribution
    const radius = 15;
    const height = (t - 0.5) * 60;
    const angleOffset = helixIndex * Math.PI;
    
    return new THREE.Vector3(
        Math.cos(angle + angleOffset) * radius,
        Math.sin(angle + angleOffset) * radius,
        height
    );
}

function createTorus(i, count) {
    // Torus parameters
    const R = 30; // Major radius (distance from center of tube to center of torus)
    const r = 10; // Minor radius (radius of the tube)
    
    // Use a uniform distribution on the torus surface
    // by using uniform sampling in the 2 angle parameters
    const u = (i / count) * 2 * Math.PI; // Angle around the center of the torus
    const v = (i * Math.sqrt(5)) * 2 * Math.PI; // Angle around the tube
    
    // Parametric equation of a torus
    return new THREE.Vector3(
        (R + r * Math.cos(v)) * Math.cos(u),
        (R + r * Math.cos(v)) * Math.sin(u),
        r * Math.sin(v)
    );
}

function createVortex(i, count) {
    // Vortex parameters
    const height = 60;        // Total height of the vortex
    const maxRadius = 35;     // Maximum radius at the top
    const minRadius = 5;      // Minimum radius at the bottom
    const numRotations = 3;   // Number of full rotations from top to bottom
    
    // Calculate normalized height position (0 = bottom, 1 = top)
    const t = i / count;
    
    // Add some randomness to distribute particles more naturally
    const randomOffset = 0.05 * Math.random();
    const heightPosition = t + randomOffset;
    
    // Calculate radius that decreases from top to bottom
    const radius = minRadius + (maxRadius - minRadius) * heightPosition;
    
    // Calculate angle with more rotations at the bottom
    const angle = numRotations * Math.PI * 2 * (1 - heightPosition) + (i * 0.1);
    
    // Calculate the vertical position (from bottom to top)
    const y = (heightPosition - 0.5) * height;
    
    return new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
    );
}

function createGalaxy(i, count) {
    // Galaxy parameters
    const numArms = 4;            // Number of spiral arms
    const armWidth = 0.15;        // Width of each arm (0-1)
    const maxRadius = 40;         // Maximum radius of the galaxy
    const thickness = 5;          // Vertical thickness
    const twistFactor = 2.5;      // How much the arms twist
    
    // Determine which arm this particle belongs to
    const armIndex = i % numArms;
    const indexInArm = Math.floor(i / numArms) / Math.floor(count / numArms);
    
    // Calculate radial distance from center
    const radialDistance = indexInArm * maxRadius;
    
    // Add some randomness for arm width
    const randomOffset = (Math.random() * 2 - 1) * armWidth;
    
    // Calculate angle with twist that increases with distance
    const armOffset = (2 * Math.PI / numArms) * armIndex;
    const twistAmount = twistFactor * indexInArm;
    const angle = armOffset + twistAmount + randomOffset;
    
    // Add height variation that decreases with distance from center
    const verticalPosition = (Math.random() * 2 - 1) * thickness * (1 - indexInArm * 0.8);
    
    return new THREE.Vector3(
        Math.cos(angle) * radialDistance,
        verticalPosition,
        Math.sin(angle) * radialDistance
    );
}

function createWave(i, count) {
    // Wave/ocean parameters
    const width = 60;       // Total width of the wave field
    const depth = 60;       // Total depth of the wave field
    const waveHeight = 10;  // Maximum height of waves
    const waveDensity = 0.1; // Controls wave frequency
    
    // Create a grid of points (similar to your grid function but for a 2D plane)
    const gridSize = Math.ceil(Math.sqrt(count));
    const spacingX = width / gridSize;
    const spacingZ = depth / gridSize;
    
    // Calculate 2D grid position
    const ix = i % gridSize;
    const iz = Math.floor(i / gridSize);
    
    // Convert to actual coordinates with proper spacing
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const x = ix * spacingX - halfWidth;
    const z = iz * spacingZ - halfDepth;
    
    // Create wave pattern using multiple sine waves for a more natural look
    // We use the x and z coordinates to create a position-based wave pattern
    const y = Math.sin(x * waveDensity) * Math.cos(z * waveDensity) * waveHeight +
              Math.sin(x * waveDensity * 2.5) * Math.cos(z * waveDensity * 2.1) * (waveHeight * 0.3);
    
    return new THREE.Vector3(x, y, z);
}

function createMobius(i, count) {
    // Möbius strip parameters
    const radius = 25;       // Major radius of the strip
    const width = 10;        // Width of the strip
    
    // Distribute points evenly along the length of the Möbius strip
    // and across its width
    const lengthSteps = Math.sqrt(count);
    const widthSteps = count / lengthSteps;
    
    // Calculate position along length and width of strip
    const lengthIndex = i % lengthSteps;
    const widthIndex = Math.floor(i / lengthSteps) % widthSteps;
    
    // Normalize to 0-1 range
    const u = lengthIndex / lengthSteps;        // Position around the strip (0 to 1)
    const v = (widthIndex / widthSteps) - 0.5;  // Position across width (-0.5 to 0.5)
    
    // Parametric equations for Möbius strip
    const theta = u * Math.PI * 2;  // Full loop around
    
    // Calculate the Möbius strip coordinates
    // This creates a half-twist in the strip
    const x = (radius + width * v * Math.cos(theta / 2)) * Math.cos(theta);
    const y = (radius + width * v * Math.cos(theta / 2)) * Math.sin(theta);
    const z = width * v * Math.sin(theta / 2);
    
    return new THREE.Vector3(x, y, z);
}

function createSupernova(i, count) {
    // Supernova parameters
    const maxRadius = 40;        // Maximum explosion radius
    const coreSize = 0.2;        // Size of the dense core (0-1)
    const outerDensity = 0.7;    // Density of particles in outer shell
    
    // Use golden ratio distribution for even spherical coverage
    const phi = Math.acos(1 - 2 * (i / count));
    const theta = Math.PI * 2 * i * (1 + Math.sqrt(5));
    
    // Calculate radial distance with more particles near center and at outer shell
    let normalizedRadius;
    const random = Math.random();
    
    if (i < count * coreSize) {
        // Dense core - distribute within inner radius
        normalizedRadius = Math.pow(random, 0.5) * 0.3;
    } else {
        // Explosion wave - distribute with more particles at the outer shell
        normalizedRadius = 0.3 + Math.pow(random, outerDensity) * 0.7;
    }
    
    // Scale to max radius
    const radius = normalizedRadius * maxRadius;
    
    // Convert spherical to Cartesian coordinates
    return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
        Math.cos(phi) * radius
    );
}

function createKleinBottle(i, count) {
    // Klein Bottle parameters
    const a = 15;          // Main radius
    const b = 4;           // Tube radius
    const scale = 2.5;     // Overall scale
    
    // Use uniform distribution across the surface
    const lengthSteps = Math.ceil(Math.sqrt(count * 0.5));
    const circSteps = Math.ceil(count / lengthSteps);
    
    // Calculate position in the parametric space
    const lengthIndex = i % lengthSteps;
    const circIndex = Math.floor(i / lengthSteps) % circSteps;
    
    // Normalize to appropriate ranges
    const u = (lengthIndex / lengthSteps) * Math.PI * 2;  // 0 to 2π
    const v = (circIndex / circSteps) * Math.PI * 2;      // 0 to 2π
    
    // Klein Bottle parametric equation
    let x, y, z;
    
    // The Klein Bottle has different regions with different parametric equations
    if (u < Math.PI) {
        // First half (handle and transition region)
        x = scale * (a * (1 - Math.cos(u) / 2) * Math.cos(v) - b * Math.sin(u) / 2);
        y = scale * (a * (1 - Math.cos(u) / 2) * Math.sin(v));
        z = scale * (a * Math.sin(u) / 2 + b * Math.sin(u) * Math.cos(v));
    } else {
        // Second half (main bottle body)
        x = scale * (a * (1 + Math.cos(u) / 2) * Math.cos(v) + b * Math.sin(u) / 2);
        y = scale * (a * (1 + Math.cos(u) / 2) * Math.sin(v));
        z = scale * (-a * Math.sin(u) / 2 + b * Math.sin(u) * Math.cos(v));
    }
    
    return new THREE.Vector3(x, y, z);
}

function createFlower(i, count) {
    // Flower/Dandelion parameters
    const numPetals = 12;          // Number of petals
    const petalLength = 25;        // Length of petals
    const centerRadius = 10;       // Radius of center sphere
    const petalWidth = 0.3;        // Width of petals (0-1)
    const petalCurve = 0.6;        // How much petals curve outward (0-1)
    
    // Calculate whether this particle is in the center or on a petal
    const centerParticleCount = Math.floor(count * 0.3); // 30% of particles in center
    const isCenter = i < centerParticleCount;
    
    if (isCenter) {
        // Center particles form a sphere
        const t = i / centerParticleCount;
        const phi = Math.acos(2 * t - 1);
        const theta = 2 * Math.PI * i * (1 + Math.sqrt(5)); // Golden ratio distribution
        
        // Create a sphere for the center
        return new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * centerRadius,
            Math.sin(phi) * Math.sin(theta) * centerRadius,
            Math.cos(phi) * centerRadius
        );
    } else {
        // Petal particles
        const petalParticleCount = count - centerParticleCount;
        const petalIndex = i - centerParticleCount;
        
        // Determine which petal this particle belongs to
        const petalId = petalIndex % numPetals;
        const positionInPetal = Math.floor(petalIndex / numPetals) / Math.floor(petalParticleCount / numPetals);
        
        // Calculate angle of this petal
        const petalAngle = (petalId / numPetals) * Math.PI * 2;
        
        // Calculate radial distance from center
        // Use a curve so particles are denser at tip and base
        const radialT = Math.pow(positionInPetal, 0.7); // Adjust density along petal
        const radialDist = centerRadius + (petalLength * radialT);
        
        // Calculate width displacement (thicker at base, thinner at tip)
        const widthFactor = petalWidth * (1 - radialT * 0.7);
        const randomWidth = (Math.random() * 2 - 1) * widthFactor * petalLength;
        
        // Calculate curve displacement (petals curve outward)
        const curveFactor = petalCurve * Math.sin(positionInPetal * Math.PI);
        
        // Convert to Cartesian coordinates
        // Main direction follows the petal angle
        const x = Math.cos(petalAngle) * radialDist + 
                 Math.cos(petalAngle + Math.PI/2) * randomWidth;
        
        const y = Math.sin(petalAngle) * radialDist + 
                 Math.sin(petalAngle + Math.PI/2) * randomWidth;
        
        // Z coordinate creates the upward curve of petals
        const z = curveFactor * petalLength * (1 - Math.cos(positionInPetal * Math.PI));
        
        return new THREE.Vector3(x, y, z);
    }
}

function createFractalTree(i, count) {
    // Fractal Tree parameters
    const trunkLength = 35;        // Initial trunk length
    const branchRatio = 0.67;      // Each branch is this ratio of parent length
    const maxDepth = 6;            // Maximum branching depth
    const branchAngle = Math.PI / 5; // Angle between branches (36 degrees)
    
    // Pre-calculate the total particles needed per depth level
    // Distribute particles more towards deeper levels
    const particlesPerLevel = [];
    let totalWeight = 0;
    
    for (let depth = 0; depth <= maxDepth; depth++) {
        // More branches at deeper levels, distribute particles accordingly
        // Each level has 2^depth branches
        const branches = Math.pow(2, depth);
        const weight = branches * Math.pow(branchRatio, depth);
        totalWeight += weight;
        particlesPerLevel.push(weight);
    }
    
    // Normalize to get actual count per level
    let cumulativeCount = 0;
    const particleCount = [];
    
    for (let depth = 0; depth <= maxDepth; depth++) {
        const levelCount = Math.floor((particlesPerLevel[depth] / totalWeight) * count);
        particleCount.push(levelCount);
        cumulativeCount += levelCount;
    }
    
    // Adjust the last level to ensure we use exactly count particles
    particleCount[maxDepth] += (count - cumulativeCount);
    
    // Determine which depth level this particle belongs to
    let depth = 0;
    let levelStartIndex = 0;
    
    while (depth < maxDepth && i >= levelStartIndex + particleCount[depth]) {
        levelStartIndex += particleCount[depth];
        depth++;
    }
    
    // Calculate the relative index within this depth level
    const indexInLevel = i - levelStartIndex;
    const levelCount = particleCount[depth];
    
    // Calculate position parameters
    const t = indexInLevel / (levelCount || 1); // Normalized position in level
    
    // For the trunk (depth 0)
    if (depth === 0) {
        // Simple line for the trunk
        return new THREE.Vector3(
            (Math.random() * 2 - 1) * 0.5, // Small random spread for thickness
            -trunkLength / 2 + t * trunkLength,
            (Math.random() * 2 - 1) * 0.5  // Small random spread for thickness
        );
    }
    
    // For branches at higher depths
    // Determine which branch in the current depth
    const branchCount = Math.pow(2, depth);
    const branchIndex = Math.floor(t * branchCount) % branchCount;
    const positionInBranch = (t * branchCount) % 1;
    
    // Calculate the position based on branch path
    let x = 0, y = trunkLength / 2, z = 0; // Start at top of trunk
    let currentLength = trunkLength;
    let currentAngle = 0;
    
    // For the first depth level (branching from trunk)
    if (depth >= 1) {
        currentLength *= branchRatio;
        // Determine left or right branch
        currentAngle = (branchIndex % 2 === 0) ? branchAngle : -branchAngle;
        
        // Move up the branch
        x += Math.sin(currentAngle) * currentLength * positionInBranch;
        y += Math.cos(currentAngle) * currentLength * positionInBranch;
    }
    
    // For higher depths, calculate the full path
    for (let d = 2; d <= depth; d++) {
        currentLength *= branchRatio;
        
        // Determine branch direction at this depth
        // Use bit operations to determine left vs right at each branch
        const pathBit = (branchIndex >> (depth - d)) & 1;
        const nextAngle = pathBit === 0 ? branchAngle : -branchAngle;
        
        // Only apply movement for the branches we've completed
        if (d < depth) {
            // Rotate the current direction and move full branch length
            currentAngle += nextAngle;
            x += Math.sin(currentAngle) * currentLength;
            y += Math.cos(currentAngle) * currentLength;
        } else {
            // For the final branch, move partially based on positionInBranch
            currentAngle += nextAngle;
            x += Math.sin(currentAngle) * currentLength * positionInBranch;
            y += Math.cos(currentAngle) * currentLength * positionInBranch;
        }
    }
    
    // Add small random offsets for volume
    const randomSpread = 0.8 * (1 - Math.pow(branchRatio, depth));
    x += (Math.random() * 2 - 1) * randomSpread;
    z += (Math.random() * 2 - 1) * randomSpread;
    
    return new THREE.Vector3(x, y, z);
}

function createVoronoi(i, count) {
    // Voronoi parameters
    const radius = 30;            // Maximum radius of the sphere to place points on
    const numSites = 25;          // Number of Voronoi sites (cells)
    const cellThickness = 2.5;    // Thickness of the cell boundaries
    const jitter = 0.5;           // Random jitter to make edges look more natural
    
    // First, we generate fixed pseudorandom Voronoi sites (cell centers)
    // We use a deterministic approach to ensure sites are the same for each call
    const sites = [];
    for (let s = 0; s < numSites; s++) {
        // Use a specific seed formula for each site to ensure repeatability
        const seed1 = Math.sin(s * 42.5) * 10000;
        const seed2 = Math.cos(s * 15.3) * 10000;
        const seed3 = Math.sin(s * 33.7) * 10000;
        
        // Generate points on a sphere using spherical coordinates
        const theta = 2 * Math.PI * (seed1 - Math.floor(seed1));
        const phi = Math.acos(2 * (seed2 - Math.floor(seed2)) - 1);
        
        sites.push(new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * radius,
            Math.sin(phi) * Math.sin(theta) * radius,
            Math.cos(phi) * radius
        ));
    }
    
    // Now we generate points that lie primarily along the boundaries between Voronoi cells
    
    // First, decide if this is a site point (center of a cell) or a boundary point
    const sitePoints = Math.min(numSites, Math.floor(count * 0.1)); // 10% of points are sites
    
    if (i < sitePoints) {
        // Place this point at a Voronoi site center
        const siteIndex = i % sites.length;
        const site = sites[siteIndex];
        
        // Return the site position with small random variation
        return new THREE.Vector3(
            site.x + (Math.random() * 2 - 1) * jitter,
            site.y + (Math.random() * 2 - 1) * jitter,
            site.z + (Math.random() * 2 - 1) * jitter
        );
    } else {
        // This is a boundary point
        // Generate a random point on the sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        const point = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * radius,
            Math.sin(phi) * Math.sin(theta) * radius,
            Math.cos(phi) * radius
        );
        
        // Find the two closest sites to this point
        let closestDist = Infinity;
        let secondClosestDist = Infinity;
        let closestSite = null;
        let secondClosestSite = null;
        
        for (const site of sites) {
            const dist = point.distanceTo(site);
            
            if (dist < closestDist) {
                secondClosestDist = closestDist;
                secondClosestSite = closestSite;
                closestDist = dist;
                closestSite = site;
            } else if (dist < secondClosestDist) {
                secondClosestDist = dist;
                secondClosestSite = site;
            }
        }
        
        // Check if this point is near the boundary between the two closest cells
        const distDiff = Math.abs(closestDist - secondClosestDist);
        
        if (distDiff < cellThickness) {
            // This point is on a boundary
            
            // Add small random jitter to make the boundary look more natural
            point.x += (Math.random() * 2 - 1) * jitter;
            point.y += (Math.random() * 2 - 1) * jitter;
            point.z += (Math.random() * 2 - 1) * jitter;
            
            // Project the point back onto the sphere
            point.normalize().multiplyScalar(radius);
            
            return point;
        } else {
            // Not a boundary point, retry with a different approach
            // Move the point slightly toward the boundary
            const midpoint = new THREE.Vector3().addVectors(closestSite, secondClosestSite).multiplyScalar(0.5);
            const dirToMid = new THREE.Vector3().subVectors(midpoint, point).normalize();
            
            // Move point toward the midpoint between cells
            point.add(dirToMid.multiplyScalar(distDiff * 0.7));
            
            // Add small random jitter
            point.x += (Math.random() * 2 - 1) * jitter;
            point.y += (Math.random() * 2 - 1) * jitter;
            point.z += (Math.random() * 2 - 1) * jitter;
            
            // Project back onto the sphere
            point.normalize().multiplyScalar(radius);
            
            return point;
        }
    }
}

function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
    );

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// --- COLOR PALETTES ---
const colorPalettes = [
    [ new THREE.Color(0x3399ff), new THREE.Color(0x44ccff), new THREE.Color(0x0055cc) ],
    [ new THREE.Color(0xff3399), new THREE.Color(0xcc00ff), new THREE.Color(0x660099), new THREE.Color(0xaa33ff) ],
    [ new THREE.Color(0x33ff99), new THREE.Color(0x33ff99), new THREE.Color(0x99ff66), new THREE.Color(0x008844) ],
    [ new THREE.Color(0xff9933), new THREE.Color(0xffcc33), new THREE.Color(0xff6600), new THREE.Color(0xffaa55) ],
    [ new THREE.Color(0x9933ff), new THREE.Color(0xff66aa), new THREE.Color(0xff0066), new THREE.Color(0xcc0055) ]
];

// --- PARTICLE SYSTEM ---
function createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.particleCount * 3);
    const colors = new Float32Array(params.particleCount * 3);
    const sizes = new Float32Array(params.particleCount);

    const initialPattern = patterns[0];
    const initialPalette = colorPalettes[0];

    for (let i = 0; i < params.particleCount; i++) {

    const pos = initialPattern(i, params.particleCount);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    const baseColor = initialPalette[0];
    const variation = 1.0; // Add variation

    colors[i * 3] = baseColor.r * variation;
    colors[i * 3 + 1] = baseColor.g * variation;
    colors[i * 3 + 2] = baseColor.b * variation;

    sizes[i] = 1.0; // Assign individual size variation
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // Store base sizes
    geometry.userData.currentColors = new Float32Array(colors); // Store initial colors for transitions

    const material = new THREE.PointsMaterial({
    size: params.particleSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true, // Make distant particles smaller

    //map: createParticleTexture()
    // depthWrite: false // Often needed with AdditiveBlending if particles overlap strangely
    });
    return new THREE.Points(geometry, material);

}