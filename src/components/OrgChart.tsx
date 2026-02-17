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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

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

        return getLayoutedElements(flowNodes, flowEdges);
    }, [users, onEditUser]);

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
        <div style={{ width: '100%', height: 'calc(100vh - 200px)', background: '#09090b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1f1f22' }}>
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
                minZoom={0.1}
                maxZoom={1.5}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    style: { stroke: '#3f3f46', strokeWidth: 2 },
                }}
            >
                <Background gap={24} color="#18181b" variant={BackgroundVariant.Dots} />
                <Controls style={{ background: '#18181b', border: '1px solid #27272a', padding: 4, borderRadius: 8 }} />

                <Panel position="top-right" style={{
                    background: 'rgba(24, 24, 27, 0.8)',
                    backdropFilter: 'blur(8px)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #27272a',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1 }}>Legenda da Estrutura</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#fbbf24', boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)' }}></div>
                            <span style={{ fontSize: 12, color: '#e4e4e7', fontWeight: 500 }}>Gestores e C-Level</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#7c3aed', boxShadow: '0 0 10px rgba(124, 58, 237, 0.3)' }}></div>
                            <span style={{ fontSize: 12, color: '#e4e4e7', fontWeight: 500 }}>Corpo Técnico / Outros</span>
                        </div>

                        <div style={{ marginTop: 8, padding: '8px', background: 'rgba(167, 139, 250, 0.05)', borderRadius: '6px', border: '1px solid rgba(167, 139, 250, 0.1)' }}>
                            <div style={{ fontSize: 10, color: '#a1a1aa', lineHeight: 1.4 }}>
                                💡 <strong>Dica:</strong> Para mudar de gestor, arraste a linha da base de um nome até o topo de outro.
                            </div>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
