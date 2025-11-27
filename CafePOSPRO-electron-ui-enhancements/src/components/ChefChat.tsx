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

interface ChefDefaultReply {
  _id: Id<"chefDefaultReplies">;
  chefId: Id<"staff">;
  triggerKeyword: string;
  replyMessage: string;
  isActive: boolean;
}

export function ChefChat({ chefId }: { chefId: Id<"staff"> }) {
  const [selectedUser, setSelectedUser] = useState<Id<"staff"> | null>(null);
  const [message, setMessage] = useState("");
  const [showDefaultReplies, setShowDefaultReplies] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allStaff = useQuery(api.staff.getAllStaff);
  const chatMessages = useQuery(api.notifications.getChatMessages, {
    userId: chefId,
  });
  const defaultReplies = useQuery(api.notifications.getChefDefaultReplies, {
    chefId,
  });
  const sendChatMessage = useMutation(api.notifications.sendChatMessage);
  const markChatMessagesAsRead = useMutation(
    api.notifications.markChatMessagesAsRead
  );
  const createChefDefaultReply = useMutation(
    api.notifications.createChefDefaultReply
  );
  const updateChefDefaultReply = useMutation(
    api.notifications.updateChefDefaultReply
  );
  const deleteChefDefaultReply = useMutation(
    api.notifications.deleteChefDefaultReply
  );

  // Wrapper functions for event handlers to avoid Promise-returning function warnings
  const handleSendMessageClick = () => {
    handleSendMessage().catch(console.error);
  };

  const handleSendMessageKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handleSendMessage().catch(console.error);
    }
  };

  const handleCreateDefaultReplyClick = () => {
    handleCreateDefaultReply().catch(console.error);
  };

  const handleToggleReplyStatusClick =
    (replyId: Id<"chefDefaultReplies">, isActive: boolean) => () => {
      handleToggleReplyStatus(replyId, isActive).catch(console.error);
    };

  const handleDeleteReplyClick = (replyId: Id<"chefDefaultReplies">) => () => {
    handleDeleteReply(replyId).catch(console.error);
  };

  const handleUseDefaultReplyClick = (reply: string) => () => {
    handleUseDefaultReply(reply);
  };

  // Filter messages for the selected user
  const filteredMessages = chatMessages?.filter(
    (msg) =>
      (msg.fromUserId === selectedUser && msg.toUserId === chefId) ||
      (msg.fromUserId === chefId && msg.toUserId === selectedUser)
  );

  // Get users who have chatted with the chef
  const chatUsers = chatMessages
    ? Array.from(
        new Set(
          chatMessages
            .filter((msg) => msg.fromUserId !== chefId)
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

  // Mark messages as read when selecting a user
  useEffect(() => {
    if (selectedUser) {
      void (async () => {
        try {
          await markChatMessagesAsRead({
            userId: chefId,
            fromUserId: selectedUser,
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      })();
    }
  }, [selectedUser, markChatMessagesAsRead, chefId]);

  const handleSendMessage = async () => {
    if (!selectedUser || !message.trim()) return;

    try {
      await sendChatMessage({
        fromUserId: chefId,
        toUserId: selectedUser,
        message: message.trim(),
      });
      setMessage("");
      toast.success("Message sent!");
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  const handleCreateDefaultReply = async () => {
    if (!newKeyword.trim() || !newReply.trim()) {
      toast.error("Both keyword and reply are required");
      return;
    }

    try {
      await createChefDefaultReply({
        chefId,
        triggerKeyword: newKeyword.trim().toLowerCase(),
        replyMessage: newReply.trim(),
      });
      setNewKeyword("");
      setNewReply("");
      toast.success("Default reply created!");
    } catch (error: any) {
      toast.error(`Failed to create default reply: ${error.message}`);
    }
  };

  const handleToggleReplyStatus = async (
    replyId: Id<"chefDefaultReplies">,
    isActive: boolean
  ) => {
    const reply = defaultReplies?.find((r) => r._id === replyId);
    if (!reply) return;

    try {
      await updateChefDefaultReply({
        replyId,
        replyMessage: reply.replyMessage,
        isActive: !isActive,
      });
      toast.success(`Reply ${!isActive ? "enabled" : "disabled"}!`);
    } catch (error: any) {
      toast.error(`Failed to update reply: ${error.message}`);
    }
  };

  const handleDeleteReply = async (replyId: Id<"chefDefaultReplies">) => {
    if (!window.confirm("Are you sure you want to delete this default reply?"))
      return;

    try {
      await deleteChefDefaultReply({ replyId });
      toast.success("Default reply deleted!");
    } catch (error: any) {
      toast.error(`Failed to delete reply: ${error.message}`);
    }
  };

  const handleUseDefaultReply = (reply: string) => {
    setMessage(reply);
    setShowDefaultReplies(false);
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
        Chat with Staff
      </h3>

      <div className="flex flex-col md:flex-row gap-6">
        {/* User List */}
        <div className="md:w-1/3">
          <h4 className="font-medium text-gray-900 mb-2">Staff Members</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allStaff
              ?.filter((user) => user._id !== chefId && user.isActive)
              .map((user) => {
                const hasUnread = chatMessages?.some(
                  (msg) =>
                    msg.fromUserId === user._id &&
                    msg.toUserId === chefId &&
                    !msg.read
                );

                return (
                  <button
                    key={user._id}
                    onClick={() => setSelectedUser(user._id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedUser === user._id
                        ? "bg-amber-50 border-amber-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {user.role}
                        </p>
                      </div>
                      {hasUnread && (
                        <span className="bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center"></span>
                      )}
                    </div>
                  </button>
                );
              })}

            {chatUsers.length > 0 && (
              <>
                <h4 className="font-medium text-gray-900 mt-4 mb-2">
                  Recent Chats
                </h4>
                {chatUsers.map((userId) => {
                  const user = getUserInfo(userId as Id<"staff">);
                  if (!user) return null;

                  const lastMessage = chatMessages
                    ?.filter(
                      (msg) =>
                        (msg.fromUserId === userId &&
                          msg.toUserId === chefId) ||
                        (msg.fromUserId === chefId && msg.toUserId === userId)
                    )
                    .sort((a, b) => b.timestamp - a.timestamp)[0];

                  return (
                    <button
                      key={userId}
                      onClick={() => setSelectedUser(userId as Id<"staff">)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedUser === userId
                          ? "bg-amber-50 border-amber-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {lastMessage?.message || "No messages yet"}
                          </p>
                        </div>
                        {lastMessage?.fromUserId === userId &&
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
          {selectedUser ? (
            <div className="flex flex-col h-96">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {getUserInfo(selectedUser)?.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {getUserInfo(selectedUser)?.role}
                  </p>
                </div>
                <button
                  onClick={() => setShowDefaultReplies(!showDefaultReplies)}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  {showDefaultReplies ? "Hide" : "Show"} Default Replies
                </button>
              </div>

              {/* Default Replies */}
              {showDefaultReplies && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <h5 className="font-medium text-amber-800 mb-2">
                    Default Replies
                  </h5>
                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                    {defaultReplies?.map((reply) => (
                      <div
                        key={reply._id}
                        className="flex justify-between items-center p-2 bg-white rounded border"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {reply.triggerKeyword}
                          </p>
                          <p className="text-xs text-gray-600">
                            {reply.replyMessage}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleUseDefaultReplyClick(
                              reply.replyMessage
                            )}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Use
                          </button>
                          <button
                            onClick={handleToggleReplyStatusClick(
                              reply._id,
                              reply.isActive
                            )}
                            className={`text-xs px-2 py-1 rounded ${
                              reply.isActive
                                ? "bg-yellow-600 text-white hover:bg-yellow-700"
                                : "bg-gray-600 text-white hover:bg-gray-700"
                            }`}
                          >
                            {reply.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={handleDeleteReplyClick(reply._id)}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Keyword (e.g., 'time')"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Reply message"
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleCreateDefaultReplyClick}
                      className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                {filteredMessages?.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      msg.fromUserId === chefId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.fromUserId === chefId
                          ? "bg-amber-600 text-white"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.fromUserId === chefId
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
                  onKeyDown={handleSendMessageKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  onClick={handleSendMessageClick}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <p>Select a staff member to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
