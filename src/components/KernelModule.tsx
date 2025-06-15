
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeIcon, DownloadIcon, PlayIcon, StopCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

const KernelModule = () => {
  const [moduleStatus, setModuleStatus] = useState('unloaded');
  const [activeFile, setActiveFile] = useState('toyfs.c');

  const kernelFiles = {
    'toyfs.c': `/*
 * ToyFS - A Simple Educational Filesystem
 * Linux Kernel Module Implementation
 */

#include <linux/init.h>
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/pagemap.h>
#include <linux/highmem.h>
#include <linux/time.h>
#include <linux/string.h>
#include <linux/backing-dev.h>
#include <linux/ramfs.h>
#include <linux/sched.h>
#include <linux/parser.h>
#include <linux/magic.h>
#include <linux/slab.h>
#include <asm/uaccess.h>

#define TOYFS_MAGIC 0x19980122
#define TOYFS_DEFAULT_MODE 0755

static const struct super_operations toyfs_ops;
static const struct inode_operations toyfs_dir_inode_operations;
static const struct file_operations toyfs_file_operations;
static const struct address_space_operations toyfs_aops;

struct toyfs_mount_opts {
    umode_t mode;
};

struct toyfs_fs_info {
    struct toyfs_mount_opts mount_opts;
};

/*
 * Inode operations
 */
static struct inode *toyfs_get_inode(struct super_block *sb,
                                   const struct inode *dir,
                                   umode_t mode, dev_t dev)
{
    struct inode *inode = new_inode(sb);

    if (inode) {
        inode->i_ino = get_next_ino();
        inode_init_owner(inode, dir, mode);
        inode->i_mapping->a_ops = &toyfs_aops;
        mapping_set_gfp_mask(inode->i_mapping, GFP_HIGHUSER);
        mapping_set_unevictable(inode->i_mapping);
        inode->i_atime = inode->i_mtime = inode->i_ctime = current_time(inode);
        
        switch (mode & S_IFMT) {
        default:
            init_special_inode(inode, mode, dev);
            break;
        case S_IFREG:
            inode->i_op = &toyfs_file_inode_operations;
            inode->i_fop = &toyfs_file_operations;
            break;
        case S_IFDIR:
            inode->i_op = &toyfs_dir_inode_operations;
            inode->i_fop = &simple_dir_operations;
            inc_nlink(inode);
            break;
        case S_IFLNK:
            inode->i_op = &page_symlink_inode_operations;
            inode_nohighmem(inode);
            break;
        }
    }
    return inode;
}

/*
 * File operations
 */
static int toyfs_mknod(struct inode *dir, struct dentry *dentry,
                      umode_t mode, dev_t dev)
{
    struct inode *inode = toyfs_get_inode(dir->i_sb, dir, mode, dev);
    int error = -ENOSPC;

    if (inode) {
        d_instantiate(dentry, inode);
        dget(dentry);
        error = 0;
        dir->i_mtime = dir->i_ctime = current_time(dir);
    }
    return error;
}

static int toyfs_mkdir(struct inode *dir, struct dentry *dentry, umode_t mode)
{
    int retval = toyfs_mknod(dir, dentry, mode | S_IFDIR, 0);
    if (!retval)
        inc_nlink(dir);
    return retval;
}

static int toyfs_create(struct inode *dir, struct dentry *dentry,
                       umode_t mode, bool excl)
{
    return toyfs_mknod(dir, dentry, mode | S_IFREG, 0);
}

static int toyfs_symlink(struct inode *dir, struct dentry *dentry,
                        const char *symname)
{
    struct inode *inode;
    int error = -ENOSPC;

    inode = toyfs_get_inode(dir->i_sb, dir, S_IFLNK|S_IRWXUGO, 0);
    if (inode) {
        int l = strlen(symname)+1;
        error = page_symlink(inode, symname, l);
        if (!error) {
            d_instantiate(dentry, inode);
            dget(dentry);
            dir->i_mtime = dir->i_ctime = current_time(dir);
        } else
            iput(inode);
    }
    return error;
}

static const struct inode_operations toyfs_dir_inode_operations = {
    .create     = toyfs_create,
    .lookup     = simple_lookup,
    .link       = simple_link,
    .unlink     = simple_unlink,
    .symlink    = toyfs_symlink,
    .mkdir      = toyfs_mkdir,
    .rmdir      = simple_rmdir,
    .mknod      = toyfs_mknod,
    .rename     = simple_rename,
};

/*
 * Super operations
 */
static int toyfs_fill_super(struct super_block *sb, void *data, int silent)
{
    struct toyfs_fs_info *fsi;
    struct inode *inode;
    int err;

    fsi = kzalloc(sizeof(struct toyfs_fs_info), GFP_KERNEL);
    sb->s_fs_info = fsi;
    if (!fsi)
        return -ENOMEM;

    err = toyfs_parse_options(data, &fsi->mount_opts);
    if (err)
        return err;

    sb->s_maxbytes = MAX_LFS_FILESIZE;
    sb->s_blocksize = PAGE_SIZE;
    sb->s_blocksize_bits = PAGE_SHIFT;
    sb->s_magic = TOYFS_MAGIC;
    sb->s_op = &toyfs_ops;
    sb->s_time_gran = 1;

    inode = toyfs_get_inode(sb, NULL, S_IFDIR | fsi->mount_opts.mode, 0);
    sb->s_root = d_make_root(inode);
    if (!sb->s_root)
        return -ENOMEM;

    return 0;
}

struct dentry *toyfs_mount(struct file_system_type *fs_type,
                          int flags, const char *dev_name,
                          void *data)
{
    return mount_nodev(fs_type, flags, data, toyfs_fill_super);
}

static void toyfs_kill_sb(struct super_block *sb)
{
    kfree(sb->s_fs_info);
    kill_litter_super(sb);
}

static struct file_system_type toyfs_fs_type = {
    .owner      = THIS_MODULE,
    .name       = "toyfs",
    .mount      = toyfs_mount,
    .kill_sb    = toyfs_kill_sb,
    .fs_flags   = FS_USERNS_MOUNT,
};

/*
 * Module init/exit
 */
static int __init init_toyfs(void)
{
    int retval;

    retval = register_filesystem(&toyfs_fs_type);
    if (!retval) {
        printk(KERN_INFO "ToyFS: filesystem registered\\n");
    }

    return retval;
}

static void __exit exit_toyfs(void)
{
    unregister_filesystem(&toyfs_fs_type);
    printk(KERN_INFO "ToyFS: filesystem unregistered\\n");
}

MODULE_ALIAS_FS("toyfs");
MODULE_DESCRIPTION("A simple educational filesystem");
MODULE_AUTHOR("ToyFS Development Team");
MODULE_LICENSE("GPL");

module_init(init_toyfs);
module_exit(exit_toyfs);`,

    'Makefile': `obj-m += toyfs.o

KDIR := /lib/modules/$(shell uname -r)/build

all:
\tmake -C $(KDIR) M=$(PWD) modules

clean:
\tmake -C $(KDIR) M=$(PWD) clean

install:
\tsudo insmod toyfs.ko

uninstall:
\tsudo rmmod toyfs

test:
\tsudo mkdir -p /mnt/toyfs
\tsudo mount -t toyfs none /mnt/toyfs
\tls -la /mnt/toyfs/
\tsudo umount /mnt/toyfs

.PHONY: all clean install uninstall test`,

    'toyfs.h': `#ifndef _TOYFS_H
#define _TOYFS_H

#include <linux/fs.h>
#include <linux/pagemap.h>

#define TOYFS_MAGIC 0x19980122

struct toyfs_inode_info {
    struct inode vfs_inode;
    unsigned long flags;
    struct timespec64 i_crtime;
};

struct toyfs_sb_info {
    unsigned long max_inodes;
    unsigned long free_inodes;
    unsigned long max_blocks;
    unsigned long free_blocks;
    struct mutex toyfs_lock;
};

/* Inode flags */
#define TOYFS_IMMUTABLE_FL      0x00000010
#define TOYFS_APPEND_FL         0x00000020

static inline struct toyfs_inode_info *TOYFS_I(struct inode *inode)
{
    return container_of(inode, struct toyfs_inode_info, vfs_inode);
}

static inline struct toyfs_sb_info *TOYFS_SB(struct super_block *sb)
{
    return sb->s_fs_info;
}

/* Function prototypes */
extern const struct inode_operations toyfs_file_inode_operations;
extern const struct file_operations toyfs_file_operations;
extern const struct address_space_operations toyfs_aops;

int toyfs_parse_options(char *options, struct toyfs_mount_opts *opts);

#endif /* _TOYFS_H */`
  };

  const handleModuleAction = (action: string) => {
    switch (action) {
      case 'load':
        setModuleStatus('loading');
        setTimeout(() => {
          setModuleStatus('loaded');
          toast.success('Kernel module loaded successfully');
        }, 2000);
        break;
      case 'unload':
        setModuleStatus('unloading');
        setTimeout(() => {
          setModuleStatus('unloaded');
          toast.success('Kernel module unloaded successfully');
        }, 1000);
        break;
      case 'download':
        toast.success('Kernel module source downloaded');
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded': return 'text-green-400';
      case 'loading': return 'text-yellow-400';
      case 'unloading': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Status */}
      <Card className="bg-black/50 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center justify-between">
            <span className="flex items-center">
              <CodeIcon className="w-5 h-5 mr-2" />
              Kernel Module Status
            </span>
            <Badge variant="outline" className={`border-current ${getStatusColor(moduleStatus)}`}>
              {moduleStatus.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleModuleAction('load')}
              disabled={moduleStatus === 'loaded' || moduleStatus === 'loading'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Load Module
            </Button>
            <Button
              onClick={() => handleModuleAction('unload')}
              disabled={moduleStatus === 'unloaded' || moduleStatus === 'unloading'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <StopCircleIcon className="w-4 h-4 mr-2" />
              Unload Module
            </Button>
            <Button
              onClick={() => handleModuleAction('download')}
              variant="outline"
              className="border-green-500 text-green-400 hover:bg-green-500/10"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Source
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Source Code */}
      <Card className="bg-black/50 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-400">Source Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFile} onValueChange={setActiveFile}>
            <TabsList className="bg-black/50 border border-green-500/20 mb-4">
              {Object.keys(kernelFiles).map((file) => (
                <TabsTrigger
                  key={file}
                  value={file}
                  className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
                >
                  {file}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(kernelFiles).map(([filename, content]) => (
              <TabsContent key={filename} value={filename}>
                <ScrollArea className="h-96 border border-green-500/20 rounded-md">
                  <pre className="p-4 text-sm text-green-300 bg-black/30">
                    <code>{content}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default KernelModule;
