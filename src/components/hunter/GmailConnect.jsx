import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Check, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function GmailConnect() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['gmail-connection'],
    queryFn: () => api.functions.invoke('checkGmailConnection'),
  });

  const connect = async () => {
    setConnecting(true);
    try {
      await api.connectors.connectAppUser();
      await queryClient.invalidateQueries({ queryKey: ['gmail-connection'] });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await api.connectors.disconnectGmail();
      queryClient.invalidateQueries({ queryKey: ['gmail-connection'] });
      toast.success('Gmail disconnected');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  if (!data?.configured) {
    return <p className="font-mono text-xs text-muted-foreground">Gmail is not configured on the server (missing OAuth client credentials).</p>;
  }

  if (data.connected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-border p-3">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          Connected as <span className="font-mono text-xs text-muted-foreground">{data.email}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={disconnect}>Disconnect</Button>
      </div>
    );
  }

  return (
    <Button type="button" onClick={connect} disabled={connecting}>
      <Mail className="h-4 w-4" />
      {connecting ? 'Opening…' : 'Connect Gmail'}
    </Button>
  );
}
