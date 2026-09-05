"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  channel: "email" | "sms";
  recipient: string;
  subject: string | null;
  body: string;
  status: "sent" | "logged" | "failed";
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-green-100 text-green-700",
  logged: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

export function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "email" | "sms">("all");

  useEffect(() => {
    fetch("/api/admin/notifications").then((r) => r.json()).then((d) => setMessages(d.messages ?? [])).finally(() => setLoading(false));
  }, []);

  const shown = filter === "all" ? messages : messages.filter((m) => m.channel === filter);

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Messages</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Every confirmation and reminder sent to clients. <span className="font-medium">logged</span> = printed in dev
        (no email/SMS keys yet); <span className="font-medium">sent</span> = delivered via Resend/Twilio in production.
      </p>

      <div className="mb-4 flex gap-2">
        {(["all", "email", "sms"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm capitalize ${filter === f ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</div>
      ) : shown.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No messages yet. They appear here as clients book and get reminders.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {m.channel === "email" ? <Mail className="h-4 w-4 text-brand-500" /> : <MessageSquare className="h-4 w-4 text-brand-500" />}
                  {m.recipient}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[m.status] ?? ""}`}>{m.status}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              {m.subject && <div className="mt-1 text-sm font-medium">{m.subject}</div>}
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
