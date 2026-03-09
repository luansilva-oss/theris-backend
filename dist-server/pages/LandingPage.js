"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LandingPage;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Landing page institucional. Apenas conteúdo de marketing + botão "Entrar" que navega para /login.
 * Nenhum componente de login é importado ou renderizado aqui.
 */
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
require("./LandingPage.css");
const DOC_URL = 'https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0';
function LandingPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [navbarScrolled, setNavbarScrolled] = (0, react_1.useState)(false);
    const sectionRefs = (0, react_1.useRef)([]);
    const [visibleSections, setVisibleSections] = (0, react_1.useState)(new Set());
    (0, react_1.useEffect)(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = prev; };
    }, []);
    (0, react_1.useEffect)(() => {
        const onScroll = () => setNavbarScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    (0, react_1.useEffect)(() => {
        const observer = new IntersectionObserver((entries) => {
            setVisibleSections((prev) => {
                const next = new Set(prev);
                entries.forEach((e) => {
                    const i = Number(e.target.dataset.section);
                    if (!Number.isNaN(i) && e.isIntersecting)
                        next.add(i);
                });
                return next;
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
        sectionRefs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);
    const setSectionRef = (i) => (el) => {
        sectionRefs.current[i] = el;
    };
    const scrollTo = (id) => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "landing-page", children: [(0, jsx_runtime_1.jsx)("nav", { className: `landing-nav ${navbarScrolled ? 'landing-nav--scrolled' : ''}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "landing-nav-inner", children: [(0, jsx_runtime_1.jsxs)("a", { href: "#", className: "landing-logo", onClick: (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, children: [(0, jsx_runtime_1.jsx)("img", { src: "/favicon.png", alt: "Theris", className: "landing-logo-img" }), (0, jsx_runtime_1.jsx)("span", { children: "Theris OS" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "landing-nav-links", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "landing-nav-link", onClick: () => scrollTo('funcionalidades'), children: "Funcionalidades" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "landing-nav-link", onClick: () => scrollTo('como-funciona'), children: "Como Funciona" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "landing-nav-link", onClick: () => scrollTo('perfis'), children: "Perfis" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "landing-nav-link", onClick: () => scrollTo('documentacao'), children: "Documenta\u00E7\u00E3o" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "landing-btn-entrar", onClick: () => navigate('/login'), children: "Entrar" })] }) }), (0, jsx_runtime_1.jsxs)("section", { className: "landing-hero", ref: setSectionRef(0), "data-section": 0, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-hero-glow", "aria-hidden": true }), (0, jsx_runtime_1.jsxs)("div", { className: "landing-hero-content", children: [(0, jsx_runtime_1.jsx)("div", { className: `landing-hero-badge ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: "\uD83D\uDD10 Identity Governance & Administration" }), (0, jsx_runtime_1.jsxs)("h1", { className: `landing-hero-title ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "landing-hero-title-line1", children: "Controle total de" }), (0, jsx_runtime_1.jsx)("span", { className: "landing-hero-title-line2", children: "identidades e acessos." })] }), (0, jsx_runtime_1.jsx)("p", { className: `landing-hero-subtitle ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: "O sistema interno de IGA do Grupo 3C. Automatize acessos, aprova\u00E7\u00F5es e auditoria em um \u00FAnico lugar." }), (0, jsx_runtime_1.jsxs)("div", { className: `landing-hero-buttons ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "landing-btn-primary", onClick: () => navigate('/login'), children: ["Acessar o Sistema ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 18 })] }), (0, jsx_runtime_1.jsxs)("a", { href: DOC_URL, target: "_blank", rel: "noopener noreferrer", className: "landing-btn-secondary", children: ["Ver Documenta\u00E7\u00E3o ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 18 })] })] }), (0, jsx_runtime_1.jsx)("div", { className: `landing-hero-logo-wrap ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: (0, jsx_runtime_1.jsx)("img", { src: "/favicon.png", alt: "", className: "landing-hero-logo-img" }) })] })] }), (0, jsx_runtime_1.jsxs)("section", { id: "funcionalidades", className: "landing-section landing-section-func", ref: setSectionRef(1), "data-section": 1, children: [(0, jsx_runtime_1.jsx)("p", { className: `landing-label ${visibleSections.has(1) ? 'landing-visible' : ''}`, children: "FUNCIONALIDADES" }), (0, jsx_runtime_1.jsxs)("h2", { className: `landing-section-title ${visibleSections.has(1) ? 'landing-visible' : ''}`, children: ["Um sistema completamente ", (0, jsx_runtime_1.jsx)("span", { className: "landing-gradient-text", children: "integrado" })] }), (0, jsx_runtime_1.jsx)("p", { className: `landing-section-lead ${visibleSections.has(1) ? 'landing-visible' : ''}`, children: "Centralize identidades, acessos e aprova\u00E7\u00F5es com o Theris OS." }), (0, jsx_runtime_1.jsx)("div", { className: "landing-cards-grid landing-cards-three", children: [
                            { icon: lucide_react_1.Lock, title: 'Controle de Acessos', desc: 'Gerencie quem tem acesso a quê. Kit Básico por cargo e Acessos Extraordinários com aprovação dupla.' },
                            { icon: lucide_react_1.Users, title: 'Gestão de Pessoas', desc: 'Onboarding, movimentações e desligamentos com automação completa e rastreabilidade total.' },
                            { icon: lucide_react_1.FileText, title: 'Auditoria Completa', desc: 'Histórico detalhado de todas as ações, relatórios CSV e conformidade com políticas de segurança.' },
                        ].map((item, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `landing-card ${visibleSections.has(1) ? 'landing-visible' : ''}`, style: { transitionDelay: `${i * 100}ms` }, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-card-icon", children: (0, jsx_runtime_1.jsx)(item.icon, { size: 28, color: "#0EA5E9" }) }), (0, jsx_runtime_1.jsx)("h3", { children: item.title }), (0, jsx_runtime_1.jsx)("p", { children: item.desc })] }, item.title))) })] }), (0, jsx_runtime_1.jsxs)("section", { id: "como-funciona", className: "landing-section landing-section-como", ref: setSectionRef(2), "data-section": 2, children: [(0, jsx_runtime_1.jsx)("p", { className: `landing-label ${visibleSections.has(2) ? 'landing-visible' : ''}`, children: "COMO FUNCIONA" }), (0, jsx_runtime_1.jsx)("h2", { className: `landing-section-title ${visibleSections.has(2) ? 'landing-visible' : ''}`, children: "Do pedido ao acesso em minutos" }), (0, jsx_runtime_1.jsx)("div", { className: "landing-steps-grid", children: [
                            { num: 1, title: 'Solicitação', desc: 'Colaborador solicita acesso via /acessos no Slack em segundos.' },
                            { num: 2, title: 'Aprovação Dupla', desc: 'Owner da ferramenta aprova via Slack. Time de SI aprova no painel.' },
                            { num: 3, title: 'Provisionamento', desc: 'Acesso concedido automaticamente no sistema. JumpCloud sincronizado.' },
                            { num: 4, title: 'Auditoria', desc: 'Tudo registrado: quem pediu, quem aprovou, quando e por quanto tempo.' },
                        ].map((step, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `landing-step ${visibleSections.has(2) ? 'landing-visible' : ''}`, style: { transitionDelay: `${i * 100}ms` }, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-step-num", children: step.num }), (0, jsx_runtime_1.jsx)("h3", { children: step.title }), (0, jsx_runtime_1.jsx)("p", { children: step.desc })] }, step.num))) })] }), (0, jsx_runtime_1.jsxs)("section", { id: "perfis", className: "landing-section landing-section-perfis", ref: setSectionRef(3), "data-section": 3, children: [(0, jsx_runtime_1.jsx)("p", { className: `landing-label ${visibleSections.has(3) ? 'landing-visible' : ''}`, children: "PERFIS" }), (0, jsx_runtime_1.jsx)("h2", { className: `landing-section-title ${visibleSections.has(3) ? 'landing-visible' : ''}`, children: "Perfis de Acesso" }), (0, jsx_runtime_1.jsx)("div", { className: "landing-cards-grid landing-cards-four", children: [
                            { name: 'VIEWER', label: 'Colaborador padrão', desc: 'Visualiza seus acessos, acompanha chamados e solicita permissões extraordinárias.', color: '#64748B' },
                            { name: 'ADMIN', label: 'Gestores e Líderes', desc: 'Gerencia equipe, aprova chamados e configura estrutura organizacional.', color: '#0EA5E9' },
                            { name: 'SUPER_ADMIN', label: 'Time de SI', desc: 'Acesso total: aprovações, auditoria, relatórios e configurações do sistema.', color: '#7C3AED' },
                            { name: 'APPROVER', label: 'Owners de Ferramentas', desc: 'Aprova solicitações de Acesso Extraordinário para as ferramentas sob sua responsabilidade.', color: '#059669' },
                        ].map((profile, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `landing-profile-card ${visibleSections.has(3) ? 'landing-visible' : ''}`, style: { transitionDelay: `${i * 100}ms`, ['--profile-color']: profile.color }, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-profile-bar" }), (0, jsx_runtime_1.jsx)("div", { className: "landing-profile-badge", children: profile.name }), (0, jsx_runtime_1.jsx)("h3", { children: profile.label }), (0, jsx_runtime_1.jsx)("p", { children: profile.desc })] }, profile.name))) })] }), (0, jsx_runtime_1.jsx)("section", { id: "documentacao", className: "landing-section landing-section-doc", ref: setSectionRef(4), "data-section": 4, children: (0, jsx_runtime_1.jsxs)("div", { className: `landing-doc-wrap ${visibleSections.has(4) ? 'landing-visible' : ''}`, children: [(0, jsx_runtime_1.jsx)("h2", { className: "landing-doc-title", children: "Procedimento de Uso" }), (0, jsx_runtime_1.jsx)("p", { className: "landing-doc-lead", children: "Acesse o guia completo com instru\u00E7\u00F5es detalhadas para todos os perfis de usu\u00E1rio." }), (0, jsx_runtime_1.jsxs)("a", { href: DOC_URL, target: "_blank", rel: "noopener noreferrer", className: "landing-btn-doc", children: ["Acessar Procedimento de Uso ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 20 })] })] }) }), (0, jsx_runtime_1.jsxs)("footer", { className: "landing-footer", children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-footer-sep" }), (0, jsx_runtime_1.jsxs)("div", { className: "landing-footer-inner", children: [(0, jsx_runtime_1.jsxs)("div", { className: "landing-logo", children: [(0, jsx_runtime_1.jsx)("img", { src: "/favicon.png", alt: "Theris", className: "landing-logo-img" }), (0, jsx_runtime_1.jsx)("span", { children: "Theris OS" })] }), (0, jsx_runtime_1.jsx)("p", { className: "landing-footer-copy", children: "Grupo 3C \u00A9 2026" }), (0, jsx_runtime_1.jsx)("p", { className: "landing-footer-dev", children: "Desenvolvido pelo Time de Seguran\u00E7a da Informa\u00E7\u00E3o" })] })] })] }));
}
