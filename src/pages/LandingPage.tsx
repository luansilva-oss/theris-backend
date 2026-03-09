import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bird, Lock, Users, FileCheck, ArrowRight, ExternalLink, FileText } from 'lucide-react';
import './LandingPage.css';

const PRIMARY = '#0EA5E9';
const PRIMARY_DARK = '#0284C7';
const PRIMARY_LIGHT = '#38BDF8';
const BG_DARK = '#0F172A';
const BG_CARD = '#1E293B';

export default function LandingPage() {
  const navigate = useNavigate();
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const sectionRefs = useRef<HTMLElement[]>([]);
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
    sectionRefs.current[i] = el!;
  };

  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <nav className={`landing-nav ${navbarScrolled ? 'landing-nav--scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src="/favicon.png" alt="Theris" className="landing-logo-img" />
            <span>Theris OS</span>
          </div>
          <button
            type="button"
            className="landing-btn-outline"
            onClick={() => navigate('/login')}
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero" ref={setSectionRef(0)} data-section={0}>
        <div className="landing-hero-grid" aria-hidden />
        <div className="landing-hero-logo-bg">
          <img src="/favicon.png" alt="" />
        </div>
        <div className="landing-hero-content">
          <div className={`landing-badge ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            Sistema de Gestão de Identidades
          </div>
          <h1 className={`landing-hero-title ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            Theris OS
          </h1>
          <p className={`landing-hero-subtitle ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            Automatize o controle de acessos, cargos e permissões do Grupo 3C em um único lugar.
          </p>
          <div className={`landing-hero-buttons ${visibleSections.has(0) ? 'landing-visible' : ''}`}>
            <button type="button" className="landing-btn-primary" onClick={() => navigate('/login')}>
              Acessar o Sistema <ArrowRight size={18} />
            </button>
            <a
              href="https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-ghost"
            >
              Ver Documentação <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* O QUE É O THERIS */}
      <section className="landing-section" ref={setSectionRef(1)} data-section={1}>
        <h2 className={`landing-section-title ${visibleSections.has(1) ? 'landing-visible' : ''}`}>
          O que é o Theris?
        </h2>
        <p className={`landing-section-lead ${visibleSections.has(1) ? 'landing-visible' : ''}`}>
          O Theris OS é o sistema interno de Identity Governance & Administration (IGA) do Grupo 3C.
          Desenvolvido para substituir os controles manuais em planilhas, o Theris centraliza e automatiza
          toda a gestão de identidades, acessos e permissões da empresa.
        </p>
        <div className="landing-cards-three">
          {[
            { icon: Lock, title: 'Controle de Acessos', desc: 'Gerencie quem tem acesso a quê. Kit Básico por cargo e Acessos Extraordinários com aprovação dupla.' },
            { icon: Users, title: 'Gestão de Pessoas', desc: 'Onboarding, movimentações e desligamentos com automação completa e rastreabilidade total.' },
            { icon: FileCheck, title: 'Auditoria Completa', desc: 'Histórico detalhado de todas as ações, relatórios CSV e conformidade com políticas de segurança.' },
          ].map((item, i) => (
            <div
              key={item.title}
              className={`landing-card ${visibleSections.has(1) ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="landing-card-icon" style={{ color: PRIMARY }}>
                <item.icon size={28} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="landing-section landing-section--alt" ref={setSectionRef(2)} data-section={2}>
        <h2 className={`landing-section-title ${visibleSections.has(2) ? 'landing-visible' : ''}`}>
          Como funciona?
        </h2>
        <div className="landing-steps">
          {[
            { num: 1, title: 'Solicitação', desc: 'Colaborador solicita acesso via /acessos no Slack em segundos.' },
            { num: 2, title: 'Aprovação Dupla', desc: 'Owner da ferramenta aprova via Slack. Time de SI aprova no painel. Ambas as partes independentes.' },
            { num: 3, title: 'Provisionamento', desc: 'Acesso concedido automaticamente no sistema. JumpCloud sincronizado.' },
            { num: 4, title: 'Auditoria', desc: 'Tudo registrado: quem pediu, quem aprovou, quando e por quanto tempo.' },
          ].map((step, i) => (
            <div
              key={step.num}
              className={`landing-step ${visibleSections.has(2) ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="landing-step-num" style={{ background: PRIMARY, color: '#fff' }}>{step.num}</div>
              <div className="landing-step-body">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PERFIS DE ACESSO */}
      <section className="landing-section" ref={setSectionRef(3)} data-section={3}>
        <h2 className={`landing-section-title ${visibleSections.has(3) ? 'landing-visible' : ''}`}>
          Perfis de Acesso
        </h2>
        <div className="landing-profiles">
          {[
            { name: 'VIEWER', label: 'Colaborador padrão', desc: 'Visualiza seus acessos, acompanha chamados e solicita permissões extraordinárias.', color: '#64748b' },
            { name: 'ADMIN', label: 'Gestores e Líderes', desc: 'Gerencia equipe, aprova chamados e configura estrutura organizacional.', color: PRIMARY },
            { name: 'SUPER_ADMIN', label: 'Time de SI', desc: 'Acesso total: aprovações, auditoria, relatórios e configurações do sistema.', color: '#f59e0b' },
            { name: 'APPROVER', label: 'Owners de Ferramentas', desc: 'Aprova solicitações de Acesso Extraordinário para as ferramentas sob sua responsabilidade.', color: '#10b981' },
          ].map((profile, i) => (
            <div
              key={profile.name}
              className={`landing-profile-card ${visibleSections.has(3) ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${i * 80}ms`, borderTopColor: profile.color }}
            >
              <div className="landing-profile-badge" style={{ color: profile.color }}>{profile.name}</div>
              <h3>{profile.label}</h3>
              <p>{profile.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROCEDIMENTO DE USO */}
      <section className="landing-section landing-section--procedure" ref={setSectionRef(4)} data-section={4}>
        <div className={`landing-procedure-wrap ${visibleSections.has(4) ? 'landing-visible' : ''}`}>
          <div className="landing-procedure-icon">
            <FileText size={64} color={PRIMARY} />
          </div>
          <h2 className="landing-section-title">Procedimento de Uso</h2>
          <p className="landing-section-lead">
            Acesse o guia completo com instruções detalhadas para todos os perfis de usuário.
          </p>
          <a
            href="https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-btn-doc"
          >
            Acessar Procedimento de Uso <ExternalLink size={20} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
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
