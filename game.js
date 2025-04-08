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

// Create renderer
const canvas = document.getElementById('gameCanvas');
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
});

// Create ground
const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 10, window.innerWidth, 20, { 
    isStatic: true,
    render: { fillStyle: '#2c3e50' }
});

// Create the ball (bird)
let ball = Bodies.circle(250, window.innerHeight - 200, 20, {
    density: 0.004,
    restitution: 0.6,
    friction: 0.1,
    render: { fillStyle: '#e74c3c' }
});

// Create the slingshot
let sling = Constraint.create({
    pointA: { x: 250, y: window.innerHeight - 200 },
    bodyB: ball,
    stiffness: 0.01,
    damping: 0.001,
    length: 0
});

// Create blocks for the structure
const blocks = [];
const blockColors = ['#3498db', '#e67e22', '#2ecc71', '#9b59b6'];

// Create pyramid structure
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4 - i; j++) {
        const block = Bodies.rectangle(
            window.innerWidth - 300 + j * 50 + i * 25,
            window.innerHeight - 100 - i * 50,
            40,
            40,
            {
                render: { fillStyle: blockColors[i] }
            }
        );
        blocks.push(block);
    }
}

// Add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
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
        const anchorX = 250;
        const anchorY = window.innerHeight - 200;

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
        const anchorX = 250;
        const anchorY = window.innerHeight - 200;
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
    blocks.length = 0;  // Clear the blocks array

    // Create new ball
    const newBall = Bodies.circle(250, window.innerHeight - 200, 20, {
        density: 0.004,
        restitution: 0.6,
        friction: 0.1,
        render: { fillStyle: '#e74c3c' }
    });
    
    // Create new sling
    const newSling = Constraint.create({
        pointA: { x: 250, y: window.innerHeight - 200 },
        bodyB: newBall,
        stiffness: 0.01,
        damping: 0.001,
        length: 0
    });

    // Recreate pyramid structure
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4 - i; j++) {
            const block = Bodies.rectangle(
                window.innerWidth - 300 + j * 50 + i * 25,
                window.innerHeight - 100 - i * 50,
                40,
                40,
                {
                    render: { fillStyle: blockColors[i] }
                }
            );
            blocks.push(block);
        }
    }
    
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

// Run the engine
Engine.run(engine);
Render.run(render); 