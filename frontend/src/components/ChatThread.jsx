import { useState, useEffect, useRef } from "react";
import { Send, MapPin, AlertCircle } from "lucide-react";
import { chatApi } from "../api/endpoints";
import { chatEventBus } from "../utils/chatEventBus";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function ChatThread({ request, onReportIssue }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const resp = await chatApi.list(request.id);
      setMessages(resp.data);
      // Mark as read when opened
      if (resp.data.some(m => !m.read_at && m.sender_id !== user.id)) {
        await chatApi.markRead(request.id);
      }
    } catch (err) {
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    const unsubscribe = chatEventBus.subscribe(request.id, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
      // Mark as read since thread is open
      chatApi.markRead(request.id).catch(() => {});
    });

    return () => unsubscribe();
  }, [request.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const resp = await chatApi.send(request.id, { body: newMessage });
      setMessages(prev => [...prev, resp.data]);
      setNewMessage("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-xs text-slate-500 animate-pulse">Loading chat...</div>;
  }

  return (
    <div className="flex flex-col border border-slate-200 rounded-xl bg-slate-50 mt-4 overflow-hidden">
      {/* Pickup Location Header */}
      {request.resource?.pickup_location && (
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-start gap-2.5">
          <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg shrink-0 mt-0.5">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup Location</p>
            <p className="text-xs font-semibold text-slate-800">{request.resource.pickup_location}</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="p-4 space-y-4 max-h-64 overflow-y-auto min-h-[160px]">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-400 mt-8">
            <p>No messages yet.</p>
            <p className="mt-1">Send a message to coordinate pickup.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isMe 
                      ? "bg-primary-600 text-white rounded-br-sm" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  <p>{msg.body}</p>
                  <p className={`text-[9px] mt-1 text-right ${isMe ? "text-primary-200" : "text-slate-400"}`}>
                    {format(new Date(msg.created_at), "h:mm a")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        
        {/* Synergy: Report Issue */}
        <div className="mt-2 text-center">
          <button 
            type="button"
            onClick={() => onReportIssue(request)}
            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            <AlertCircle className="h-3 w-3" /> Report an issue with this exchange
          </button>
        </div>
      </div>
    </div>
  );
}
