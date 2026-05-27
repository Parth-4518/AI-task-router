import { Router, type Request, type Response } from "express";
import type { Db } from "@paperclipai/db";

export function helloWorldRoutes(db: Db) {
  const router = Router();

  /**
   * GET /api/hello-world
   */
  router.get("/hello-world", async (req: Request, res: Response) => {
    const html = generateHelloWorldHtml();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  /**
   * GET /api/good-morning
   */
  router.get("/good-morning", async (req: Request, res: Response) => {
    const html = generateGoodMorningHtml();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  /**
   * GET /api/portfolio
   */
  router.get("/portfolio", async (req: Request, res: Response) => {
    const html = generatePortfolioHtml();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  return router;
}

function generateHelloWorldHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World - Paperclip AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 90%;
        }
        h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            animation: fadeInDown 1s ease-out;
        }
        .subtitle {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            animation: fadeInUp 1s ease-out 0.5s both;
        }
        .info {
            background: rgba(255, 255, 255, 0.15);
            padding: 1.5rem;
            border-radius: 10px;
            margin-top: 2rem;
            text-align: center;
            animation: fadeIn 1s ease-out 1s both;
        }
        .info p {
            font-size: 1.1rem;
            line-height: 1.6;
            color: #fff;
        }
        .timestamp { margin-top: 2rem; font-size: 0.9rem; opacity: 0.7; animation: fadeIn 1s ease-out 1.5s both; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .emoji { font-size: 4rem; margin-bottom: 1rem; animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🎉</div>
        <h1>Hello World!</h1>
        <p class="subtitle">Welcome to Paperclip AI</p>
        <div class="info">
            <p>Welcome to the Paperclip AI ecosystem — where tasks become reality through intelligent agent collaboration.</p>
        </div>
        <p class="timestamp">Generated on: ${new Date().toLocaleString()}<br>By: Paperclip AI Router</p>
    </div>
</body>
</html>`;
}

function generateGoodMorningHtml(): string {
  const hour = new Date().getHours();
  let greeting = "Good Morning";
  let emoji = "🌅";
  if (hour >= 12 && hour < 17) { greeting = "Good Afternoon"; emoji = "☀️"; }
  else if (hour >= 17) { greeting = "Good Evening"; emoji = "🌆"; }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${greeting} - Paperclip AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #333;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(10px);
            border-radius: 30px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            max-width: 700px;
            width: 90%;
            animation: slideIn 1s ease-out;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        .emoji { font-size: 6rem; margin-bottom: 1rem; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        h1 { font-size: 3rem; margin-bottom: 0.5rem; color: #e74c3c; }
        .subtitle { font-size: 1.3rem; color: #666; margin-bottom: 2rem; }
        .quote {
            font-style: italic;
            font-size: 1.1rem;
            color: #555;
            padding: 1.5rem;
            background: rgba(254, 207, 239, 0.3);
            border-radius: 15px;
            margin: 1rem 0;
            border-left: 4px solid #e74c3c;
        }
        .timestamp { margin-top: 2rem; font-size: 0.9rem; color: #888; }
        .sun-rays {
            position: fixed;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,200,100,0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
            pointer-events: none;
            z-index: -1;
        }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="sun-rays"></div>
    <div class="container">
        <div class="emoji">${emoji}</div>
        <h1>${greeting}!</h1>
        <p class="subtitle">Have a wonderful day ahead</p>
        <div class="quote">
            "Every day is a fresh start. Embrace it with a smile and make it amazing!"
        </div>
        <p class="timestamp">Generated on: ${new Date().toLocaleString()}<br>By: Paperclip AI Router</p>
    </div>
</body>
</html>`;
}

function generatePortfolioHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio - Paperclip AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #667eea;
            --secondary: #764ba2;
            --dark: #1a1a2e;
            --light: #f8f9fa;
            --glass: rgba(255,255,255,0.1);
        }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, var(--dark) 0%, #16213e 100%);
            color: white;
            overflow-x: hidden;
        }
        nav {
            position: fixed;
            top: 0; width: 100%;
            padding: 1rem 5%;
            background: rgba(26,26,46,0.9);
            backdrop-filter: blur(10px);
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo { font-size: 1.5rem; font-weight: bold; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-links { display: flex; gap: 2rem; list-style: none; }
        .nav-links a { color: white; text-decoration: none; transition: color 0.3s; }
        .nav-links a:hover { color: var(--primary); }
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
            position: relative;
        }
        .hero::before {
            content: '';
            position: absolute;
            width: 300px; height: 300px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        .hero-content { position: relative; z-index: 1; }
        .profile-img {
            width: 150px; height: 150px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex; align-items: center; justify-content: center;
            font-size: 4rem; margin: 0 auto 1.5rem;
            box-shadow: 0 10px 40px rgba(102,126,234,0.4);
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        .typing-text {
            font-size: 3rem; font-weight: bold;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            min-height: 3.5rem;
        }
        .subtitle { font-size: 1.2rem; color: #aaa; margin: 1rem 0 2rem; }
        .cta-btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white; text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(102,126,234,0.4); }
        section { padding: 5rem 10%; }
        .section-title {
            font-size: 2.5rem; text-align: center; margin-bottom: 3rem;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .about-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
            align-items: center;
        }
        .about-card {
            background: var(--glass);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 2rem;
        }
        .skill-bar { margin: 1rem 0; }
        .skill-bar label { display: block; margin-bottom: 0.5rem; }
        .skill-track {
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
        }
        .skill-fill {
            height: 100%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 4px;
            animation: fillBar 2s ease-out forwards;
            width: 0;
        }
        @keyframes fillBar { to { width: var(--width); } }
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        .project-card {
            background: var(--glass);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 2rem;
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
        }
        .project-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(102,126,234,0.2);
        }
        .project-tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        .tag {
            padding: 4px 12px;
            background: rgba(102,126,234,0.2);
            border-radius: 15px;
            font-size: 0.8rem;
            color: var(--primary);
        }
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }
        .service-card {
            background: var(--glass);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s;
        }
        .service-card:hover {
            transform: scale(1.05);
            border-color: var(--primary);
        }
        .service-icon { font-size: 3rem; margin-bottom: 1rem; }
        .contact-form {
            max-width: 600px;
            margin: 0 auto;
            background: var(--glass);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 3rem;
        }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #aaa; }
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: white;
            font-size: 1rem;
        }
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        .submit-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .submit-btn:hover { transform: translateY(-2px); }
        footer {
            text-align: center;
            padding: 2rem;
            background: rgba(26,26,46,0.9);
            color: #888;
        }
        .social-links { display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; }
        .social-links a {
            width: 40px; height: 40px;
            border-radius: 50%;
            background: var(--glass);
            display: flex; align-items: center; justify-content: center;
            color: white; text-decoration: none;
            transition: all 0.3s;
        }
        .social-links a:hover { background: var(--primary); transform: translateY(-3px); }
        @media (max-width: 768px) {
            .about-grid { grid-template-columns: 1fr; }
            .typing-text { font-size: 2rem; }
            .nav-links { display: none; }
            section { padding: 3rem 5%; }
        }
        .fade-in {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s, transform 0.6s;
        }
        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Portfolio</div>
        <ul class="nav-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>

    <section class="hero" id="home">
        <div class="hero-content">
            <div class="profile-img">👨‍💻</div>
            <h1 class="typing-text" id="typing"></h1>
            <p class="subtitle">Full Stack Developer | UI/UX Designer | Creative Thinker</p>
            <a href="#contact" class="cta-btn">Hire Me →</a>
        </div>
    </section>

    <section id="about">
        <h2 class="section-title">About Me</h2>
        <div class="about-grid">
            <div class="about-card">
                <h3>🎯 Skills</h3>
                <div class="skill-bar">
                    <label>JavaScript / TypeScript</label>
                    <div class="skill-track"><div class="skill-fill" style="--width:95%"></div></div>
                </div>
                <div class="skill-bar">
                    <label>React / Next.js</label>
                    <div class="skill-track"><div class="skill-fill" style="--width:90%"></div></div>
                </div>
                <div class="skill-bar">
                    <label>Node.js / Python</label>
                    <div class="skill-track"><div class="skill-fill" style="--width:85%"></div></div>
                </div>
                <div class="skill-bar">
                    <label>UI/UX Design</label>
                    <div class="skill-track"><div class="skill-fill" style="--width:88%"></div></div>
                </div>
            </div>
            <div class="about-card">
                <h3>📖 Experience</h3>
                <p style="line-height:1.8; color:#ccc;">
                    Passionate developer with expertise in building modern web applications.
                    Experienced in full-stack development, from responsive frontends to scalable backends.
                    Love creating intuitive user experiences with clean, maintainable code.
                </p>
                <div style="margin-top:1.5rem; display:flex; gap:1rem;">
                    <div style="text-align:center;">
                        <div style="font-size:2rem; font-weight:bold; color:var(--primary);">50+</div>
                        <div style="font-size:0.9rem; color:#888;">Projects</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:2rem; font-weight:bold; color:var(--primary);">5+</div>
                        <div style="font-size:0.9rem; color:#888;">Years Exp</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:2rem; font-weight:bold; color:var(--primary);">30+</div>
                        <div style="font-size:0.9rem; color:#888;">Clients</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="projects">
        <h2 class="section-title">Projects</h2>
        <div class="projects-grid">
            <div class="project-card fade-in">
                <h3>🛒 E-Commerce Platform</h3>
                <p style="color:#aaa; margin:1rem 0;">Full-stack shopping platform with real-time inventory, payment integration, and admin dashboard.</p>
                <div class="project-tags">
                    <span class="tag">React</span>
                    <span class="tag">Node.js</span>
                    <span class="tag">MongoDB</span>
                    <span class="tag">Stripe</span>
                </div>
            </div>
            <div class="project-card fade-in">
                <h3>📱 Task Management App</h3>
                <p style="color:#aaa; margin:1rem 0;">Collaborative project management tool with real-time updates, drag-and-drop, and team analytics.</p>
                <div class="project-tags">
                    <span class="tag">Next.js</span>
                    <span class="tag">TypeScript</span>
                    <span class="tag">PostgreSQL</span>
                    <span class="tag">WebSocket</span>
                </div>
            </div>
            <div class="project-card fade-in">
                <h3>🤖 AI Chatbot Interface</h3>
                <p style="color:#aaa; margin:1rem 0;">Intelligent conversational UI with natural language processing and multi-agent routing.</p>
                <div class="project-tags">
                    <span class="tag">OpenAI</span>
                    <span class="tag">Express</span>
                    <span class="tag">Redis</span>
                    <span class="tag">Docker</span>
                </div>
            </div>
        </div>
    </section>

    <section id="services">
        <h2 class="section-title">Services</h2>
        <div class="services-grid">
            <div class="service-card fade-in">
                <div class="service-icon">💻</div>
                <h3>Web Development</h3>
                <p style="color:#aaa;">Custom websites and web applications built with modern technologies.</p>
            </div>
            <div class="service-card fade-in">
                <div class="service-icon">🎨</div>
                <h3>UI/UX Design</h3>
                <p style="color:#aaa;">User-centered design with prototyping, wireframes, and design systems.</p>
            </div>
            <div class="service-card fade-in">
                <div class="service-icon">📱</div>
                <h3>Responsive Design</h3>
                <p style="color:#aaa;">Mobile-first approach ensuring perfect experience on all devices.</p>
            </div>
            <div class="service-card fade-in">
                <div class="service-icon">⚡</div>
                <h3>Performance</h3>
                <p style="color:#aaa;">Optimization for speed, SEO, and Core Web Vitals.</p>
            </div>
        </div>
    </section>

    <section id="contact">
        <h2 class="section-title">Contact</h2>
        <div class="contact-form">
            <div class="form-group">
                <label>Name</label>
                <input type="text" placeholder="Your name">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label>Message</label>
                <textarea rows="5" placeholder="Tell me about your project..."></textarea>
            </div>
            <button class="submit-btn">Send Message ✉️</button>
        </div>
    </section>

    <footer>
        <p>© 2026 Portfolio. Built with Paperclip AI 🚀</p>
        <div class="social-links">
            <a href="#">GH</a>
            <a href="#">LI</a>
            <a href="#">TW</a>
            <a href="#">IG</a>
        </div>
    </footer>

    <script>
        const text = "Hi, I'm a Developer";
        const typingEl = document.getElementById('typing');
        let i = 0;
        function type() {
            if (i < text.length) {
                typingEl.textContent += text.charAt(i);
                i++;
                setTimeout(type, 100);
            }
        }
        type();

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    </script>
</body>
</html>`;
}
