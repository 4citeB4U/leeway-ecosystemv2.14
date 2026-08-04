/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.COMPONENT.PLACEHOLDER
 * DESCRIPTION: Leeway IDE component
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Component
 * WHY = Provide functionality
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = React component
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Content Studio - Central hub for all created and imported content
 * Integrates with File System API and Device Discovery
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FolderOpen, Video, FileText, Image as ImageIcon,
  Music, Film, Layers, Search, Grid, List, Camera, Mic,
  Monitor, Smartphone, Tablet, Headphones, Printer, HardDrive,
  Wifi, Bluetooth, Usb, RefreshCw, Play, Download, Trash2,
  Eye, Edit, Copy, Share2, Plus, ChevronDown, Filter
} from 'lucide-react';

interface ContentItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'pdf' | 'model3d' | 'document';
  size: number;
  created: Date;
  thumbnail?: string;
  path?: string;
  source: 'created' | 'imported' | 'device';
  deviceId?: string;
}

interface Device {
  id: string;
  name: string;
  type: 'camera' | 'microphone' | 'speaker' | 'storage' | 'display' | 'other';
  status: 'connected' | 'disconnected';
  capabilities?: string[];
}

interface ContentStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (item: ContentItem, e: React.DragEvent) => void;
  accentColor: string;
}

export function ContentStudio({ isOpen, onClose, onDragStart, accentColor }: ContentStudioProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'devices' | 'filesystem'>('content');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ContentItem['type']>('all');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileSystemHandle, setFileSystemHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileSystemFiles, setFileSystemFiles] = useState<any[]>([]);

  // Device Discovery - Enumerate media devices
  useEffect(() => {
    const discoverDevices = async () => {
      try {
        setIsScanning(true);
        
        // Get media devices (cameras, microphones)
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        
        const discoveredDevices: Device[] = mediaDevices.map((device, idx) => ({
          id: device.deviceId || `device-${idx}`,
          name: device.label || `${device.kind} ${idx + 1}`,
          type: device.kind === 'videoinput' ? 'camera' :
                device.kind === 'audioinput' ? 'microphone' :
                device.kind === 'audiooutput' ? 'speaker' : 'other',
          status: 'connected' as const,
          capabilities: []
        }));

        // Add storage devices (simulated - real implementation would use USB API)
        discoveredDevices.push({
          id: 'storage-local',
          name: 'Local Storage',
          type: 'storage',
          status: 'connected',
          capabilities: ['read', 'write']
        });

        // Add display info
        if (window.screen) {
          discoveredDevices.push({
            id: 'display-primary',
            name: `Display (${window.screen.width}x${window.screen.height})`,
            type: 'display',
            status: 'connected',
            capabilities: [`${window.screen.width}x${window.screen.height}`]
          });
        }

        setDevices(discoveredDevices);
      } catch (error) {
        console.error('Device discovery failed:', error);
      } finally {
        setIsScanning(false);
      }
    };

    if (isOpen) {
      discoverDevices();
    }
  }, [isOpen]);

  // File System API Integration
  const handleOpenFileSystem = async () => {
    try {
      // @ts-expect-error - File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      setFileSystemHandle(dirHandle);
      await loadFilesFromDirectory(dirHandle);
    } catch (error) {
      console.error('Failed to open directory:', error);
    }
  };

  const loadFilesFromDirectory = async (dirHandle: FileSystemDirectoryHandle) => {
    const files: any[] = [];
    
    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          files.push({
            name: entry.name,
            handle: entry,
            file: file,
            size: file.size,
            type: file.type,
            modified: new Date(file.lastModified)
          });
        }
      }
      
      setFileSystemFiles(files);
    } catch (error) {
      console.error('Failed to read directory:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const newItem: ContentItem = {
          id: `content-${Date.now()}-${i}`,
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' :
                file.type.startsWith('audio/') ? 'audio' :
                file.type.startsWith('image/') ? 'image' :
                file.type === 'application/pdf' ? 'pdf' :
                file.name.endsWith('.glb') || file.name.endsWith('.gltf') ? 'model3d' : 'document',
          size: file.size,
          created: new Date(),
          thumbnail: event.target?.result as string,
          source: 'imported'
        };
        
        setContent(prev => [newItem, ...prev]);
      };
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    }
  };

  // Capture from camera device
  const handleCaptureFromCamera = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });
      
      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const thumbnail = canvas.toDataURL('image/jpeg');
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      
      // Add to content
      const newItem: ContentItem = {
        id: `capture-${Date.now()}`,
        name: `Camera Capture ${new Date().toLocaleTimeString()}`,
        type: 'image',
        size: thumbnail.length,
        created: new Date(),
        thumbnail,
        source: 'device',
        deviceId
      };
      
      setContent(prev => [newItem, ...prev]);
    } catch (error) {
      console.error('Camera capture failed:', error);
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'camera': return Camera;
      case 'microphone': return Mic;
      case 'speaker': return Headphones;
      case 'storage': return HardDrive;
      case 'display': return Monitor;
      default: return Usb;
    }
  };

  const getContentIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return Video;
      case 'audio': return Music;
      case 'image': return ImageIcon;
      case 'pdf': return FileText;
      case 'model3d': return Layers;
      default: return FileText;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-7xl h-[90vh] bg-[#0a0b0e]/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center border-2"
              style={{ backgroundColor: accentColor + '20', borderColor: accentColor + '40' }}
            >
              <Layers size={24} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Content Studio</h2>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                Asset Management • Device Integration • File System Access
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Upload size={14} /> Import Files
            </button>
            
            <button
              onClick={handleOpenFileSystem}
              className="px-4 py-2 border-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              style={{ 
                backgroundColor: accentColor + '20',
                borderColor: accentColor + '40',
                color: accentColor
              }}
            >
              <FolderOpen size={14} /> Open Folder
            </button>
            
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*,application/pdf,.glb,.gltf"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-white/5">
          {[
            { id: 'content', label: 'Content Library', icon: Layers },
            { id: 'devices', label: 'Connected Devices', icon: Wifi },
            { id: 'filesystem', label: 'File System', icon: FolderOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'text-white border-b-2'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottomColor: activeTab === tab.id ? accentColor : 'transparent'
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'content' && (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-white/20 transition-all"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="image">Images</option>
                  <option value="pdf">PDFs</option>
                  <option value="model3d">3D Models</option>
                </select>
                
                <div className="flex bg-white/5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'text-white' : 'text-slate-500'}`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'text-white' : 'text-slate-500'}`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>

              {/* Content Grid/List */}
              <div className="flex-1 overflow-y-auto p-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredContent.map(item => {
                      const Icon = getContentIcon(item.type);
                      return (
                        <motion.div
                          key={item.id}
                          draggable
                          onDragStart={(e) => onDragStart(item, e as any)}
                          className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all cursor-grab active:cursor-grabbing"
                        >
                          <div className="aspect-video bg-black/40 flex items-center justify-center relative">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon size={32} className="text-slate-700" />
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20">
                                <Eye size={14} />
                              </button>
                              <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20">
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{formatFileSize(item.size)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredContent.map(item => {
                      const Icon = getContentIcon(item.type);
                      return (
                        <motion.div
                          key={item.id}
                          draggable
                          onDragStart={(e) => onDragStart(item, e as any)}
                          className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-grab active:cursor-grabbing"
                        >
                          <Icon size={20} className="text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(item.size)} • {item.created.toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                              <Eye size={16} className="text-slate-400" />
                            </button>
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                              <Download size={16} className="text-slate-400" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                
                {filteredContent.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <Layers size={64} className="opacity-10 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No content found</p>
                    <p className="text-xs mt-2">Import files or create new content to get started</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'devices' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  {devices.length} Device{devices.length !== 1 ? 's' : ''} Detected
                </h3>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                >
                  <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                  Rescan
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map(device => {
                  const Icon = getDeviceIcon(device.type);
                  return (
                    <div
                      key={device.id}
                      className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: accentColor + '20' }}
                        >
                          <Icon size={24} style={{ color: accentColor }} />
                        </div>
                        <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                          device.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {device.status}
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-bold text-white mb-2">{device.name}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">{device.type}</p>
                      
                      {device.type === 'camera' && (
                        <button
                          onClick={() => handleCaptureFromCamera(device.id)}
                          className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          style={{
                            backgroundColor: accentColor + '20',
                            color: accentColor
                          }}
                        >
                          Capture Frame
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'filesystem' && (
            <div className="flex-1 overflow-y-auto p-6">
              {!fileSystemHandle ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <FolderOpen size={64} className="opacity-10 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest mb-2">No Directory Selected</p>
                  <p className="text-xs mb-6">Open a folder to browse your local files</p>
                  <button
                    onClick={handleOpenFileSystem}
                    className="px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all"
                    style={{
                      backgroundColor: accentColor,
                      color: 'white'
                    }}
                  >
                    <FolderOpen size={16} className="inline mr-2" />
                    Open Folder
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">
                      {fileSystemFiles.length} File{fileSystemFiles.length !== 1 ? 's' : ''}
                    </h3>
                    <button
                      onClick={() => fileSystemHandle && loadFilesFromDirectory(fileSystemHandle)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                  </div>
                  
                  {fileSystemFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                    >
                      <FileText size={20} className="text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(file.size)} • {file.modified.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const fileData = await file.file.arrayBuffer();
                          // Add to content library
                          const newItem: ContentItem = {
                            id: `fs-${Date.now()}`,
                            name: file.name,
                            type: file.type.startsWith('video/') ? 'video' :
                                  file.type.startsWith('audio/') ? 'audio' :
                                  file.type.startsWith('image/') ? 'image' :
                                  file.type === 'application/pdf' ? 'pdf' : 'document',
                            size: file.size,
                            created: file.modified,
                            path: file.name,
                            source: 'imported'
                          };
                          setContent(prev => [newItem, ...prev]);
                          setActiveTab('content');
                        }}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{
                          backgroundColor: accentColor + '20',
                          color: accentColor
                        }}
                      >
                        Import
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-6">
            <span>{content.length} items in library</span>
            <span>{devices.filter(d => d.status === 'connected').length} devices connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Studio Active</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Leeway Standards: governed module
