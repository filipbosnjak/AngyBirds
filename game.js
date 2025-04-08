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
    // Remove old ball
    World.remove(world, ball);

    // Only clear blocks if we're not in edit mode and there are no blocks
    if (!isEditMode && blocks.length === 0) {
        createBlocks();
    }

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
    
    // Add new ball and sling to the world
    World.add(world, [newBall, newSling]);
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

// Add CSS to ensure proper display
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';

// Game state
let isEditMode = false;
let selectedBlockColor = blockColors[0];
let selectedBlockShape = 'square'; // Default shape
let isDraggingNewBlock = false;
let tempBlock = null;

// Block shapes configuration
const blockShapes = {
    square: {
        width: 45,
        height: 45,
        name: 'Square'
    },
    rectangle: {
        width: 90,
        height: 30,
        name: 'Rectangle'
    },
    longBoard: {
        width: 120,
        height: 20,
        name: 'Long Board'
    },
    tallRect: {
        width: 30,
        height: 90,
        name: 'Tall Rectangle'
    }
};

// Create block based on selected shape
const createBlock = (x, y, color, shape = selectedBlockShape) => {
    const shapeConfig = blockShapes[shape];
    return Bodies.rectangle(
        x,
        y,
        shapeConfig.width * gameDimensions.scale,
        shapeConfig.height * gameDimensions.scale,
        {
            render: { fillStyle: color },
            density: 0.001,
            friction: 0.5,
            restitution: 0.2
        }
    );
};

// Create edit mode controls
const createEditControls = () => {
    // Create edit mode container
    const editControls = document.createElement('div');
    editControls.id = 'editControls';
    editControls.style.position = 'fixed';
    editControls.style.top = '10px';
    editControls.style.left = '10px';
    editControls.style.padding = '10px';
    editControls.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    editControls.style.borderRadius = '5px';
    editControls.style.display = 'none';
    editControls.style.zIndex = '1000';
    editControls.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    // Create shape selector
    const shapeContainer = document.createElement('div');
    shapeContainer.style.marginBottom = '10px';
    shapeContainer.style.display = 'flex';
    shapeContainer.style.gap = '5px';
    shapeContainer.style.flexWrap = 'wrap';

    Object.entries(blockShapes).forEach(([shapeKey, shapeConfig]) => {
        const shapeBtn = document.createElement('button');
        shapeBtn.textContent = shapeConfig.name;
        shapeBtn.style.padding = '5px 10px';
        shapeBtn.style.backgroundColor = '#e0e0e0';
        shapeBtn.style.border = '2px solid transparent';
        shapeBtn.style.borderRadius = '4px';
        shapeBtn.style.cursor = 'pointer';
        shapeBtn.style.fontSize = '12px';
        if (shapeKey === selectedBlockShape) {
            shapeBtn.style.border = '2px solid black';
        }
        shapeBtn.onclick = () => {
            selectedBlockShape = shapeKey;
            // Reset all borders
            shapeContainer.querySelectorAll('button').forEach(btn =>
                btn.style.border = '2px solid transparent'
            );
            // Highlight selected shape
            shapeBtn.style.border = '2px solid black';
        };
        shapeContainer.appendChild(shapeBtn);
    });
    editControls.appendChild(shapeContainer);

    // Create color selector
    const colorContainer = document.createElement('div');
    colorContainer.style.marginBottom = '10px';
    colorContainer.style.display = 'flex';
    colorContainer.style.gap = '5px';
    colorContainer.style.flexWrap = 'wrap';

    blockColors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.style.width = '30px';
        colorBtn.style.height = '30px';
        colorBtn.style.backgroundColor = color;
        colorBtn.style.border = '2px solid transparent';
        colorBtn.style.borderRadius = '4px';
        colorBtn.style.cursor = 'pointer';
        colorBtn.onclick = () => {
            selectedBlockColor = color;
            // Reset all borders
            colorContainer.querySelectorAll('button').forEach(btn =>
                btn.style.border = '2px solid transparent'
            );
            // Highlight selected color
            colorBtn.style.border = '2px solid black';
        };
        colorContainer.appendChild(colorBtn);
    });
    editControls.appendChild(colorContainer);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';

    // Add "Done" button
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done';
    doneBtn.style.padding = '8px 16px';
    doneBtn.style.backgroundColor = '#4CAF50';
    doneBtn.style.color = 'white';
    doneBtn.style.border = 'none';
    doneBtn.style.borderRadius = '4px';
    doneBtn.style.cursor = 'pointer';
    doneBtn.onclick = () => toggleEditMode(false);
    buttonContainer.appendChild(doneBtn);

    // Add "Clear All" button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear All';
    clearBtn.style.padding = '8px 16px';
    clearBtn.style.backgroundColor = '#f44336';
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.onclick = () => {
        blocks.forEach(block => World.remove(world, block));
        blocks.length = 0;
    };
    buttonContainer.appendChild(clearBtn);

    editControls.appendChild(buttonContainer);
    document.body.appendChild(editControls);

    // Create edit mode toggle button
    const editButton = document.createElement('button');
    editButton.id = 'editButton';
    editButton.textContent = 'Edit Level';
    editButton.style.position = 'fixed';
    editButton.style.top = '10px';
    editButton.style.right = '10px';
    editButton.style.padding = '8px 16px';
    editButton.style.backgroundColor = '#2196F3';
    editButton.style.color = 'white';
    editButton.style.border = 'none';
    editButton.style.borderRadius = '4px';
    editButton.style.cursor = 'pointer';
    editButton.style.zIndex = '1000';
    editButton.onclick = () => toggleEditMode(true);
    document.body.appendChild(editButton);
};

// Toggle edit mode
const toggleEditMode = (enable) => {
    isEditMode = enable;
    const editControls = document.getElementById('editControls');
    const resetButton = document.getElementById('resetButton');
    const editButton = document.getElementById('editButton');

    editControls.style.display = enable ? 'block' : 'none';
    resetButton.style.display = enable ? 'none' : 'block';
    editButton.style.display = enable ? 'none' : 'block';

    if (enable) {
        // Remove ball and sling in edit mode
        if (ball && !ballLaunched) World.remove(world, ball);
        if (sling) World.remove(world, sling);
    } else {
        // Restore game state
        resetGame();
    }
};

// Modify mouse events to handle edit mode
Events.on(mouseConstraint, 'mousedown', function (event) {
    if (isEditMode && !isDraggingNewBlock) {
        const mousePosition = mouse.position;
        tempBlock = createBlock(mousePosition.x, mousePosition.y, selectedBlockColor);
        World.add(world, tempBlock);
        isDraggingNewBlock = true;
    }
});

Events.on(mouseConstraint, 'mousemove', function (event) {
    if (isEditMode && isDraggingNewBlock && tempBlock) {
        Body.setPosition(tempBlock, mouse.position);
    }
});

Events.on(mouseConstraint, 'mouseup', function (event) {
    if (isEditMode && isDraggingNewBlock && tempBlock) {
        blocks.push(tempBlock);
        isDraggingNewBlock = false;
        tempBlock = null;
    }
});

// Add edit controls to initialization
createEditControls(); 