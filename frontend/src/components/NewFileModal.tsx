'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCreateFile: (name: string, type: 'FILE' | 'DIRECTORY') => void;
}

export function NewFileModal({ isOpen, onClose, projectId, onCreateFile }: NewFileModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'FILE' | 'DIRECTORY'>('FILE');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    onCreateFile(name, type);
    
    setLoading(false);
    setName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">新建文件</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">类型</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="FILE"
                  checked={type === 'FILE'}
                  onChange={() => setType('FILE')}
                />
                <span>文件</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="DIRECTORY"
                  checked={type === 'DIRECTORY'}
                  onChange={() => setType('DIRECTORY')}
                />
                <span>文件夹</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              名称
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'FILE' ? 'index.ts' : 'components'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? '创建中...' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
