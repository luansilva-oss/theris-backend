'use client';
/**
 * Landing page — Theris IAM & RH.
 * BackgroundCanvas usa useEffect + useRef (client-side).
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const DOC_URL = 'https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0';

/* ── BackgroundCanvas: canvas animado (useEffect + useRef) ── */
function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W: number, H: number;
    const particles: Array<{
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      reset: () => void;
      update: () => void;
      draw: () => void;
    }> = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawGrid() {
      const spacing = 60;
      ctx.strokeStyle = 'rgba(56,189,248,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    class Particle {
      x = 0;
      y = 0;
      r = 0;
      vx = 0;
      vy = 0;
      alpha = 0;
      color = '';

      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.r = Math.random() * 1.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.color = Math.random() > 0.5 ? '56,189,248' : '167,139,250';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) {
      const p = new Particle();
      p.reset();
      particles.push(p);
    }

    let rafId: number;
    function animate() {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.5);
      grad.addColorStop(0, 'rgba(56,189,248,0.04)');
      grad.addColorStop(0.5, 'rgba(167,139,250,0.03)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.strokeStyle = `rgba(56,189,248,${0.06 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas id="bg-canvas" ref={canvasRef} className="landing-bg-canvas" aria-hidden />;
}

const FEATURES = [
  { icon: '🏛️', title: 'Hierarquia Organizacional', desc: 'Estrutura de três níveis — Unidade, Departamento e Cargo — que reflete com precisão o organograma da empresa.', tag: 'Estrutura', iconClass: 'icon-cyan' },
  { icon: '🔄', title: 'Pipeline de Pessoas', desc: 'Onboarding e offboarding automatizados via Slack. Ativação e desativação de colaboradores sem intervenção manual.', tag: 'Automação', iconClass: 'icon-purple' },
  { icon: '🔐', title: 'Governança de Acessos', desc: 'Solicitação, aprovação e registro de acessos extraordinários com fluxo controlado pelo time de Segurança da Informação.', tag: 'Segurança', iconClass: 'icon-pink' },
  { icon: '📦', title: 'Kit Básico por Cargo (KBS)', desc: 'Cada cargo carrega um conjunto padrão de ferramentas atribuídas automaticamente no momento do onboarding.', tag: 'IAM', iconClass: 'icon-cyan' },
  { icon: '💬', title: 'Integração com Slack', desc: 'Comandos /pessoas e /acessos direto no Slack para disparar fluxos de RH e solicitar acessos em segundos.', tag: 'Integração', iconClass: 'icon-purple' },
  { icon: '📋', title: 'Catálogo de Ferramentas', desc: 'Visibilidade total sobre quais ferramentas cada colaborador possui, com histórico de acessos extraordinários por usuário.', tag: 'Auditoria', iconClass: 'icon-pink' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      <BackgroundCanvas />

      <nav className="landing-nav">
        <div className="logo">Ther<span>is</span></div>
        <div className="nav-links">
          <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Funcionalidades</a>
          <a href="#cta" onClick={(e) => { e.preventDefault(); scrollTo('cta'); }}>Contato</a>
        </div>
        <button type="button" className="btn-nav" onClick={() => navigate('/login')}>
          Entrar
        </button>
      </nav>

      <section id="hero" className="landing-hero">
        <div className="hero-badge">
          <span className="badge-dot" aria-hidden />
          IAM e RBAC · Grupo 3C
        </div>
        <h1>
          Governança de<br />
          <span className="glow-text">Identidades &amp; Pessoas</span>
          <br />
          em um só lugar.
        </h1>
        <p className="hero-sub">
          O Theris unifica controle de acessos, gestão de colaboradores e automação de RH — com rastreabilidade total e integração nativa ao Slack.
        </p>
        <div className="hero-actions">
          <a href="#features" className="btn-ghost" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>
            Conhecer Funcionalidades
          </a>
        </div>
        <div className="stats">
          <div className="stat-item"><div className="stat-num">3</div><div className="stat-label">Níveis hierárquicos</div></div>
          <div className="stat-item"><div className="stat-num">100%</div><div className="stat-label">Rastreabilidade de acessos</div></div>
          <div className="stat-item"><div className="stat-num">0</div><div className="stat-label">Aprovações manuais perdidas</div></div>
        </div>
      </section>

      <div className="divider" aria-hidden />

      <section id="features" className="landing-features">
        <p className="section-label">O que o Theris oferece</p>
        <h2 className="section-title">
          Tudo que você precisa para<br />gerenciar acesso e pessoas
        </h2>
        <p className="section-sub">
          Do onboarding ao offboarding, do Kit Básico ao acesso extraordinário — o Theris cobre cada etapa com automação e auditoria.
        </p>
        <div className="cards">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className={`card-icon ${f.iconClass}`}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>
                {f.title === 'Integração com Slack' ? (
                  <>Comandos <code>/pessoas</code> e <code>/acessos</code> direto no Slack para disparar fluxos de RH e solicitar acessos em segundos.</>
                ) : (
                  f.desc
                )}
              </p>
              <span className="card-tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="cta" className="landing-cta">
        <div className="cta-box">
          <h2>
            Pronto para levar a gestão<br />de acessos ao próximo nível?
          </h2>
          <p>Acesse a documentação oficial e aprenda a usar o Theris dentro do ecossistema do Grupo 3C.</p>
          <a href={DOC_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Acessar Documentação
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        Desenvolvido por <span>Theris · Grupo 3C</span> &nbsp;·&nbsp; Time de Segurança da Informação
      </footer>
    </div>
  );
}
