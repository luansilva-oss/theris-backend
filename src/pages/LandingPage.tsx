import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Users, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import './LandingPage.css';

const DOC_URL = 'https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0';

export default function LandingPage() {
  const navigate = useNavigate();
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSections((prev) => {
          const next = new Set(prev);
          entries.forEach((e) => {
            const i = Number((e.target as HTMLElement).dataset.section);
            if (!Number.isNaN(i) && e.isIntersecting) next.add(i);
          });
          return next;
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* NAVBAR — full width, fixa */}
      <nav className={`landing-nav ${navbarScrolled ? 'landing-nav--scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <a href="#" className="landing-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src="/favicon.png" alt="Theris" className="landing-logo-img" />
            <span>Theris OS</span>
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

      {/* HERO — 100vh, centralizado */}
      <section className="landing-hero" ref={setSectionRef(0)} data-section={0}>
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-hero-content">
          <div className={`landing-hero-badge ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            🔐 Identity Governance & Administration
          </div>
          <h1 className={`landing-hero-title ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            <span className="landing-hero-title-line1">Controle total de</span>
            <span className="landing-hero-title-line2">identidades e acessos.</span>
          </h1>
          <p className={`landing-hero-subtitle ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            O sistema interno de IGA do Grupo 3C. Automatize acessos, aprovações e auditoria em um único lugar.
          </p>
          <div className={`landing-hero-buttons ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            <button type="button" className="landing-btn-primary" onClick={() => navigate('/login')}>
              Acessar o Sistema <ArrowRight size={18} />
            </button>
            <a href={DOC_URL} target="_blank" rel="noopener noreferrer" className="landing-btn-secondary">
              Ver Documentação <ExternalLink size={18} />
            </a>
          </div>
          <div className={`landing-hero-logo-wrap ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            <img src="/favicon.png" alt="" className="landing-hero-logo-img" />
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="landing-section landing-section-func" ref={setSectionRef(1)} data-section={1}>
        <p className={`landing-label ${visibleSections.has(1) ? 'landing-visible' : ''}`}>FUNCIONALIDADES</p>
        <h2 className={`landing-section-title ${visibleSections.has(1) ? 'landing-visible' : ''}`}>
          Um sistema completamente <span className="landing-gradient-text">integrado</span>
        </h2>
        <p className={`landing-section-lead ${visibleSections.has(1) ? 'landing-visible' : ''}`}>
          Centralize identidades, acessos e aprovações com o Theris OS.
        </p>
        <div className="landing-cards-grid landing-cards-three">
          {[
            { icon: Lock, title: 'Controle de Acessos', desc: 'Gerencie quem tem acesso a quê. Kit Básico por cargo e Acessos Extraordinários com aprovação dupla.' },
            { icon: Users, title: 'Gestão de Pessoas', desc: 'Onboarding, movimentações e desligamentos com automação completa e rastreabilidade total.' },
            { icon: FileText, title: 'Auditoria Completa', desc: 'Histórico detalhado de todas as ações, relatórios CSV e conformidade com políticas de segurança.' },
          ].map((item, i) => (
            <div
              key={item.title}
              className={`landing-card ${visibleSections.has(1) ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="landing-card-icon">
                <item.icon size={28} color="#0EA5E9" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="landing-section landing-section-como" ref={setSectionRef(2)} data-section={2}>
        <p className={`landing-label ${visibleSections.has(2) ? 'landing-visible' : ''}`}>COMO FUNCIONA</p>
        <h2 className={`landing-section-title ${visibleSections.has(2) ? 'landing-visible' : ''}`}>
          Do pedido ao acesso em minutos
        </h2>
        <div className="landing-steps-grid">
          {[
            { num: 1, title: 'Solicitação', desc: 'Colaborador solicita acesso via /acessos no Slack em segundos.' },
            { num: 2, title: 'Aprovação Dupla', desc: 'Owner da ferramenta aprova via Slack. Time de SI aprova no painel.' },
            { num: 3, title: 'Provisionamento', desc: 'Acesso concedido automaticamente no sistema. JumpCloud sincronizado.' },
            { num: 4, title: 'Auditoria', desc: 'Tudo registrado: quem pediu, quem aprovou, quando e por quanto tempo.' },
          ].map((step, i) => (
            <div
              key={step.num}
              className={`landing-step ${visibleSections.has(2) ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="landing-step-num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PERFIS */}
      <section id="perfis" className="landing-section landing-section-perfis" ref={setSectionRef(3)} data-section={3}>
        <p className={`landing-label ${visibleSections.has(3) ? 'landing-visible' : ''}`}>PERFIS</p>
        <h2 className={`landing-section-title ${visibleSections.has(3) ? 'landing-visible' : ''}`}>
          Perfis de Acesso
        </h2>
        <div className="landing-cards-grid landing-cards-four">
          {[
            { name: 'VIEWER', label: 'Colaborador padrão', desc: 'Visualiza seus acessos, acompanha chamados e solicita permissões extraordinárias.', color: '#64748B' },
            { name: 'ADMIN', label: 'Gestores e Líderes', desc: 'Gerencia equipe, aprova chamados e configura estrutura organizacional.', color: '#0EA5E9' },
            { name: 'SUPER_ADMIN', label: 'Time de SI', desc: 'Acesso total: aprovações, auditoria, relatórios e configurações do sistema.', color: '#7C3AED' },
            { name: 'APPROVER', label: 'Owners de Ferramentas', desc: 'Aprova solicitações de Acesso Extraordinário para as ferramentas sob sua responsabilidade.', color: '#059669' },
          ].map((profile, i) => (
            <div
              key={profile.name}
              className={`landing-profile-card ${visibleSections.has(3) ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${i * 100}ms`, ['--profile-color' as string]: profile.color }}
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
      <section id="documentacao" className="landing-section landing-section-doc" ref={setSectionRef(4)} data-section={4}>
        <div className={`landing-doc-wrap ${visibleSections.has(4) ? 'landing-visible' : ''}`}>
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
            <span>Theris OS</span>
          </div>
          <p className="landing-footer-copy">Grupo 3C © 2026</p>
          <p className="landing-footer-dev">Desenvolvido pelo Time de Segurança da Informação</p>
        </div>
      </footer>
    </div>
  );
}
