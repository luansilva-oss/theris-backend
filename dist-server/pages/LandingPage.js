"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LandingPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
require("./LandingPage.css");
const PRIMARY = '#0EA5E9';
const PRIMARY_DARK = '#0284C7';
const PRIMARY_LIGHT = '#38BDF8';
const BG_DARK = '#0F172A';
const BG_CARD = '#1E293B';
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "landing-page", children: [(0, jsx_runtime_1.jsx)("nav", { className: `landing-nav ${navbarScrolled ? 'landing-nav--scrolled' : ''}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "landing-nav-inner", children: [(0, jsx_runtime_1.jsxs)("div", { className: "landing-logo", children: [(0, jsx_runtime_1.jsx)("img", { src: "/favicon.png", alt: "Theris", className: "landing-logo-img" }), (0, jsx_runtime_1.jsx)("span", { children: "Theris OS" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "landing-btn-outline", onClick: () => navigate('/login'), children: "Entrar" })] }) }), (0, jsx_runtime_1.jsxs)("section", { className: "landing-hero", ref: setSectionRef(0), "data-section": 0, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-hero-grid", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("div", { className: "landing-hero-logo-bg", children: (0, jsx_runtime_1.jsx)("img", { src: "/favicon.png", alt: "" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "landing-hero-content", children: [(0, jsx_runtime_1.jsx)("div", { className: `landing-badge ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: "Sistema de Gest\u00E3o de Identidades" }), (0, jsx_runtime_1.jsx)("h1", { className: `landing-hero-title ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: "Theris OS" }), (0, jsx_runtime_1.jsx)("p", { className: `landing-hero-subtitle ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: "Automatize o controle de acessos, cargos e permiss\u00F5es do Grupo 3C em um \u00FAnico lugar." }), (0, jsx_runtime_1.jsxs)("div", { className: `landing-hero-buttons ${visibleSections.has(0) ? 'landing-visible' : ''}`, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "landing-btn-primary", onClick: () => navigate('/login'), children: ["Acessar o Sistema ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 18 })] }), (0, jsx_runtime_1.jsxs)("a", { href: "https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0", target: "_blank", rel: "noopener noreferrer", className: "landing-btn-ghost", children: ["Ver Documenta\u00E7\u00E3o ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 18 })] })] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "landing-section", ref: setSectionRef(1), "data-section": 1, children: [(0, jsx_runtime_1.jsx)("h2", { className: `landing-section-title ${visibleSections.has(1) ? 'landing-visible' : ''}`, children: "O que \u00E9 o Theris?" }), (0, jsx_runtime_1.jsx)("p", { className: `landing-section-lead ${visibleSections.has(1) ? 'landing-visible' : ''}`, children: "O Theris OS \u00E9 o sistema interno de Identity Governance & Administration (IGA) do Grupo 3C. Desenvolvido para substituir os controles manuais em planilhas, o Theris centraliza e automatiza toda a gest\u00E3o de identidades, acessos e permiss\u00F5es da empresa." }), (0, jsx_runtime_1.jsx)("div", { className: "landing-cards-three", children: [
                            { icon: lucide_react_1.Lock, title: 'Controle de Acessos', desc: 'Gerencie quem tem acesso a quê. Kit Básico por cargo e Acessos Extraordinários com aprovação dupla.' },
                            { icon: lucide_react_1.Users, title: 'Gestão de Pessoas', desc: 'Onboarding, movimentações e desligamentos com automação completa e rastreabilidade total.' },
                            { icon: lucide_react_1.FileCheck, title: 'Auditoria Completa', desc: 'Histórico detalhado de todas as ações, relatórios CSV e conformidade com políticas de segurança.' },
                        ].map((item, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `landing-card ${visibleSections.has(1) ? 'landing-visible' : ''}`, style: { transitionDelay: `${i * 80}ms` }, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-card-icon", style: { color: PRIMARY }, children: (0, jsx_runtime_1.jsx)(item.icon, { size: 28 }) }), (0, jsx_runtime_1.jsx)("h3", { children: item.title }), (0, jsx_runtime_1.jsx)("p", { children: item.desc })] }, item.title))) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "landing-section landing-section--alt", ref: setSectionRef(2), "data-section": 2, children: [(0, jsx_runtime_1.jsx)("h2", { className: `landing-section-title ${visibleSections.has(2) ? 'landing-visible' : ''}`, children: "Como funciona?" }), (0, jsx_runtime_1.jsx)("div", { className: "landing-steps", children: [
                            { num: 1, title: 'Solicitação', desc: 'Colaborador solicita acesso via /acessos no Slack em segundos.' },
                            { num: 2, title: 'Aprovação Dupla', desc: 'Owner da ferramenta aprova via Slack. Time de SI aprova no painel. Ambas as partes independentes.' },
                            { num: 3, title: 'Provisionamento', desc: 'Acesso concedido automaticamente no sistema. JumpCloud sincronizado.' },
                            { num: 4, title: 'Auditoria', desc: 'Tudo registrado: quem pediu, quem aprovou, quando e por quanto tempo.' },
                        ].map((step, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `landing-step ${visibleSections.has(2) ? 'landing-visible' : ''}`, style: { transitionDelay: `${i * 100}ms` }, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-step-num", style: { background: PRIMARY, color: '#fff' }, children: step.num }), (0, jsx_runtime_1.jsxs)("div", { className: "landing-step-body", children: [(0, jsx_runtime_1.jsx)("h3", { children: step.title }), (0, jsx_runtime_1.jsx)("p", { children: step.desc })] })] }, step.num))) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "landing-section", ref: setSectionRef(3), "data-section": 3, children: [(0, jsx_runtime_1.jsx)("h2", { className: `landing-section-title ${visibleSections.has(3) ? 'landing-visible' : ''}`, children: "Perfis de Acesso" }), (0, jsx_runtime_1.jsx)("div", { className: "landing-profiles", children: [
                            { name: 'VIEWER', label: 'Colaborador padrão', desc: 'Visualiza seus acessos, acompanha chamados e solicita permissões extraordinárias.', color: '#64748b' },
                            { name: 'ADMIN', label: 'Gestores e Líderes', desc: 'Gerencia equipe, aprova chamados e configura estrutura organizacional.', color: PRIMARY },
                            { name: 'SUPER_ADMIN', label: 'Time de SI', desc: 'Acesso total: aprovações, auditoria, relatórios e configurações do sistema.', color: '#f59e0b' },
                            { name: 'APPROVER', label: 'Owners de Ferramentas', desc: 'Aprova solicitações de Acesso Extraordinário para as ferramentas sob sua responsabilidade.', color: '#10b981' },
                        ].map((profile, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `landing-profile-card ${visibleSections.has(3) ? 'landing-visible' : ''}`, style: { transitionDelay: `${i * 80}ms`, borderTopColor: profile.color }, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-profile-badge", style: { color: profile.color }, children: profile.name }), (0, jsx_runtime_1.jsx)("h3", { children: profile.label }), (0, jsx_runtime_1.jsx)("p", { children: profile.desc })] }, profile.name))) })] }), (0, jsx_runtime_1.jsx)("section", { className: "landing-section landing-section--procedure", ref: setSectionRef(4), "data-section": 4, children: (0, jsx_runtime_1.jsxs)("div", { className: `landing-procedure-wrap ${visibleSections.has(4) ? 'landing-visible' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "landing-procedure-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 64, color: PRIMARY }) }), (0, jsx_runtime_1.jsx)("h2", { className: "landing-section-title", children: "Procedimento de Uso" }), (0, jsx_runtime_1.jsx)("p", { className: "landing-section-lead", children: "Acesse o guia completo com instru\u00E7\u00F5es detalhadas para todos os perfis de usu\u00E1rio." }), (0, jsx_runtime_1.jsxs)("a", { href: "https://docs.google.com/document/d/1AY1-VBGEXMwO4aFTMEMFloM6jNPZGoSaeuId5xPUTBI/edit?tab=t.0", target: "_blank", rel: "noopener noreferrer", className: "landing-btn-doc", children: ["Acessar Procedimento de Uso ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 20 })] })] }) }), (0, jsx_runtime_1.jsx)("footer", { className: "landing-footer", children: (0, jsx_runtime_1.jsxs)("div", { className: "landing-footer-inner", children: [(0, jsx_runtime_1.jsxs)("div", { className: "landing-logo", children: [(0, jsx_runtime_1.jsx)("img", { src: "/favicon.png", alt: "Theris", className: "landing-logo-img" }), (0, jsx_runtime_1.jsx)("span", { children: "Theris OS" })] }), (0, jsx_runtime_1.jsx)("p", { className: "landing-footer-copy", children: "Grupo 3C \u00A9 2026" }), (0, jsx_runtime_1.jsx)("p", { className: "landing-footer-dev", children: "Desenvolvido pelo Time de Seguran\u00E7a da Informa\u00E7\u00E3o" })] }) })] }));
}
