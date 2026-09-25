import { Send, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function TelegramConnect() {
  const { user } = useAuth();
  const linked = !!user?.telegram_chat_id;

  return (
    <div className="rounded-sm border border-border p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {linked ? <Check className="h-4 w-4 text-primary" /> : <Send className="h-4 w-4 text-muted-foreground" />}
        {linked ? 'Telegram bot linked to your account' : 'Telegram bot not linked yet'}
      </div>
      {!linked && (
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          Open a chat with your configured Telegram bot and send your login email (<span className="text-foreground">{user?.email}</span>) as a message.
          It will link your account automatically and reply to "hot leads", "briefing", and "watchlist".
        </p>
      )}
    </div>
  );
}
