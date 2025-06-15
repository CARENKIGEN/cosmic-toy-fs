
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TerminalIcon } from 'lucide-react';

interface TerminalProps {
  fsState: any;
  setFsState: (state: any) => void;
}

const TerminalInterface: React.FC<TerminalProps> = ({ fsState, setFsState }) => {
  const [history, setHistory] = useState<string[]>([
    'ToyFS Terminal Interface v1.0',
    'Type "help" for available commands',
    ''
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const commands = {
    help: {
      description: 'Show available commands',
      action: () => [
        'Available commands:',
        '  help          - Show this help message',
        '  ls [path]     - List directory contents',
        '  cat <file>    - Display file contents',
        '  mkdir <dir>   - Create directory',
        '  touch <file>  - Create empty file',
        '  rm <file>     - Remove file',
        '  rmdir <dir>   - Remove directory',
        '  cd <path>     - Change directory',
        '  pwd           - Print working directory',
        '  stat <file>   - Show file statistics',
        '  mount         - Mount ToyFS',
        '  umount        - Unmount ToyFS',
        '  lsmod         - List loaded modules',
        '  dmesg         - Show kernel messages',
        '  clear         - Clear terminal',
        ''
      ]
    },
    ls: {
      description: 'List directory contents',
      action: (args: string[]) => {
        const path = args[0] || '/';
        return [
          `Listing contents of ${path}:`,
          'drwxr-xr-x  2 root root 4096 Jan 15 10:30 home',
          'drwxr-xr-x  2 root root 4096 Jan 15 10:30 tmp',
          '-rw-r--r--  1 root root   13 Jan 15 10:31 test.txt',
          ''
        ];
      }
    },
    pwd: {
      description: 'Print working directory',
      action: () => ['/mnt/toyfs', '']
    },
    mount: {
      description: 'Mount ToyFS',
      action: () => [
        'Mounting ToyFS...',
        'mount -t toyfs none /mnt/toyfs',
        'ToyFS mounted successfully at /mnt/toyfs',
        ''
      ]
    },
    umount: {
      description: 'Unmount ToyFS',
      action: () => [
        'Unmounting ToyFS...',
        'umount /mnt/toyfs',
        'ToyFS unmounted successfully',
        ''
      ]
    },
    lsmod: {
      description: 'List loaded modules',
      action: () => [
        'Module                  Size  Used by',
        'toyfs                  16384  0',
        'fuse                   98304  1',
        'ext4                  737280  2',
        'jbd2                  114688  1 ext4',
        ''
      ]
    },
    dmesg: {
      description: 'Show kernel messages',
      action: () => [
        '[  123.456789] ToyFS: filesystem registered',
        '[  123.789012] ToyFS: mount successful',
        '[  124.012345] ToyFS: inode 2 allocated',
        '[  124.345678] ToyFS: file created: test.txt',
        '[  124.678901] ToyFS: directory created: home',
        ''
      ]
    },
    cat: {
      description: 'Display file contents',
      action: (args: string[]) => {
        if (!args[0]) {
          return ['cat: missing file operand', ''];
        }
        return [
          `Contents of ${args[0]}:`,
          'Hello, this is a test file in ToyFS!',
          'ToyFS supports basic file operations.',
          ''
        ];
      }
    },
    mkdir: {
      description: 'Create directory',
      action: (args: string[]) => {
        if (!args[0]) {
          return ['mkdir: missing operand', ''];
        }
        return [`Directory '${args[0]}' created successfully`, ''];
      }
    },
    touch: {
      description: 'Create empty file',
      action: (args: string[]) => {
        if (!args[0]) {
          return ['touch: missing file operand', ''];
        }
        return [`File '${args[0]}' created successfully`, ''];
      }
    },
    rm: {
      description: 'Remove file',
      action: (args: string[]) => {
        if (!args[0]) {
          return ['rm: missing operand', ''];
        }
        return [`File '${args[0]}' removed successfully`, ''];
      }
    },
    rmdir: {
      description: 'Remove directory',
      action: (args: string[]) => {
        if (!args[0]) {
          return ['rmdir: missing operand', ''];
        }
        return [`Directory '${args[0]}' removed successfully`, ''];
      }
    },
    stat: {
      description: 'Show file statistics',
      action: (args: string[]) => {
        if (!args[0]) {
          return ['stat: missing operand', ''];
        }
        return [
          `Statistics for '${args[0]}':`,
          '  File: test.txt',
          '  Size: 64        Blocks: 8          IO Block: 4096   regular file',
          '  Device: 803h/2051d    Inode: 12345      Links: 1',
          '  Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)',
          '  Access: 2024-01-15 10:31:42.123456789 +0000',
          '  Modify: 2024-01-15 10:31:42.123456789 +0000',
          '  Change: 2024-01-15 10:31:42.123456789 +0000',
          ''
        ];
      }
    },
    clear: {
      description: 'Clear terminal',
      action: () => {
        setHistory([]);
        return [];
      }
    },
    cd: {
      description: 'Change directory',
      action: (args: string[]) => {
        const path = args[0] || '/';
        return [`Changed directory to ${path}`, ''];
      }
    }
  };

  const executeCommand = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const parts = trimmed.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    const prompt = `root@toyfs:/mnt/toyfs# ${trimmed}`;
    
    if (command in commands) {
      const result = commands[command as keyof typeof commands].action(args);
      setHistory(prev => [...prev, prompt, ...result]);
    } else {
      setHistory(prev => [...prev, prompt, `${command}: command not found`, '']);
    }

    setCommandHistory(prev => [trimmed, ...prev]);
    setCurrentCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      if (newIndex >= 0 && newIndex < commandHistory.length) {
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      if (newIndex === -1) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      } else {
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Card className="bg-black/50 border-green-500/20">
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center">
          <TerminalIcon className="w-5 h-5 mr-2" />
          ToyFS Terminal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-black/80 rounded-md p-4 font-mono text-sm">
          <ScrollArea className="h-96 mb-4" ref={scrollRef}>
            <div className="space-y-1">
              {history.map((line, index) => (
                <div
                  key={index}
                  className={
                    line.startsWith('root@toyfs:')
                      ? 'text-green-400'
                      : line.includes('error') || line.includes('not found')
                      ? 'text-red-400'
                      : 'text-green-300'
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex items-center space-x-2">
            <span className="text-green-400">root@toyfs:/mnt/toyfs#</span>
            <Input
              ref={inputRef}
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none text-green-300 placeholder-green-400/50 focus:ring-0 focus:outline-none p-0"
              placeholder="Enter command..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TerminalInterface;
