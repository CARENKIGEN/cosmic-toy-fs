
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayIcon, StopIcon, DownloadIcon, RefreshIcon } from 'lucide-react';
import { toast } from 'sonner';

const FuseInterface = () => {
  const [fuseStatus, setFuseStatus] = useState('unmounted');
  const [mountPoint, setMountPoint] = useState('/mnt/toyfs');
  const [operations, setOperations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('interface');

  const fuseCode = `#!/usr/bin/env python3
"""
ToyFS FUSE Implementation
A FUSE-based userspace filesystem for testing ToyFS kernel module
"""

import os
import sys
import errno
import stat
import time
from fuse import FUSE, FuseOSError, Operations, LoggingMixIn

class ToyFS(LoggingMixIn, Operations):
    def __init__(self, root):
        self.root = root
        self.files = {}
        self.data = {}
        self.fd = 0
        
        # Initialize root directory
        now = time.time()
        self.files['/'] = dict(
            st_mode=(stat.S_IFDIR | 0o755),
            st_ctime=now,
            st_mtime=now,
            st_atime=now,
            st_nlink=2
        )

    def _full_path(self, partial):
        if partial.startswith("/"):
            partial = partial[1:]
        path = os.path.join(self.root, partial)
        return path

    def access(self, path, mode):
        if path not in self.files:
            raise FuseOSError(errno.ENOENT)
        return 0

    def chmod(self, path, mode):
        if path not in self.files:
            raise FuseOSError(errno.ENOENT)
        self.files[path]['st_mode'] &= 0o770000
        self.files[path]['st_mode'] |= mode
        return 0

    def chown(self, path, uid, gid):
        if path not in self.files:
            raise FuseOSError(errno.ENOENT)
        self.files[path]['st_uid'] = uid
        self.files[path]['st_gid'] = gid

    def getattr(self, path, fh=None):
        if path not in self.files:
            raise FuseOSError(errno.ENOENT)
        
        st = self.files[path]
        if path in self.data:
            st['st_size'] = len(self.data[path])
        else:
            st['st_size'] = 0
            
        return st

    def readdir(self, path, fh):
        entries = ['.', '..']
        
        if path == '/':
            for p in self.files:
                if p != '/' and '/' not in p[1:]:
                    entries.append(p[1:])
        else:
            for p in self.files:
                if p.startswith(path + '/') and p != path:
                    relative = p[len(path)+1:]
                    if '/' not in relative:
                        entries.append(relative)
        
        return entries

    def readlink(self, path):
        if path not in self.data:
            raise FuseOSError(errno.ENOENT)
        return self.data[path]

    def mknod(self, path, mode, dev):
        self.files[path] = dict(
            st_mode=(stat.S_IFREG | mode),
            st_nlink=1,
            st_size=0,
            st_ctime=time.time(),
            st_mtime=time.time(),
            st_atime=time.time()
        )
        self.data[path] = b''

    def rmdir(self, path):
        # Check if directory is empty
        for p in self.files:
            if p.startswith(path + '/'):
                raise FuseOSError(errno.ENOTEMPTY)
        
        if path in self.files:
            del self.files[path]

    def mkdir(self, path, mode):
        self.files[path] = dict(
            st_mode=(stat.S_IFDIR | mode),
            st_nlink=2,
            st_size=0,
            st_ctime=time.time(),
            st_mtime=time.time(),
            st_atime=time.time()
        )

    def unlink(self, path):
        if path in self.files:
            del self.files[path]
        if path in self.data:
            del self.data[path]

    def symlink(self, target, name):
        self.files[name] = dict(
            st_mode=(stat.S_IFLNK | 0o777),
            st_nlink=1,
            st_size=len(target),
            st_ctime=time.time(),
            st_mtime=time.time(),
            st_atime=time.time()
        )
        self.data[name] = target

    def rename(self, old, new):
        if old in self.files:
            self.files[new] = self.files.pop(old)
        if old in self.data:
            self.data[new] = self.data.pop(old)

    def link(self, target, name):
        if target not in self.files:
            raise FuseOSError(errno.ENOENT)
        self.files[name] = self.files[target]
        self.files[target]['st_nlink'] += 1

    def utimens(self, path, times=None):
        now = time.time()
        atime, mtime = times if times else (now, now)
        if path in self.files:
            self.files[path]['st_atime'] = atime
            self.files[path]['st_mtime'] = mtime

    def open(self, path, flags):
        if path not in self.files:
            raise FuseOSError(errno.ENOENT)
        self.fd += 1
        return self.fd

    def create(self, path, mode, fi=None):
        self.mknod(path, mode, 0)
        self.fd += 1
        return self.fd

    def read(self, path, length, offset, fh):
        if path not in self.data:
            return b''
        data = self.data[path]
        return data[offset:offset + length]

    def write(self, path, buf, offset, fh):
        if path not in self.data:
            self.data[path] = b''
        
        data = bytearray(self.data[path])
        data[offset:offset + len(buf)] = buf
        self.data[path] = bytes(data)
        
        if path in self.files:
            self.files[path]['st_size'] = len(self.data[path])
            self.files[path]['st_mtime'] = time.time()
        
        return len(buf)

    def truncate(self, path, length, fh=None):
        if path in self.data:
            self.data[path] = self.data[path][:length]
        if path in self.files:
            self.files[path]['st_size'] = length
            self.files[path]['st_mtime'] = time.time()

    def flush(self, path, fh):
        return 0

    def release(self, path, fh):
        return 0

    def fsync(self, path, fdatasync, fh):
        return 0

def main(mountpoint):
    FUSE(ToyFS(mountpoint), mountpoint, nothreads=True, foreground=True)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: %s <mountpoint>' % sys.argv[0])
        sys.exit(1)
    
    main(sys.argv[1])
`;

  const testScript = `#!/bin/bash
# ToyFS FUSE Test Script

set -e

MOUNT_POINT="/mnt/toyfs"
FUSE_SCRIPT="toyfs_fuse.py"

echo "=== ToyFS FUSE Test Suite ==="

# Check if mount point exists
if [ ! -d "$MOUNT_POINT" ]; then
    echo "Creating mount point: $MOUNT_POINT"
    sudo mkdir -p "$MOUNT_POINT"
fi

# Mount filesystem
echo "Mounting ToyFS via FUSE..."
python3 "$FUSE_SCRIPT" "$MOUNT_POINT" &
FUSE_PID=$!
sleep 2

# Test basic operations
echo "Testing basic filesystem operations..."

# Create directory
echo "Creating directory: test_dir"
mkdir "$MOUNT_POINT/test_dir"

# Create file
echo "Creating file: test_file.txt"
echo "Hello, ToyFS!" > "$MOUNT_POINT/test_file.txt"

# Read file
echo "Reading file content:"
cat "$MOUNT_POINT/test_file.txt"

# List directory
echo "Directory listing:"
ls -la "$MOUNT_POINT"

# File stats
echo "File statistics:"
stat "$MOUNT_POINT/test_file.txt"

# Append to file
echo "Appending to file..."
echo "This is a second line." >> "$MOUNT_POINT/test_file.txt"
cat "$MOUNT_POINT/test_file.txt"

# Create nested directory
echo "Creating nested directory structure..."
mkdir -p "$MOUNT_POINT/test_dir/nested/deep"

# Create file in nested directory
echo "Creating file in nested directory..."
echo "Nested file content" > "$MOUNT_POINT/test_dir/nested/nested_file.txt"

# Test file operations
echo "Testing file operations..."
cp "$MOUNT_POINT/test_file.txt" "$MOUNT_POINT/test_dir/copied_file.txt"
mv "$MOUNT_POINT/test_dir/copied_file.txt" "$MOUNT_POINT/test_dir/moved_file.txt"

# Final directory listing
echo "Final directory structure:"
find "$MOUNT_POINT" -type f -exec ls -l {} \\;

# Cleanup
echo "Cleaning up..."
kill $FUSE_PID 2>/dev/null || true
sleep 1
sudo umount "$MOUNT_POINT" 2>/dev/null || true

echo "=== Test completed successfully ==="
`;

  const handleFuseAction = (action: string) => {
    const newOp = `[${new Date().toLocaleTimeString()}] FUSE ${action}`;
    setOperations(prev => [newOp, ...prev].slice(0, 50));

    switch (action) {
      case 'mount':
        setFuseStatus('mounting');
        setTimeout(() => {
          setFuseStatus('mounted');
          toast.success('FUSE filesystem mounted successfully');
        }, 2000);
        break;
      case 'unmount':
        setFuseStatus('unmounting');
        setTimeout(() => {
          setFuseStatus('unmounted');
          toast.success('FUSE filesystem unmounted successfully');
        }, 1000);
        break;
      case 'test':
        toast.success('Running FUSE test suite...');
        break;
      case 'download':
        toast.success('FUSE implementation downloaded');
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mounted': return 'text-green-400';
      case 'mounting': return 'text-yellow-400';
      case 'unmounting': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* FUSE Status & Controls */}
      <Card className="bg-black/50 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center justify-between">
            <span>FUSE Interface</span>
            <Badge variant="outline" className={`border-current ${getStatusColor(fuseStatus)}`}>
              {fuseStatus.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-400 text-sm">Mount Point:</span>
            <Input
              value={mountPoint}
              onChange={(e) => setMountPoint(e.target.value)}
              className="flex-1 bg-black/50 border-green-500/20 text-green-300 placeholder-green-400/50"
              placeholder="/mnt/toyfs"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => handleFuseAction('mount')}
              disabled={fuseStatus === 'mounted' || fuseStatus === 'mounting'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Mount
            </Button>
            <Button
              onClick={() => handleFuseAction('unmount')}
              disabled={fuseStatus === 'unmounted' || fuseStatus === 'unmounting'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <StopIcon className="w-4 h-4 mr-2" />
              Unmount
            </Button>
            <Button
              onClick={() => handleFuseAction('test')}
              disabled={fuseStatus !== 'mounted'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button
              onClick={() => handleFuseAction('download')}
              variant="outline"
              className="border-green-500 text-green-400 hover:bg-green-500/10"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FUSE Implementation */}
      <Card className="bg-black/50 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-400">FUSE Implementation</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-black/50 border border-green-500/20 mb-4">
              <TabsTrigger
                value="interface"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
              >
                Python Implementation
              </TabsTrigger>
              <TabsTrigger
                value="test"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
              >
                Test Script
              </TabsTrigger>
              <TabsTrigger
                value="operations"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
              >
                Operations Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interface">
              <ScrollArea className="h-96 border border-green-500/20 rounded-md">
                <pre className="p-4 text-sm text-green-300 bg-black/30">
                  <code>{fuseCode}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="test">
              <ScrollArea className="h-96 border border-green-500/20 rounded-md">
                <pre className="p-4 text-sm text-green-300 bg-black/30">
                  <code>{testScript}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="operations">
              <ScrollArea className="h-96 border border-green-500/20 rounded-md p-4 bg-black/30">
                {operations.length === 0 ? (
                  <div className="text-green-400/60 text-center py-8">
                    No operations recorded yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {operations.map((op, index) => (
                      <div key={index} className="text-green-300 text-sm font-mono">
                        {op}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FuseInterface;
