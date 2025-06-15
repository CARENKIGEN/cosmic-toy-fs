
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderIcon, FileIcon, TrashIcon, PlusIcon, EditIcon } from 'lucide-react';
import { toast } from 'sonner';

interface FileSystemNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  created: Date;
  modified: Date;
  content?: string;
  children?: FileSystemNode[];
  inode: number;
}

interface FileSystemProps {
  fsState: any;
  setFsState: (state: any) => void;
}

const FileSystem: React.FC<FileSystemProps> = ({ fsState, setFsState }) => {
  const [filesystem, setFilesystem] = useState<FileSystemNode[]>([
    {
      id: 'root',
      name: '/',
      type: 'directory',
      size: 0,
      created: new Date(),
      modified: new Date(),
      inode: 1,
      children: [
        {
          id: 'home',
          name: 'home',
          type: 'directory',
          size: 0,
          created: new Date(),
          modified: new Date(),
          inode: 2,
          children: []
        },
        {
          id: 'tmp',
          name: 'tmp',
          type: 'directory',
          size: 0,
          created: new Date(),
          modified: new Date(),
          inode: 3,
          children: []
        }
      ]
    }
  ]);

  const [selectedNode, setSelectedNode] = useState<FileSystemNode | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<'file' | 'directory'>('file');
  const [inodeCounter, setInodeCounter] = useState(4);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const createNode = (parent: FileSystemNode, name: string, type: 'file' | 'directory') => {
    const newNode: FileSystemNode = {
      id: generateId(),
      name,
      type,
      size: type === 'file' ? 0 : 4096,
      created: new Date(),
      modified: new Date(),
      inode: inodeCounter,
      children: type === 'directory' ? [] : undefined,
      content: type === 'file' ? '' : undefined
    };

    setInodeCounter(prev => prev + 1);

    const updateTree = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === parent.id) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
            modified: new Date()
          };
        }
        if (node.children) {
          return {
            ...node,
            children: updateTree(node.children)
          };
        }
        return node;
      });
    };

    setFilesystem(updateTree(filesystem));
    toast.success(`${type === 'file' ? 'File' : 'Directory'} '${name}' created`);
  };

  const deleteNode = (nodeToDelete: FileSystemNode) => {
    const updateTree = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.filter(node => {
        if (node.id === nodeToDelete.id) {
          return false;
        }
        if (node.children) {
          node.children = updateTree(node.children);
        }
        return true;
      });
    };

    setFilesystem(updateTree(filesystem));
    setSelectedNode(null);
    toast.success(`${nodeToDelete.type === 'file' ? 'File' : 'Directory'} '${nodeToDelete.name}' deleted`);
  };

  const renderTree = (nodes: FileSystemNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
            selectedNode?.id === node.id
              ? 'bg-green-500/20 border border-green-500/50'
              : 'hover:bg-green-500/10'
          }`}
          style={{ marginLeft: level * 20 }}
          onClick={() => setSelectedNode(node)}
        >
          {node.type === 'directory' ? (
            <FolderIcon className="w-4 h-4 text-blue-400" />
          ) : (
            <FileIcon className="w-4 h-4 text-green-400" />
          )}
          <span className="text-green-300 flex-1">{node.name}</span>
          <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
            {node.inode}
          </Badge>
          <span className="text-green-300/60 text-xs">
            {node.type === 'file' ? `${node.size}B` : `${node.children?.length || 0} items`}
          </span>
        </div>
        {node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  const handleCreateNode = () => {
    if (!newNodeName || !selectedNode) return;
    
    if (selectedNode.type !== 'directory') {
      toast.error('Can only create nodes inside directories');
      return;
    }

    createNode(selectedNode, newNodeName, newNodeType);
    setNewNodeName('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Filesystem Tree */}
      <Card className="bg-black/50 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center">
            <FolderIcon className="w-5 h-5 mr-2" />
            Filesystem Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 border border-green-500/20 rounded-md p-4">
            {renderTree(filesystem)}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Node Details & Operations */}
      <div className="space-y-6">
        {/* Create New Node */}
        <Card className="bg-black/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Create New Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button
                onClick={() => setNewNodeType('file')}
                variant={newNodeType === 'file' ? 'default' : 'outline'}
                className={
                  newNodeType === 'file'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-green-500 text-green-400 hover:bg-green-500/10'
                }
              >
                File
              </Button>
              <Button
                onClick={() => setNewNodeType('directory')}
                variant={newNodeType === 'directory' ? 'default' : 'outline'}
                className={
                  newNodeType === 'directory'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-green-500 text-green-400 hover:bg-green-500/10'
                }
              >
                Directory
              </Button>
            </div>
            <Input
              placeholder="Enter node name"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              className="bg-black/50 border-green-500/20 text-green-300 placeholder-green-400/50"
            />
            <Button
              onClick={handleCreateNode}
              disabled={!newNodeName || !selectedNode || selectedNode.type !== 'directory'}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Create {newNodeType}
            </Button>
            {selectedNode && selectedNode.type !== 'directory' && (
              <p className="text-orange-400 text-sm">
                Select a directory to create new nodes
              </p>
            )}
          </CardContent>
        </Card>

        {/* Selected Node Details */}
        {selectedNode && (
          <Card className="bg-black/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center justify-between">
                <span className="flex items-center">
                  <EditIcon className="w-5 h-5 mr-2" />
                  Node Details
                </span>
                <Button
                  onClick={() => deleteNode(selectedNode)}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-400">Name:</span>
                  <div className="text-green-300">{selectedNode.name}</div>
                </div>
                <div>
                  <span className="text-green-400">Type:</span>
                  <div className="text-green-300">{selectedNode.type}</div>
                </div>
                <div>
                  <span className="text-green-400">Inode:</span>
                  <div className="text-green-300">{selectedNode.inode}</div>
                </div>
                <div>
                  <span className="text-green-400">Size:</span>
                  <div className="text-green-300">{selectedNode.size} bytes</div>
                </div>
                <div>
                  <span className="text-green-400">Created:</span>
                  <div className="text-green-300">{selectedNode.created.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-green-400">Modified:</span>
                  <div className="text-green-300">{selectedNode.modified.toLocaleString()}</div>
                </div>
              </div>
              
              {selectedNode.type === 'directory' && (
                <div>
                  <span className="text-green-400">Children:</span>
                  <div className="text-green-300">
                    {selectedNode.children?.length || 0} items
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FileSystem;
