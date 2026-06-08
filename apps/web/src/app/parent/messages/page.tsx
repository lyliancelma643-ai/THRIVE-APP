'use client';

import { useState } from 'react';

export default function ParentMessagesPage() {
  const [selected, setSelected] = useState(0);

  const conversations = [
    {
      coach: 'Sarah Martin',
      child: 'Léa',
      lastMessage: 'Super séance aujourd\'hui, Léa progresse bien !',
      time: 'Il y a 2h',
      unread: 1,
    },
    {
      coach: 'Marc Leblanc',
      child: 'Tom',
      lastMessage: 'On va ajuster le programme la semaine prochaine.',
      time: 'Hier',
      unread: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">Échangez avec les coachs de vos enfants.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex h-[520px]">
        {/* Conversations list */}
        <div className="w-72 border-r border-gray-100 flex flex-col overflow-y-auto">
          {conversations.map((conv, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`p-4 text-left border-b border-gray-50 transition-colors ${
                selected === i ? 'bg-brand-primary/5 border-l-2 border-l-brand-primary' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900">{conv.coach}</span>
                <span className="text-xs text-gray-400">{conv.time}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
              <p className="text-xs text-brand-primary mt-1">Pour {conv.child}</p>
              {conv.unread > 0 && (
                <span className="inline-block mt-1 w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{conversations[selected].coach}</h3>
            <p className="text-xs text-gray-500">Coach de {conversations[selected].child}</p>
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                {conversations[selected].coach[0]}
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-800 max-w-xs">
                {conversations[selected].lastMessage}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Écrire un message..."
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <button className="bg-brand-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
