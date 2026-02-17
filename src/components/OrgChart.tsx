import React, { useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Panel,
    Background,
    Controls,
    ConnectionMode,
    Node,
    BackgroundVariant,
    MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ChevronRight, ChevronDown, LayoutGrid, LayoutList } from 'lucide-react';

import PersonNode from './PersonNode';

// Registrar o componente customizado
const nodeTypes = {
    personNode: PersonNode,
};

interface OrgChartProps {
    users: any[];
    onEditUser: (user: any) => void;
    onManagerChange: (userId: string, newManagerId: string | null) => void;
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 100;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    // nodesep: espaçamento entre irmãos, ranksep: espaçamento entre níveis
    dagreGraph.setGraph({ rankdir: direction, nodesep: 140, ranksep: 200, marginx: 50, marginy: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

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

export default function OrgChart({ users, onEditUser, onManagerChange }: OrgChartProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [direction, setDirection] = React.useState<'TB' | 'LR'>('TB');
    const [isLegendCollapsed, setIsLegendCollapsed] = React.useState(false);

    // Transformar usuários em nós e arestas para o React Flow
    const initialElements = useMemo(() => {
        const flowNodes: any[] = [];
        const flowEdges: any[] = [];

        // Mapear níveis de profundidade
        const levels: Record<string, number> = {};
        const calculateLevel = (uid: string): number => {
            if (levels[uid] !== undefined) return levels[uid];
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

    useEffect(() => {
        setNodes(initialElements.nodes);
        setEdges(initialElements.edges);
    }, [initialElements, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            if (params.source === params.target) return;

            setEdges((eds) => {
                const otherEdges = eds.filter((e) => e.target !== params.target);
                return addEdge({ ...params, type: 'smoothstep', style: { stroke: '#a78bfa', strokeWidth: 2 } }, otherEdges);
            });

            if (params.target && params.source) {
                onManagerChange(params.target, params.source);
            }
        },
        [setEdges, onManagerChange]
    );

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 200px)', background: '#09090b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1f1f22', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.05}
                maxZoom={1.5}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    style: { stroke: '#4c1d95', strokeWidth: 2 },
                }}
            >
                <Background gap={28} color="#2e1065" variant={BackgroundVariant.Dots} style={{ opacity: 0.4 }} />

                <Panel position="bottom-left" style={{ margin: 15 }}>
                    <Controls style={{
                        background: '#1e1b4b',
                        border: '1px solid #4338ca',
                        padding: 4,
                        borderRadius: 10,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                    }} />
                </Panel>

                <Panel position="top-left" style={{ margin: 15 }}>
                    <button
                        onClick={() => setDirection(direction === 'TB' ? 'LR' : 'TB')}
                        style={{
                            background: '#2e1065',
                            border: '1px solid #7c3aed',
                            color: 'white',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s'
                        }}
                        className="hover:scale-105 active:scale-95"
                    >
                        {direction === 'TB' ? <LayoutList size={16} /> : <LayoutGrid size={16} />}
                        Layout {direction === 'TB' ? 'Vertical' : 'Horizontal'}
                    </button>
                </Panel>

                <Panel position="top-right" style={{
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
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                        >
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                {!isLegendCollapsed && 'Legenda de Estrutura'}
                            </div>
                            {isLegendCollapsed ? <ChevronRight size={18} color="#a78bfa" /> : <ChevronDown size={18} color="#a78bfa" />}
                        </div>

                        {!isLegendCollapsed && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { color: '#fbbf24', label: 'Gestores e C-Level' },
                                        { color: '#10b981', label: 'Comercial / Vendas' },
                                        { color: '#3b82f6', label: 'Produto / Tecnologia' },
                                        { color: '#f472b6', label: 'Pessoas / Performance' },
                                        { color: '#8b5cf6', label: 'Financeiro / Outros' },
                                        { color: '#ef4444', label: 'Marketing / Growth' },
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: 4,
                                                background: item.color,
                                                boxShadow: `0 0 10px ${item.color}44`
                                            }}></div>
                                            <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500 }}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: 4,
                                    padding: '10px',
                                    background: 'rgba(167, 139, 250, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(167, 139, 250, 0.2)'
                                }}>
                                    <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                                        💡 <strong>Dica:</strong> Arraste entre os círculos para mudar a hierarquia. Role para dar zoom.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Panel>
                <MiniMap
                    style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }}
                    maskColor="rgba(0, 0, 0, 0.5)"
                    nodeColor={(node) => {
                        return (node.data as any).isRoot ? '#fbbf24' : '#7c3aed';
                    }}
                />
            </ReactFlow>
        </div>
    );
}
