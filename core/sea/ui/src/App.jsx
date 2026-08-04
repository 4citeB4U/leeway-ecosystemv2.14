/**
 * SEA Dashboard - Main Application
 * 
 * Complete React + React Flow dashboard for SEA monitoring and visualization.
 * Includes all Phase 3 components in one file for efficiency.
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ============================================================================
// WebSocket Client
// ============================================================================

class SEAWebSocketClient {
  constructor(url = 'ws://127.0.0.1:8000/api/v1/events/stream') {
    this.url = url;
    this.ws = null;
    this.listeners = new Set();
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectDelay = 1000;
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(data));
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================================================
// Custom Node Components
// ============================================================================

const RequestNode = ({ data }) => (
  <div style={{
    padding: '10px',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    background: '#eff6ff',
    minWidth: '150px'
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Request</div>
    <div style={{ fontSize: '12px' }}>{data.label}</div>
    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
      {data.task_type}
    </div>
  </div>
);

const GovernanceNode = ({ data }) => (
  <div style={{
    padding: '10px',
    border: `2px solid ${data.approved ? '#10b981' : '#ef4444'}`,
    borderRadius: '8px',
    background: data.approved ? '#d1fae5' : '#fee2e2',
    minWidth: '150px'
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Governance</div>
    <div style={{ fontSize: '12px' }}>
      {data.approved ? '✓ Approved' : '✗ Rejected'}
    </div>
    {data.reason && (
      <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
        {data.reason}
      </div>
    )}
  </div>
);

const AdapterNode = ({ data }) => (
  <div style={{
    padding: '10px',
    border: '2px solid #8b5cf6',
    borderRadius: '8px',
    background: '#f5f3ff',
    minWidth: '150px'
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Adapter</div>
    <div style={{ fontSize: '12px' }}>{data.adapter}</div>
    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
      Status: {data.status}
    </div>
  </div>
);

const nodeTypes = {
  request: RequestNode,
  governance: GovernanceNode,
  adapter: AdapterNode,
};

// ============================================================================
// Inspector Panel Component
// ============================================================================

const InspectorPanel = ({ selectedNode, metrics, health }) => (
  <div style={{
    position: 'absolute',
    right: '20px',
    top: '20px',
    width: '300px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxHeight: '80vh',
    overflow: 'auto'
  }}>
    <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Inspector</h3>
    
    {selectedNode ? (
      <div>
        <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px' }}>Selected Node</h4>
        <div style={{ fontSize: '12px', background: '#f9fafb', padding: '10px', borderRadius: '4px' }}>
          <div><strong>Type:</strong> {selectedNode.type}</div>
          <div><strong>ID:</strong> {selectedNode.id}</div>
          {Object.entries(selectedNode.data || {}).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        Select a node to inspect
      </div>
    )}
    
    <h4 style={{ margin: '15px 0 5px 0', fontSize: '14px' }}>System Metrics</h4>
    <div style={{ fontSize: '12px', background: '#f9fafb', padding: '10px', borderRadius: '4px' }}>
      <div><strong>Queue Depth:</strong> {metrics?.queue_depth || 0}</div>
      <div><strong>Total Requests:</strong> {metrics?.total_requests || 0}</div>
      <div><strong>Success Rate:</strong> {
        metrics?.total_requests > 0
          ? ((metrics.successful_requests / metrics.total_requests) * 100).toFixed(1)
          : 0
      }%</div>
      <div><strong>Avg Exec Time:</strong> {metrics?.avg_execution_time_ms?.toFixed(2) || 0}ms</div>
    </div>
    
    <h4 style={{ margin: '15px 0 5px 0', fontSize: '14px' }}>Health Status</h4>
    <div style={{
      fontSize: '12px',
      background: health?.status === 'healthy' ? '#d1fae5' : '#fee2e2',
      padding: '10px',
      borderRadius: '4px'
    }}>
      <div><strong>Status:</strong> {health?.status || 'unknown'}</div>
      <div><strong>CPU:</strong> {health?.metrics?.cpu_percent?.toFixed(1) || 0}%</div>
      <div><strong>Memory:</strong> {health?.metrics?.memory_mb?.toFixed(1) || 0}MB</div>
      {health?.alerts && health.alerts.length > 0 && (
        <div style={{ marginTop: '5px', color: '#dc2626' }}>
          <strong>Alerts:</strong>
          {health.alerts.map((alert, i) => (
            <div key={i}>• {alert}</div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ============================================================================
// Main Dashboard Component
// ============================================================================

function SEADashboard() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [wsClient] = useState(() => new SEAWebSocketClient());

  // Initialize WebSocket connection
  useEffect(() => {
    wsClient.connect();
    
    const unsubscribe = wsClient.subscribe((event) => {
      console.log('WebSocket event:', event);
      
      if (event.event_type === 'metrics_update') {
        setMetrics(event.data);
      } else if (event.event_type === 'health_update') {
        setHealth(event.data);
      } else if (event.event_type === 'execution_event') {
        // Update graph with new execution
        updateGraph(event.data);
      }
    });
    
    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [wsClient]);

  // Fetch initial data from REST API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, healthRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/v1/metrics'),
          fetch('http://127.0.0.1:8000/api/v1/health')
        ]);
        
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
        
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateGraph = useCallback((executionData) => {
    // Add nodes and edges based on execution data
    // This is a simplified example
    const newNodes = [];
    const newEdges = [];
    
    // Add request node
    newNodes.push({
      id: `req-${executionData.request_id}`,
      type: 'request',
      position: { x: 100, y: 100 + nodes.length * 150 },
      data: {
        label: executionData.request_id,
        task_type: executionData.task_type
      }
    });
    
    // Add governance node
    newNodes.push({
      id: `gov-${executionData.request_id}`,
      type: 'governance',
      position: { x: 350, y: 100 + nodes.length * 150 },
      data: {
        approved: executionData.approved,
        reason: executionData.reason
      }
    });
    
    // Add edge
    newEdges.push({
      id: `e-req-gov-${executionData.request_id}`,
      source: `req-${executionData.request_id}`,
      target: `gov-${executionData.request_id}`,
      animated: true
    });
    
    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
  }, [nodes.length, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: '#1f2937',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>SEA Dashboard</h1>
        <div style={{ fontSize: '14px' }}>
          <span style={{
            background: health?.status === 'healthy' ? '#10b981' : '#ef4444',
            padding: '5px 10px',
            borderRadius: '4px'
          }}>
            {health?.status || 'unknown'}
          </span>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
        
        <InspectorPanel
          selectedNode={selectedNode}
          metrics={metrics}
          health={health}
        />
      </div>
    </div>
  );
}

export default SEADashboard;

// Made with Bob