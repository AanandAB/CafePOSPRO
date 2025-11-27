import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ChatMessage {
  _id: Id<"chatMessages">;
  fromUserId: Id<"staff">;
  toUserId: Id<"staff">;
  message: string;
  timestamp: number;
  read: boolean;
  readAt?: number;
  orderId?: Id<"orders">;
  tableId?: Id<"tables">;
}

interface StaffMember {
  _id: Id<"staff">;
  name: string;
  role: string;
  email: string;
  isActive: boolean;
}

export function StaffChat({ staffId }: { staffId: Id<"staff"> }) {
  const [selectedChef, setSelectedChef] = useState<Id<"staff"> | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allStaff = useQuery(api.staff.getAllStaff);
  const chatMessages = useQuery(api.notifications.getChatMessages, {
    userId: staffId,
  });
  const sendChatMessage = useMutation(api.notifications.sendChatMessage);
  const markChatMessagesAsRead = useMutation(
    api.notifications.markChatMessagesAsRead
  );

  // Filter messages for the selected chef
  const filteredMessages = chatMessages?.filter(
    (msg) =>
      (msg.fromUserId === selectedChef && msg.toUserId === staffId) ||
      (msg.fromUserId === staffId && msg.toUserId === selectedChef)
  );

  // Get chefs who have chatted with the staff member
  const chefs = chatMessages
    ? Array.from(
        new Set(
          chatMessages
            .filter(
              (msg) =>
                msg.fromUserId !== staffId &&
                allStaff?.find(
                  (s) => s._id === msg.fromUserId && s.role === "kitchen"
                )
            )
            .map((msg) => msg.fromUserId)
        )
      )
    : [];

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark messages as read when selecting a chef
  useEffect(() => {
    if (selectedChef) {
      void (async () => {
        try {
          await markChatMessagesAsRead({
            userId: staffId,
            fromUserId: selectedChef,
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      })();
    }
  }, [selectedChef, markChatMessagesAsRead, staffId]);

  const handleSendMessage = async () => {
    if (!selectedChef || !message.trim()) return;

    try {
      await sendChatMessage({
        fromUserId: staffId,
        toUserId: selectedChef,
        message: message.trim(),
      });
      setMessage("");
      toast.success("Message sent!");
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  const getUserInfo = (userId: Id<"staff">) => {
    return allStaff?.find((user) => user._id === userId);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Chat with Chef
      </h3>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Chef List */}
        <div className="md:w-1/3">
          <h4 className="font-medium text-gray-900 mb-2">Chefs</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allStaff
              ?.filter((user) => user.role === "kitchen" && user.isActive)
              .map((chef) => {
                const hasUnread = chatMessages?.some(
                  (msg) =>
                    msg.fromUserId === chef._id &&
                    msg.toUserId === staffId &&
                    !msg.read
                );

                return (
                  <button
                    key={chef._id}
                    onClick={() => setSelectedChef(chef._id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedChef === chef._id
                        ? "bg-amber-50 border-amber-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{chef.name}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {chef.role}
                        </p>
                      </div>
                      {hasUnread && (
                        <span className="bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center"></span>
                      )}
                    </div>
                  </button>
                );
              })}

            {chefs.length > 0 && (
              <>
                <h4 className="font-medium text-gray-900 mt-4 mb-2">
                  Recent Chats
                </h4>
                {chefs.map((chefId) => {
                  const chef = getUserInfo(chefId as Id<"staff">);
                  if (!chef) return null;

                  const lastMessage = chatMessages
                    ?.filter(
                      (msg) =>
                        (msg.fromUserId === chefId &&
                          msg.toUserId === staffId) ||
                        (msg.fromUserId === staffId && msg.toUserId === chefId)
                    )
                    .sort((a, b) => b.timestamp - a.timestamp)[0];

                  return (
                    <button
                      key={chefId}
                      onClick={() => setSelectedChef(chefId as Id<"staff">)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedChef === chefId
                          ? "bg-amber-50 border-amber-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {chef.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {lastMessage?.message || "No messages yet"}
                          </p>
                        </div>
                        {lastMessage?.fromUserId === chefId &&
                          !lastMessage.read && (
                            <span className="bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center"></span>
                          )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:w-2/3">
          {selectedChef ? (
            <div className="flex flex-col h-96">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {getUserInfo(selectedChef)?.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {getUserInfo(selectedChef)?.role}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                {filteredMessages?.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      msg.fromUserId === staffId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.fromUserId === staffId
                          ? "bg-amber-600 text-white"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.fromUserId === staffId
                            ? "text-amber-100"
                            : "text-gray-500"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  onClick={() => void handleSendMessage()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <p>Select a chef to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
