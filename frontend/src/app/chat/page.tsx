'use client';

import React from 'react';
import { ChatRoom } from '@/components/ChatRoom';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';

export default function ChatPage() {
  return (
    <TeamGuard>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 bg-muted/40 p-4">
              <div className="max-w-4xl mx-auto h-full">
                <ChatRoom roomId="global" roomName="团队聊天室" />
              </div>
            </main>
          </div>
        </div>
      </div>
    </TeamGuard>
  );
}
