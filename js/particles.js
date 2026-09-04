
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let animationId;

const config = {
    particleDensity: 10000,
    connectionDistance: 150,
    particleSpeed: 0.165,
    particleSize: { min: 1, max: 3 },

    colors: {
        light: {
            particle: '30, 58, 138',
            line: '30, 58, 138',
            particleOpacity: 0.2,
            lineOpacity: 0.05
        },
        dark: {
            particle: '255, 255, 255',
            line: '255, 255, 255',
            particleOpacity: 0.3,
            lineOpacity: 0.05
        }
    }
};

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * config.particleSpeed * 2;
        this.vy = (Math.random() - 0.5) * config.particleSpeed * 2;
        this.size = Math.random() * (config.particleSize.max - config.particleSize.min) + config.particleSize.min;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        this.x = Math.max(0, Math.min(width, this.x));
        this.y = Math.max(0, Math.min(height, this.y));
    }

    draw(isDark) {
        const color = isDark ? config.colors.dark.particle : config.colors.light.particle;
        const opacity = isDark ? config.colors.dark.particleOpacity : config.colors.light.particleOpacity;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${opacity})`;
        ctx.fill();
    }
}

function createParticles() {
    particles = [];
    const count = Math.floor((width * height) / config.particleDensity);

    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function drawConnections(isDark) {
    const color = isDark ? config.colors.dark.line : config.colors.light.line;
    const baseOpacity = isDark ? config.colors.dark.lineOpacity : config.colors.light.lineOpacity;

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < config.connectionDistance) {

                const opacity = baseOpacity * (1 - distance / config.connectionDistance);

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(${color}, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }
}

function animate() {

    const isDark = false;

    ctx.clearRect(0, 0, width, height);

    particles.forEach(particle => {
        particle.update();
        particle.draw(isDark);
    });

    drawConnections(isDark);

    animationId = requestAnimationFrame(animate);
}

function resize() {

    const parent = canvas.parentElement || document.documentElement;
    width = parent.clientWidth || window.innerWidth;
    height = parent.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    createParticles();
}

function initParticles() {
    if (!canvas) return;
    resize();
    animate();
}

window.addEventListener('resize', () => {
    cancelAnimationFrame(animationId);
    resize();
    animate();
});

initParticles();
