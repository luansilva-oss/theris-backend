"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OrgChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const react_2 = require("@xyflow/react");
require("@xyflow/react/dist/style.css");
require("../OrgChart.css"); // Adding for potential custom global styles
const dagre_1 = __importDefault(require("dagre"));
const lucide_react_1 = require("lucide-react");
const PersonNode_1 = __importDefault(require("./PersonNode"));
// Registrar o componente customizado
const nodeTypes = {
    personNode: PersonNode_1.default,
};
const dagreGraph = new dagre_1.default.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 240;
const nodeHeight = 100;
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    // nodesep: espaçamento entre irmãos, ranksep: espaçamento entre níveis
    dagreGraph.setGraph({ rankdir: direction, nodesep: 140, ranksep: 200, marginx: 50, marginy: 50 });
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre_1.default.layout(dagreGraph);
    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });
    return { nodes: layoutedNodes, edges };
};
function OrgChart({ users, onEditUser, onManagerChange }) {
    const [nodes, setNodes, onNodesChange] = (0, react_2.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, react_2.useEdgesState)([]);
    const [direction] = react_1.default.useState('TB');
    const [isLegendCollapsed, setIsLegendCollapsed] = react_1.default.useState(false);
    // Transformar usuários em nós e arestas para o React Flow
    const initialElements = (0, react_1.useMemo)(() => {
        const flowNodes = [];
        const flowEdges = [];
        // Mapear níveis de profundidade
        const levels = {};
        const calculateLevel = (uid) => {
            if (levels[uid] !== undefined)
                return levels[uid];
            const user = users.find(u => u.id === uid);
            if (!user || !user.managerId) {
                levels[uid] = 0;
                return 0;
            }
            levels[uid] = calculateLevel(user.managerId) + 1;
            return levels[uid];
        };
        const sortedUsers = [...users].sort((a, b) => {
            const levelA = calculateLevel(a.id);
            const levelB = calculateLevel(b.id);
            return levelA - levelB;
        });
        sortedUsers.forEach(user => {
            const level = calculateLevel(user.id);
            flowNodes.push({
                id: user.id,
                type: 'personNode',
                data: {
                    ...user,
                    isRoot: !user.managerId,
                    level,
                    onEdit: onEditUser,
                },
                position: { x: 0, y: 0 },
            });
            if (user.managerId) {
                flowEdges.push({
                    id: `e-${user.managerId}-${user.id}`,
                    source: user.managerId,
                    target: user.id,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#3f3f46', strokeWidth: 2 },
                });
            }
        });
        return getLayoutedElements(flowNodes, flowEdges, direction);
    }, [users, onEditUser, direction]);
    (0, react_1.useEffect)(() => {
        setNodes(initialElements.nodes);
        setEdges(initialElements.edges);
    }, [initialElements, setNodes, setEdges]);
    const onConnect = (0, react_1.useCallback)((params) => {
        if (params.source === params.target)
            return;
        setEdges((eds) => {
            const otherEdges = eds.filter((e) => e.target !== params.target);
            return (0, react_2.addEdge)({ ...params, type: 'smoothstep', style: { stroke: '#a78bfa', strokeWidth: 2 } }, otherEdges);
        });
        if (params.target && params.source) {
            onManagerChange(params.target, params.source);
        }
    }, [setEdges, onManagerChange]);
    return ((0, jsx_runtime_1.jsx)("div", { style: { width: '100%', height: 'calc(100vh - 200px)', background: '#09090b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1f1f22', position: 'relative' }, children: (0, jsx_runtime_1.jsxs)(react_2.ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, nodeTypes: nodeTypes, connectionMode: react_2.ConnectionMode.Loose, fitView: true, fitViewOptions: { padding: 0.2 }, minZoom: 0.05, maxZoom: 1.5, defaultEdgeOptions: {
                type: 'smoothstep',
                style: { stroke: '#4c1d95', strokeWidth: 2 },
            }, children: [(0, jsx_runtime_1.jsx)(react_2.Background, { gap: 28, color: "#2e1065", variant: react_2.BackgroundVariant.Dots, style: { opacity: 0.4 } }), (0, jsx_runtime_1.jsx)(react_2.Panel, { position: "bottom-left", style: { margin: 15 }, children: (0, jsx_runtime_1.jsx)(react_2.Controls, { showInteractive: false, style: {
                            background: '#1e1b4b',
                            border: '1px solid #7c3aed',
                            padding: 4,
                            borderRadius: 10,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                        } }) }), (0, jsx_runtime_1.jsx)(react_2.Panel, { position: "top-right", style: {
                        background: 'rgba(30, 27, 75, 0.85)',
                        backdropFilter: 'blur(12px)',
                        padding: isLegendCollapsed ? '10px' : '18px',
                        borderRadius: '14px',
                        border: '1px solid #4338ca',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        width: isLegendCollapsed ? 'auto' : '260px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        margin: 15,
                        cursor: 'default'
                    }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }, onClick: () => setIsLegendCollapsed(!isLegendCollapsed), children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5 }, children: !isLegendCollapsed && 'Legenda de Estrutura' }), isLegendCollapsed ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 18, color: "#a78bfa" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 18, color: "#a78bfa" })] }), !isLegendCollapsed && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [
                                            { color: '#fbbf24', label: 'Gestores e C-Level' },
                                            { color: '#10b981', label: 'Comercial / Vendas' },
                                            { color: '#3b82f6', label: 'Produto / Tecnologia' },
                                            { color: '#f472b6', label: 'Pessoas / Performance' },
                                            { color: '#8b5cf6', label: 'Financeiro / Outros' },
                                            { color: '#ef4444', label: 'Marketing / Growth' },
                                        ].map((item, idx) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: 4,
                                                        background: item.color,
                                                        boxShadow: `0 0 10px ${item.color}44`
                                                    } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: '#d1d5db', fontWeight: 500 }, children: item.label })] }, idx))) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                            marginTop: 4,
                                            padding: '10px',
                                            background: 'rgba(167, 139, 250, 0.1)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(167, 139, 250, 0.2)'
                                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }, children: ["\uD83D\uDCA1 ", (0, jsx_runtime_1.jsx)("strong", { children: "Dica:" }), " Arraste entre os c\u00EDrculos para mudar a hierarquia. Role para dar zoom."] }) })] }))] }) }), (0, jsx_runtime_1.jsx)(react_2.MiniMap, { style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }, maskColor: "rgba(0, 0, 0, 0.5)", nodeColor: (node) => {
                        return node.data.isRoot ? '#fbbf24' : '#7c3aed';
                    } })] }) }));
}
