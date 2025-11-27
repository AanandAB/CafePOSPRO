import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface CustomerChatMessage {
  _id: Id<"customerChatMessages">;
  fromCustomerId: string;
  toUserId: Id<"staff">;
  message: string;
  timestamp: number;
  read: boolean;
  readAt?: number;
  tableId: Id<"tables">;
  tableName: string;
}

export function KitchenChat({
  kitchenStaffId,
}: {
  kitchenStaffId: Id<"staff">;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showDefaultReplies, setShowDefaultReplies] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");
  const [clearedCustomers, setClearedCustomers] = useState<Set<string>>(
    new Set()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const customerChatMessages = useQuery(
    api.notifications.getCustomerChatMessages,
    {
      userId: kitchenStaffId,
    }
  );

  // Get all customer chat messages to show available chats
  const allCustomerChatMessages = useQuery(
    api.notifications.getAllCustomerChatMessages
  );
  const sendCustomerChatMessage = useMutation(
    api.notifications.sendCustomerChatMessage
  );
  const sendCustomerChatReply = useMutation(
    api.notifications.sendCustomerChatReply
  ); // Add this
  const markCustomerChatMessagesAsRead = useMutation(
    api.notifications.markCustomerChatMessagesAsRead
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
  const acceptCustomerChat = useMutation(api.notifications.acceptCustomerChat);
  const defaultReplies = useQuery(api.notifications.getChefDefaultReplies, {
    chefId: kitchenStaffId,
  });

  // Get unique customers who have chatted, sorted by latest message timestamp
  const chatCustomers = allCustomerChatMessages
    ? Array.from(
        new Set(
          allCustomerChatMessages
            .sort((a, b) => b.timestamp - a.timestamp) // Sort by latest first
            .map((msg) => msg.fromCustomerId)
        )
      )
    : [];

  // Wrapper functions for event handlers to avoid Promise-returning function warnings
  const handleSendMessageClick = () => {
    handleSendMessage().catch(console.error);
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
    setMessage(reply);
  };

  const handleClearChat = (customerName: string) => {
    const newClearedCustomers = new Set(clearedCustomers);
    newClearedCustomers.add(customerName);
    setClearedCustomers(newClearedCustomers);

    // If the cleared customer was selected, deselect them
    if (selectedCustomer === customerName) {
      setSelectedCustomer(null);
    }

    toast.success(`Chat with ${customerName} cleared`);
  };

  const handleClearAllChats = () => {
    if (!window.confirm("Are you sure you want to clear all chats?")) return;

    const newClearedCustomers = new Set(chatCustomers);
    setClearedCustomers(newClearedCustomers);
    setSelectedCustomer(null);

    toast.success("All chats cleared");
  };

  const handleAcceptChat = async (customerName: string) => {
    try {
      await acceptCustomerChat({
        customerId: customerName,
        staffId: kitchenStaffId,
      });
      toast.success(`Chat with ${customerName} accepted!`);
    } catch (error: any) {
      toast.error(`Failed to accept chat: ${error.message}`);
    }
  };

  const handleAcceptChatClick = (customerName: string) => () => {
    handleAcceptChat(customerName).catch(console.error);
  };

  // Filter messages for the selected customer
  const filteredMessages = customerChatMessages?.filter(
    (msg) => msg.fromCustomerId === selectedCustomer
  );

  const handleUseDefaultReply = (reply: string) => {
    setMessage(reply);
  };

  const handleCreateDefaultReply = async () => {
    if (!newKeyword.trim() || !newReply.trim()) {
      toast.error("Both keyword and reply are required");
      return;
    }

    try {
      await createChefDefaultReply({
        chefId: kitchenStaffId,
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

  // Scroll to top of messages (since latest are at the top)
  useEffect(() => {
    scrollToTop();
  }, [filteredMessages]);

  const scrollToTop = () => {
    // Scroll to the top of the messages container
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      container.scrollTop = 0;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark messages as read when selecting a customer
  useEffect(() => {
    if (selectedCustomer) {
      void (async () => {
        try {
          await markCustomerChatMessagesAsRead({
            userId: kitchenStaffId,
            fromCustomerId: selectedCustomer,
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      })();
    }
  }, [selectedCustomer, markCustomerChatMessagesAsRead, kitchenStaffId]);

  // Auto-trigger default replies when customer messages contain keywords
  useEffect(() => {
    if (!selectedCustomer || !defaultReplies || defaultReplies.length === 0)
      return;

    // Check if we have new customer messages
    const customerMessages =
      filteredMessages?.filter((msg) => !msg.isReply) || [];
    if (customerMessages.length === 0) return;

    // Get the most recent customer message (first in the reversed list)
    const latestCustomerMessage = customerMessages[0];

    // Check if we've already processed this message
    const processedMessagesKey = `processed_messages_${kitchenStaffId}_${selectedCustomer}`;
    const processedMessages = JSON.parse(
      localStorage.getItem(processedMessagesKey) || "[]"
    );

    if (processedMessages.includes(latestCustomerMessage._id)) return;

    // Check for keyword matches in the latest customer message
    const messageText = latestCustomerMessage.message.toLowerCase().trim();

    // Find matching default reply
    const matchingReply = defaultReplies.find(
      (reply) =>
        reply.isActive &&
        messageText.includes(reply.triggerKeyword.toLowerCase())
    );

    if (matchingReply) {
      // Mark this message as processed to avoid duplicate replies
      processedMessages.push(latestCustomerMessage._id);
      localStorage.setItem(
        processedMessagesKey,
        JSON.stringify(processedMessages)
      );

      // Send the default reply
      void (async () => {
        try {
          await sendCustomerChatReply({
            fromUserId: kitchenStaffId,
            toCustomerId: selectedCustomer,
            message: matchingReply.replyMessage,
            tableId: latestCustomerMessage.tableId,
            tableName: latestCustomerMessage.tableName,
          });
          toast.success(
            `Auto-replied to keyword: ${matchingReply.triggerKeyword}`
          );
        } catch (error) {
          console.error("Error sending auto-reply:", error);
          toast.error("Failed to send auto-reply");
        }
      })();
    }
  }, [filteredMessages, defaultReplies, selectedCustomer, kitchenStaffId]);

  const handleSendMessage = async () => {
    if (!selectedCustomer || !message.trim()) return;

    try {
      // Send reply to customer
      await sendCustomerChatReply({
        fromUserId: kitchenStaffId,
        toCustomerId: selectedCustomer,
        message: message.trim(),
        tableId:
          customerChatMessages?.find(
            (msg) => msg.fromCustomerId === selectedCustomer
          )?.tableId || ("" as Id<"tables">),
        tableName:
          customerChatMessages?.find(
            (msg) => msg.fromCustomerId === selectedCustomer
          )?.tableName || "Unknown",
      });
      setMessage("");
      toast.success("Message sent!");
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Chat with Customers
      </h3>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Customer List */}
        <div className="md:w-1/3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-900">Customers</h4>
            {chatCustomers.filter(
              (customerName) => !clearedCustomers.has(customerName)
            ).length > 0 && (
              <button
                onClick={handleClearAllChats}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chatCustomers
              .filter((customerName) => !clearedCustomers.has(customerName))
              .map((customerName) => {
                // Check if this chat has been accepted by anyone
                const chatMessages =
                  allCustomerChatMessages?.filter(
                    (msg) => msg.fromCustomerId === customerName
                  ) || [];

                const isAccepted = chatMessages.some((msg) => msg.acceptedBy);
                const acceptedByMe = chatMessages.some(
                  (msg) => msg.acceptedBy === kitchenStaffId
                );

                // Show unread indicator only for chats accepted by me
                const hasUnread =
                  acceptedByMe &&
                  customerChatMessages?.some(
                    (msg) =>
                      msg.fromCustomerId === customerName &&
                      msg.toUserId === kitchenStaffId &&
                      !msg.read
                  );

                return (
                  <div key={customerName} className="flex items-center">
                    <button
                      onClick={() => setSelectedCustomer(customerName)}
                      disabled={!isAccepted && !acceptedByMe}
                      className={`flex-1 text-left p-3 rounded-lg border transition-colors ${
                        selectedCustomer === customerName
                          ? "bg-purple-50 border-purple-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      } ${!isAccepted && !acceptedByMe ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {customerName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {isAccepted
                              ? acceptedByMe
                                ? "Accepted by you"
                                : "Accepted by another staff"
                              : "Not accepted"}
                          </p>
                        </div>
                        {hasUnread && (
                          <span className="bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center"></span>
                        )}
                      </div>
                    </button>

                    {!isAccepted && !acceptedByMe ? (
                      <button
                        onClick={handleAcceptChatClick(customerName)}
                        className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Accept
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClearChat(customerName)}
                        className="ml-2 p-2 text-gray-400 hover:text-red-600"
                        title="Clear chat"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}

            {chatCustomers.filter(
              (customerName) => !clearedCustomers.has(customerName)
            ).length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>No customer chats yet</p>
                <p className="text-sm mt-1">
                  Customers will appear here when they send messages
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:w-2/3">
          {selectedCustomer ? (
            <div className="flex flex-col h-96">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Chat with {selectedCustomer}
                  </h4>
                  <p className="text-sm text-gray-600">Customer</p>
                </div>
                <button
                  onClick={() => setShowDefaultReplies(!showDefaultReplies)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  {showDefaultReplies ? "Hide" : "Show"} Default Replies
                </button>
              </div>

              {/* Default Replies */}
              {showDefaultReplies && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h5 className="font-medium text-purple-800 mb-2">
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
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                {[...(filteredMessages || [])].reverse().map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      !msg.isReply ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        !msg.isReply
                          ? "bg-white border border-gray-200"
                          : "bg-purple-600 text-white"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          !msg.isReply ? "text-gray-500" : "text-purple-100"
                        }`}
                      >
                        {msg.isReply ? "You" : msg.fromCustomerId}
                        {" • "}
                        {formatTime(msg.timestamp)}
                        {msg.tableName && ` at Table ${msg.tableName}`}
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={() => void handleSendMessage()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <p>Select a customer to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
