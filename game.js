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
        width: 800,
        height: 600,
        wireframes: false,
        background: '#87CEEB'
    }
});

// Create ground
const ground = Bodies.rectangle(400, 590, 810, 20, { 
    isStatic: true,
    render: { fillStyle: '#2c3e50' }
});

// Create the ball (bird)
const ball = Bodies.circle(150, 400, 20, {
    density: 0.004,
    restitution: 0.6,
    friction: 0.1,
    render: { fillStyle: '#e74c3c' }
});

// Create the slingshot
const sling = Constraint.create({
    pointA: { x: 150, y: 400 },
    bodyB: ball,
    stiffness: 0.05,
    damping: 0.01,
    length: 0
});

// Create blocks for the structure
const blocks = [];
const blockColors = ['#3498db', '#e67e22', '#2ecc71', '#9b59b6'];

// Create pyramid structure
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4 - i; j++) {
        const block = Bodies.rectangle(
            500 + j * 50 + i * 25,
            500 - i * 50,
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

// Event listener for mouse release
Events.on(mouseConstraint, 'enddrag', function(event) {
    if (event.body === ball && !ballLaunched) {
        ballLaunched = true;
        // Calculate launch velocity based on drag distance
        const velocity = {
            x: (ball.position.x - 150) * 0.1,
            y: (ball.position.y - 400) * 0.1
        };
        Body.setVelocity(ball, velocity);
        
        // Remove the slingshot constraint after launch
        setTimeout(() => {
            World.remove(world, sling);
        }, 100);
    }
});

// Reset game function
const resetGame = () => {
    World.remove(world, ball);
    const newBall = Bodies.circle(150, 400, 20, {
        density: 0.004,
        render: { fillStyle: '#e74c3c' }
    });
    
    const newSling = Constraint.create({
        pointA: { x: 150, y: 400 },
        bodyB: newBall,
        stiffness: 0.05,
        length: 0
    });
    
    World.add(world, [newBall, newSling]);
    ballLaunched = false;
};

// Add reset functionality on 'R' key press
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
        resetGame();
    }
});

// Run the engine
Engine.run(engine);
Render.run(render);

// Add instructions text
const ctx = render.context;
ctx.font = '16px Arial';
ctx.fillStyle = '#000';
ctx.fillText('Drag the red ball to launch. Press R to reset.', 20, 30); 