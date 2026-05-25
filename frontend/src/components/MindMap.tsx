import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface MindMapProps {
  title: string;
  summary: string;
  keyPoints: string[];
}

const MindMap: React.FC<MindMapProps> = ({ title, summary, keyPoints }) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 根节点
    nodes.push({
      id: 'root',
      type: 'default',
      data: { label: title || '总结' },
      position: { x: 400, y: 50 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 20px',
        fontSize: '16px',
        fontWeight: 600,
        boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
        minWidth: '120px',
        textAlign: 'center',
      },
    });

    // 总结节点
    const summaryLabel = summary.length > 50 ? summary.slice(0, 50) + '...' : summary;
    nodes.push({
      id: 'summary',
      type: 'default',
      data: { label: `📝 ${summaryLabel}` },
      position: { x: 400, y: 180 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: {
        background: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        padding: '10px 16px',
        fontSize: '13px',
        color: '#475569',
        maxWidth: '280px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
    });

    edges.push({
      id: 'e-root-summary',
      source: 'root',
      target: 'summary',
      style: { stroke: '#cbd5e1', strokeWidth: 2 },
      animated: false,
    });

    // 关键要点节点
    const totalPoints = keyPoints.length;
    const startX = 400 - ((totalPoints - 1) * 180) / 2;

    keyPoints.forEach((point, index) => {
      const nodeId = `point-${index}`;
      const x = startX + index * 180;

      nodes.push({
        id: nodeId,
        type: 'default',
        data: { label: point },
        position: { x, y: 320 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: index % 2 === 0 ? '#dbeafe' : '#e0e7ff',
          border: `2px solid ${index % 2 === 0 ? '#93c5fd' : '#a5b4fc'}`,
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          color: '#334155',
          maxWidth: '200px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
      });

      edges.push({
        id: `e-summary-${nodeId}`,
        source: 'summary',
        target: nodeId,
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        animated: false,
      });

      // 子节点（如果要点较长，拆分子项）
      if (point.length > 20) {
        const subItems = point.split(/[,，、;；]/).filter(s => s.trim());
        if (subItems.length > 1) {
          subItems.forEach((sub, subIndex) => {
            const subId = `sub-${index}-${subIndex}`;
            const subX = x + (subIndex - (subItems.length - 1) / 2) * 120;

            nodes.push({
              id: subId,
              type: 'default',
              data: { label: sub.trim() },
              position: { x: subX, y: 440 },
              targetPosition: Position.Top,
              style: {
                background: '#fefce8',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                color: '#78716c',
                maxWidth: '140px',
              },
            });

            edges.push({
              id: `e-${nodeId}-${subId}`,
              source: nodeId,
              target: subId,
              style: { stroke: '#d6d3d1', strokeWidth: 1 },
              animated: false,
            });
          });
        }
      }
    });

    return { nodes, edges };
  }, [title, summary, keyPoints]);

  const [nodesState, , onNodesChange] = useNodesState(nodes);
  const [edgesState, , onEdgesChange] = useEdgesState(edges);

  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls
          className="bg-white border border-slate-200 rounded-lg shadow-sm"
          showInteractive={false}
        />
        <MiniMap
          className="bg-white border border-slate-200 rounded-lg"
          nodeColor="#94a3b8"
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>
    </div>
  );
};

export default MindMap;
