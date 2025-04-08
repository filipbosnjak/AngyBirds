// Matter.js module aliases
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Events = Matter.Events;

// Create engine and world
const engine = Engine.create();
const world = engine.world;

// Get the actual viewport height for mobile
const getViewportHeight = () => {
    return Math.min(window.innerHeight, document.documentElement.clientHeight);
};

// Create renderer
const canvas = document.getElementById('gameCanvas');
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: getViewportHeight(),
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio
    }
});

// Calculate positions based on viewport
const getGameDimensions = () => {
    const width = window.innerWidth;
    const height = getViewportHeight();
    const scale = Math.min(width / 800, height / 600); // Base scale on reference size
    return {
        width,
        height,
        scale,
        baseHeight: height - (height * 0.2), // 20% from bottom
        blockBaseX: width * 0.7, // 70% from left
        slingX: width * 0.2 // 20% from left
    };
};

let gameDimensions = getGameDimensions();

// Create ground with proper dimensions
const ground = Bodies.rectangle(
    gameDimensions.width / 2,
    gameDimensions.height - 10,
    gameDimensions.width,
    20,
    {
        isStatic: true,
        render: { fillStyle: '#2c3e50' }
    }
);

// Create the ball (bird)
let ball = Bodies.circle(
    gameDimensions.slingX,
    gameDimensions.baseHeight,
    25 * gameDimensions.scale,
    {
        density: 0.004,
        restitution: 0.6,
        friction: 0.1,
        render: { fillStyle: '#e74c3c' }
    }
);

// Create the slingshot
let sling = Constraint.create({
    pointA: {
        x: gameDimensions.slingX,
        y: gameDimensions.baseHeight
    },
    bodyB: ball,
    stiffness: 0.01,
    damping: 0.001,
    length: 0
});

// Create blocks for the structure
const blocks = [];
const blockColors = ['#3498db', '#e67e22', '#2ecc71', '#9b59b6'];

// Create pyramid structure
const createBlocks = () => {
    const blockSize = 45 * gameDimensions.scale;
    const spacing = blockSize * 1.25;
    const baseX = gameDimensions.blockBaseX;
    const baseY = gameDimensions.baseHeight;

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4 - i; j++) {
            const block = Bodies.rectangle(
                baseX + j * spacing + i * (spacing / 2),
                baseY - i * spacing,
                blockSize,
                blockSize,
                {
                    render: { fillStyle: blockColors[i] }
                }
            );
            blocks.push(block);
        }
    }
};

createBlocks();

// Add mouse/touch control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    },
    collisionFilter: {
        mask: 0x0001
    }
});

// Enable touch events in the mouse
mouse.pixelRatio = window.devicePixelRatio;

// Update mouse position based on touch
render.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    mouse.position.x = touch.clientX - rect.left;
    mouse.position.y = touch.clientY - rect.top;
    mouse.mousedown = true;
});

render.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    mouse.position.x = touch.clientX - rect.left;
    mouse.position.y = touch.clientY - rect.top;
});

render.canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    mouse.mousedown = false;
});

// Add all objects to the world
World.add(world, [ground, ball, sling, mouseConstraint, ...blocks]);

// Keep track of whether the ball has been launched
let ballLaunched = false;
let initialPull = null;

// Event listener for start drag
Events.on(mouseConstraint, 'startdrag', function (event) {
    if (event.body === ball) {
        initialPull = null;
    }
});

// Event listener for mouse drag
Events.on(mouseConstraint, 'mousemove', function (event) {
    if (!ballLaunched && mouseConstraint.body === ball) {
        const anchorX = gameDimensions.slingX;
        const anchorY = gameDimensions.baseHeight;

        // Record initial pull direction if not set
        if (!initialPull) {
            initialPull = {
                x: Math.sign(ball.position.x - anchorX),
                y: Math.sign(ball.position.y - anchorY)
            };
        }

        // Check if ball has crossed back over anchor point in opposite direction
        const currentPull = {
            x: Math.sign(ball.position.x - anchorX),
            y: Math.sign(ball.position.y - anchorY)
        };

        if (initialPull && (initialPull.x !== 0 && initialPull.x !== currentPull.x)) {
            // Ball has crossed back over anchor point, release it
            ballLaunched = true;
            const pullDistance = {
                x: ball.position.x - anchorX,
                y: ball.position.y - anchorY
            };

            // Calculate stretch distance
            const stretchDistance = Math.sqrt(pullDistance.x * pullDistance.x + pullDistance.y * pullDistance.y);
            // Linear scale factor proportional to stretch distance
            const scaleFactor = Math.min(stretchDistance * 0.002, 0.3);

            const velocity = {
                x: -pullDistance.x * scaleFactor,
                y: -pullDistance.y * scaleFactor
            };

            Body.setVelocity(ball, velocity);
            World.remove(world, sling);
            mouseConstraint.constraint.bodyB = null;
        }
    }
});

// Event listener for mouse release (as backup)
Events.on(mouseConstraint, 'enddrag', function(event) {
    if (event.body === ball && !ballLaunched) {
        ballLaunched = true;
        const anchorX = gameDimensions.slingX;
        const anchorY = gameDimensions.baseHeight;
        const pullDistance = {
            x: ball.position.x - anchorX,
            y: ball.position.y - anchorY
        };

        // Calculate stretch distance
        const stretchDistance = Math.sqrt(pullDistance.x * pullDistance.x + pullDistance.y * pullDistance.y);
        // Linear scale factor proportional to stretch distance
        const scaleFactor = Math.min(stretchDistance * 0.002, 0.3);

        const velocity = {
            x: -pullDistance.x * scaleFactor,
            y: -pullDistance.y * scaleFactor
        };

        Body.setVelocity(ball, velocity);
        World.remove(world, sling);
    }
});

// Reset game function
const resetGame = () => {
    // Remove old ball and blocks
    World.remove(world, ball);
    blocks.forEach(block => World.remove(world, block));
    blocks.length = 0;

    // Create new ball at the correct height
    const newBall = Bodies.circle(
        gameDimensions.slingX,
        gameDimensions.baseHeight,
        25 * gameDimensions.scale,
        {
            density: 0.004,
            restitution: 0.6,
            friction: 0.1,
            render: { fillStyle: '#e74c3c' }
        }
    );
    
    // Create new sling
    const newSling = Constraint.create({
        pointA: {
            x: gameDimensions.slingX,
            y: gameDimensions.baseHeight
        },
        bodyB: newBall,
        stiffness: 0.01,
        damping: 0.001,
        length: 0
    });

    // Recreate blocks
    createBlocks();
    
    // Add all new objects to the world
    World.add(world, [newBall, newSling, ...blocks]);
    ballLaunched = false;
    initialPull = null;

    // Update the ball reference for the event handlers
    mouseConstraint.body = null;
    ball = newBall;
    sling = newSling;
};

// Add reset functionality on 'R' key press and button click
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
        resetGame();
    }
});

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', resetGame);

// Handle window resize and orientation change
const handleResize = () => {
    // Pause the engine temporarily
    Matter.Runner.stop(engine.runner);

    // Update dimensions
    gameDimensions = getGameDimensions();
    const height = getViewportHeight();

    // Update render dimensions
    render.canvas.width = window.innerWidth;
    render.canvas.height = height;
    render.options.width = window.innerWidth;
    render.options.height = height;

    // Store current world bodies
    const allBodies = Matter.Composite.allBodies(world);

    // Update ground position without removing it
    Body.setPosition(ground, {
        x: gameDimensions.width / 2,
        y: gameDimensions.height - 10
    });
    Body.setVertices(ground, Bodies.rectangle(
        gameDimensions.width / 2,
        gameDimensions.height - 10,
        gameDimensions.width,
        20
    ).vertices);

    // Update ball and sling positions
    if (!ballLaunched && ball) {
        Body.setPosition(ball, {
            x: gameDimensions.slingX,
            y: gameDimensions.baseHeight
        });
        if (sling) {
            sling.pointA = {
                x: gameDimensions.slingX,
                y: gameDimensions.baseHeight
            };
        }
    }

    // Update blocks positions relative to new dimensions
    blocks.forEach((block, index) => {
        const blockSize = 45 * gameDimensions.scale;
        const spacing = blockSize * 1.25;
        const row = Math.floor(index / 4);
        const col = index % (4 - row);

        Body.setPosition(block, {
            x: gameDimensions.blockBaseX + col * spacing + row * (spacing / 2),
            y: gameDimensions.baseHeight - row * spacing
        });
    });

    // Update render bounds
    render.bounds.min.x = 0;
    render.bounds.min.y = 0;
    render.bounds.max.x = window.innerWidth;
    render.bounds.max.y = height;

    // Update mouse
    mouse.element = render.canvas;
    mouse.pixelRatio = window.devicePixelRatio;

    // Resume the engine
    Matter.Runner.start(engine.runner, engine);

    // Force a render update
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: window.innerWidth, y: height }
    });
};

// Handle orientation change with proper timing
window.addEventListener('orientationchange', () => {
    // Wait for the browser to finish orientation change
    setTimeout(() => {
        handleResize();
        // Force an additional update after a short delay
        setTimeout(() => {
            handleResize();
        }, 100);
    }, 500);
});

// Add debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        handleResize();
    }, 250);
});

// Run the engine
Engine.run(engine);
Render.run(render); 