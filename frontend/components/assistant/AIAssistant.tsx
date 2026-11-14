"use client";

import ReactMarkdown from "react-markdown";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  addAssistantMessage,
  createAssistantConversation,
  getAssistantConversation,
  getAssistantConversations,
} from "@/lib/api";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIAssistantProps = {
  context?: Record<string, unknown>;
};

const welcomeMessage: AssistantMessage = {
  role: "assistant",
  content:
    "Hi! I’m the MarketFlow Assistant. Ask me about the page you are viewing, stock analysis, financial concepts, or anything related to MarketFlow.",
};

const CONVERSATION_LOAD_TIMEOUT = 8000;

export function AIAssistant({
  context = {},
}: AIAssistantProps) {
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] =
    useState(false);
  const [conversationError, setConversationError] =
    useState("");
  const [messages, setMessages] = useState<
    AssistantMessage[]
  >([welcomeMessage]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    let cancelled = false;
    let timedOut = false;

    setIsLoadingConversation(true);

    const timeoutId = setTimeout(() => {
      if (cancelled) {
        return;
      }

      timedOut = true;

      setConversationError(
        "Conversation history could not be loaded. You can still chat normally."
      );

      setIsLoadingConversation(false);
    }, CONVERSATION_LOAD_TIMEOUT);

    async function initializeConversation() {
      try {
        const conversations =
          await getAssistantConversations();

        if (
          cancelled ||
          timedOut ||
          hasUserInteractedRef.current
        ) {
          return;
        }

        if (conversations.length === 0) {
          conversationIdRef.current = null;
          return;
        }

        const latestConversation = conversations[0];

        const conversation =
          await getAssistantConversation(
            latestConversation.id
          );

        if (
          cancelled ||
          timedOut ||
          hasUserInteractedRef.current
        ) {
          return;
        }

        conversationIdRef.current = conversation.id;

        const savedMessages =
          conversation.messages?.map((message) => ({
            role: message.role,
            content: message.content,
          })) ?? [];

        if (savedMessages.length > 0) {
          setMessages(savedMessages);
        }
      } catch (error) {
        console.error(
          "Unable to load assistant conversation:",
          error
        );

        if (!cancelled && !timedOut) {
          setConversationError(
            "Conversation memory is temporarily unavailable. You can still chat normally."
          );
        }
      } finally {
        clearTimeout(timeoutId);

        if (!cancelled) {
          setIsLoadingConversation(false);
        }
      }
    }

    void initializeConversation();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      setIsLoadingConversation(false);
    };
  }, [isOpen]);

  async function ensureConversation(): Promise<
    number | null
  > {
    if (conversationIdRef.current !== null) {
      return conversationIdRef.current;
    }

    try {
      const conversation =
        await createAssistantConversation();

      conversationIdRef.current = conversation.id;
      setConversationError("");

      return conversation.id;
    } catch (error) {
      console.error(
        "Unable to create assistant conversation:",
        error
      );

      setConversationError(
        "Conversation memory is unavailable, but you can still continue chatting."
      );

      return null;
    }
  }

  async function saveMessage(
    conversationId: number | null,
    message: AssistantMessage
  ) {
    if (!conversationId) {
      return;
    }

    try {
      await addAssistantMessage(
        conversationId,
        message
      );
    } catch (error) {
      console.error(
        "Unable to save assistant message:",
        error
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const question = input.trim();

    if (!question || isSending) {
      return;
    }

    hasUserInteractedRef.current = true;
    setIsSending(true);
    setInput("");
    setConversationError("");

    const conversationId =
      await ensureConversation();

    const userMessage: AssistantMessage = {
      role: "user",
      content: question,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);

    await saveMessage(conversationId, userMessage);

    try {
      const response = await api.post<{
        answer: string;
      }>("/api/assistant/chat", {
        message: question,
        history: updatedMessages.slice(-12),
        context: {
          currentPage: pathname,
          ...context,
        },
      });

      const assistantMessage: AssistantMessage = {
        role: "assistant",
        content:
          response.data.answer ||
          "I could not generate a response.",
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);

      await saveMessage(
        conversationId,
        assistantMessage
      );
    } catch (error) {
      console.error(
        "AI assistant request failed:",
        error
      );

      const errorMessage: AssistantMessage = {
        role: "assistant",
        content:
          "I’m unable to respond right now. Please check that the backend and AI service are running, then try again.",
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        errorMessage,
      ]);

      await saveMessage(
        conversationId,
        errorMessage
      );
    } finally {
      setIsSending(false);
    }
  }

  async function startNewConversation() {
    if (isSending) {
      return;
    }

    hasUserInteractedRef.current = true;
    conversationIdRef.current = null;
    setConversationError("");
    setMessages([welcomeMessage]);

    try {
      const conversation =
        await createAssistantConversation(
          "New conversation"
        );

      conversationIdRef.current = conversation.id;
    } catch (error) {
      console.error(
        "Unable to start new conversation:",
        error
      );

      setConversationError(
        "Unable to save this new conversation, but you can still chat."
      );
    }
  }

  function clearConversation() {
    hasUserInteractedRef.current = true;
    conversationIdRef.current = null;
    setMessages([welcomeMessage]);
    setConversationError("");
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open MarketFlow AI Assistant"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl transition hover:scale-105 hover:bg-purple-700"
        >
          <Bot size={25} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <section className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <Sparkles size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  MarketFlow Assistant
                </h2>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ask questions about your analysis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  void startNewConversation()
                }
                disabled={isSending}
                aria-label="Start new conversation"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Plus size={20} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {conversationError && (
            <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {conversationError}
            </p>
          )}

          <div
            aria-busy={isLoadingConversation}
            className="flex-1 space-y-4 overflow-y-auto p-4"
          >
            {messages.map((message, index) => {
              const isUser =
                message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    isUser
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] break-words overflow-hidden rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? "rounded-br-md bg-purple-600 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">
                            {children}
                          </p>
                        ),
                        h1: ({ children }) => (
                          <h1 className="mb-2 text-lg font-bold">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-2 text-base font-bold">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mb-2 font-semibold">
                            {children}
                          </h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-2 list-disc space-y-1 pl-5">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-2 list-decimal space-y-1 pl-5">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li>{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">
                            {children}
                          </strong>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 underline dark:text-purple-400"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-purple-400 pl-3 italic">
                            {children}
                          </blockquote>
                        ),
                        code: ({ children }) => (
                          <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-700">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-700">
            <button
              type="button"
              onClick={clearConversation}
              disabled={isSending}
              className="mb-3 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-purple-400"
            >
              Clear conversation
            </button>

            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="Ask a question..."
                rows={2}
                maxLength={4000}
                disabled={isSending}
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-purple-900"
              />

              <button
                type="submit"
                disabled={
                  !input.trim() || isSending
                }
                aria-label="Send message"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>

            <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
              AI responses may be imperfect. Verify important
              financial information independently.
            </p>
          </div>
        </section>
      )}
    </>
  );
}