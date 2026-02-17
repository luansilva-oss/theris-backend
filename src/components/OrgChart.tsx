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
    dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

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

        // Mapear níveis de profundidade (opcional para coloração)
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

        users.forEach(user => {
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
                position: { x: 0, y: 0 }, // Dagre calculará o real
            });

            if (user.managerId) {
                flowEdges.push({
                    id: `e-${user.managerId}-${user.id}`,
                    source: user.managerId,
                    target: user.id,
                    type: 'smoothstep',
                    style: { stroke: '#cbd5e1', strokeWidth: 2 },
                });
            }
        });

        return getLayoutedElements(flowNodes, flowEdges);
    }, [users, onEditUser]);

    useEffect(() => {
        setNodes(initialElements.nodes);
        setEdges(initialElements.edges);
    }, [initialElements, setNodes, setEdges]);

    // Handler para reatribuição de gestor via conexão manual se desejado
    const onConnect = useCallback(
        (params: Connection) => {
            if (params.source === params.target) return;

            // Remover arestas antigas para o target (um subordinates só tem um manager)
            setEdges((eds) => {
                const otherEdges = eds.filter((e) => e.target !== params.target);
                return addEdge({ ...params, type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 2 } }, otherEdges);
            });

            // Notificar backend
            if (params.target && params.source) {
                onManagerChange(params.target, params.source);
            }
        },
        [setEdges, onManagerChange]
    );

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 180px)', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
            >
                <Background gap={20} color="#e2e8f0" />
                <Controls />
                <Panel position="top-right" style={{ background: 'white', padding: '8px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Legenda</div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div style={{ width: 12, height: 4, background: '#fbbf24' }}></div> C-Level / Gestores
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div style={{ width: 12, height: 4, background: '#8b5cf6' }}></div> Membros
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 max-w-[150px]">
                            Dica: Conecte o círculo inferior de um líder ao círculo superior de um liderado para reatribuir gestor.
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
