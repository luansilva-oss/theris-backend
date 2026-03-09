/**
 * Landing page institucional. Apenas conteúdo de marketing + botão "Entrar" que navega para /login.
 * Nenhum componente de login é importado ou renderizado aqui.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Users, FileText, ExternalLink } from 'lucide-react';
import './LandingPage.css';

const DOC_URL = 'https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0';

const PARTICLE_COUNT = 20;

function useParticles() {
  return useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 5,
    }));
  }, []);
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const particles = useParticles();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onScroll = () => setNavbarScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page" style={{ overflow: 'visible' }}>
      {/* Partículas flutuantes */}
      <div className="landing-particles" aria-hidden>
        {particles.map((p) => (
          <div
            key={p.id}
            className="landing-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* NAVBAR — full width, fixa */}
      <nav className={`landing-nav ${navbarScrolled ? 'landing-nav--scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <a href="#" className="landing-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src="/favicon.png" alt="Theris" className="landing-logo-img" />
            <span>THERIS</span>
          </a>
          <div className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('funcionalidades')}>Funcionalidades</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('como-funciona')}>Como Funciona</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('perfis')}>Perfis</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollTo('documentacao')}>Documentação</button>
          </div>
          <button type="button" className="landing-btn-entrar" onClick={() => navigate('/login')}>
            Entrar
          </button>
        </div>
      </nav>

      {/* FUNCIONALIDADES (primeira seção visível) */}
      <section id="funcionalidades" className="landing-section landing-section-func">
        <p className="landing-label">FUNCIONALIDADES</p>
        <h2 className="landing-section-title">
          Um sistema completamente <span className="landing-gradient-text">integrado</span>
        </h2>
        <p className="landing-section-lead">
          Centralize identidades, acessos e aprovações com o Theris OS.
        </p>
        <div className="landing-cards-grid landing-cards-three">
          {[
            { icon: Lock, title: 'Controle de Acessos', desc: 'Gerencie quem tem acesso a quê. Kit Básico por cargo e Acessos Extraordinários com aprovação dupla.' },
            { icon: Users, title: 'Gestão de Pessoas', desc: 'Onboarding, movimentações e desligamentos com automação completa e rastreabilidade total.' },
            { icon: FileText, title: 'Auditoria Completa', desc: 'Histórico detalhado de todas as ações, relatórios CSV e conformidade com políticas de segurança.' },
          ].map((item) => (
            <div key={item.title} className="landing-card">
              <div className="landing-card-icon">
                <item.icon size={24} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="landing-section landing-section-como">
        <p className="landing-label">COMO FUNCIONA</p>
        <h2 className="landing-section-title">
          Do pedido ao acesso em minutos
        </h2>
        <div className="landing-steps-grid">
          {[
            { num: 1, title: 'Solicitação', desc: 'Colaborador solicita acesso via /acessos no Slack em segundos.' },
            { num: 2, title: 'Aprovação Dupla', desc: 'Owner da ferramenta aprova via Slack. Time de SI aprova no painel.' },
            { num: 3, title: 'Provisionamento', desc: 'Acesso concedido automaticamente no sistema. JumpCloud sincronizado.' },
            { num: 4, title: 'Auditoria', desc: 'Tudo registrado: quem pediu, quem aprovou, quando e por quanto tempo.' },
          ].map((step) => (
            <div key={step.num} className="landing-step">
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PERFIS */}
      <section id="perfis" className="landing-section landing-section-perfis">
        <p className="landing-label">PERFIS</p>
        <h2 className="landing-section-title">
          Perfis de Acesso
        </h2>
        <div className="landing-cards-grid landing-cards-four">
          {[
            { name: 'VIEWER', label: 'Colaborador padrão', desc: 'Visualiza seus acessos, acompanha chamados e solicita permissões extraordinárias.', color: '#64748B' },
            { name: 'ADMIN', label: 'Gestores e Líderes', desc: 'Gerencia equipe, aprova chamados e configura estrutura organizacional.', color: '#0EA5E9' },
            { name: 'SUPER_ADMIN', label: 'Time de SI', desc: 'Acesso total: aprovações, auditoria, relatórios e configurações do sistema.', color: '#7C3AED' },
            { name: 'APPROVER', label: 'Owners de Ferramentas', desc: 'Aprova solicitações de Acesso Extraordinário para as ferramentas sob sua responsabilidade.', color: '#059669' },
          ].map((profile) => (
            <div
              key={profile.name}
              className="landing-profile-card"
              style={{ ['--profile-color' as string]: profile.color }}
            >
              <div className="landing-profile-bar" />
              <div className="landing-profile-badge">{profile.name}</div>
              <h3>{profile.label}</h3>
              <p>{profile.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROCEDIMENTO / DOCUMENTAÇÃO */}
      <section id="documentacao" className="landing-section landing-section-doc">
        <div className="landing-doc-wrap">
          <div className="landing-doc-icon">
            <FileText size={64} strokeWidth={1.5} />
          </div>
          <h2 className="landing-doc-title">Procedimento de Uso</h2>
          <p className="landing-doc-lead">
            Acesse o guia completo com instruções detalhadas para todos os perfis de usuário.
          </p>
          <a href={DOC_URL} target="_blank" rel="noopener noreferrer" className="landing-btn-doc">
            Acessar Procedimento de Uso <ExternalLink size={20} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-sep" />
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <img src="/favicon.png" alt="Theris" className="landing-logo-img" />
            <span>THERIS OS</span>
          </div>
          <p className="landing-footer-copy">Grupo 3C © 2026</p>
          <p className="landing-footer-dev">Desenvolvido pelo Time de Segurança da Informação</p>
        </div>
      </footer>
    </div>
  );
}
