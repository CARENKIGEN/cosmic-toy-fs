
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import FileSystem from '@/components/FileSystem';
import KernelModule from '@/components/KernelModule';
import FuseInterface from '@/components/FuseInterface';
import TerminalInterface from '@/components/TerminalInterface';
import { HardDriveIcon, CpuIcon, TerminalIcon, CodeIcon } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [fsState, setFsState] = useState({
    inodes: [],
    files: [],
    directories: []
  });

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      {/* Header */}
      <div className="border-b border-green-500/20 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HardDriveIcon className="w-8 h-8 text-green-400" />
              <div>
                <h1 className="text-2xl font-bold text-green-400">ToY FS</h1>
                <p className="text-sm text-green-300/60">Linux Kernel Module Filesystem</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-green-500 text-green-400">
                <CpuIcon className="w-3 h-3 mr-1" />
                Kernel Module
              </Badge>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                <TerminalIcon className="w-3 h-3 mr-1" />
                FUSE Ready
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-black/50 border border-green-500/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Overview
            </TabsTrigger>
            <TabsTrigger value="kernel" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Kernel Module
            </TabsTrigger>
            <TabsTrigger value="filesystem" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Filesystem
            </TabsTrigger>
            <TabsTrigger value="fuse" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              FUSE Interface
            </TabsTrigger>
            <TabsTrigger value="terminal" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              Terminal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-black/50 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center">
                    <CodeIcon className="w-5 h-5 mr-2" />
                    Project Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-green-300/80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Toy Filesystem (ToyFS)</h4>
                      <p className="text-sm">
                        A complete Linux kernel module implementation featuring:
                      </p>
                      <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                        <li>Custom inode management</li>
                        <li>File and directory operations</li>
                        <li>VFS integration</li>
                        <li>FUSE userspace interface</li>
                        <li>Interactive testing environment</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-400 mb-2">Key Features</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Badge variant="outline" className="border-green-500/50 text-green-400">
                          Kernel Module
                        </Badge>
                        <Badge variant="outline" className="border-green-500/50 text-green-400">
                          FUSE Ready
                        </Badge>
                        <Badge variant="outline" className="border-green-500/50 text-green-400">
                          VFS Integration
                        </Badge>
                        <Badge variant="outline" className="border-green-500/50 text-green-400">
                          Interactive UI
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-green-400">Architecture</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="border border-green-500/20 rounded p-3 bg-green-500/5">
                      <div className="font-semibold text-green-400 mb-1">Kernel Space</div>
                      <div className="text-green-300/70">toyfs.ko - Linux Kernel Module</div>
                    </div>
                    <div className="border border-blue-500/20 rounded p-3 bg-blue-500/5">
                      <div className="font-semibold text-blue-400 mb-1">User Space</div>
                      <div className="text-blue-300/70">FUSE Interface & Testing Tools</div>
                    </div>
                    <div className="border border-purple-500/20 rounded p-3 bg-purple-500/5">
                      <div className="font-semibold text-purple-400 mb-1">Web Interface</div>
                      <div className="text-purple-300/70">Interactive Filesystem Explorer</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="kernel" className="mt-6">
            <KernelModule />
          </TabsContent>

          <TabsContent value="filesystem" className="mt-6">
            <FileSystem fsState={fsState} setFsState={setFsState} />
          </TabsContent>

          <TabsContent value="fuse" className="mt-6">
            <FuseInterface />
          </TabsContent>

          <TabsContent value="terminal" className="mt-6">
            <TerminalInterface fsState={fsState} setFsState={setFsState} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
