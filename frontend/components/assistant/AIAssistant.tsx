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
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { api } from "@/lib/api";

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
    "Hi! I’m the MarketFlow Assistant. Ask me about the page you are viewing, stock analysis, financial concepts, or anything else related to MarketFlow.",
};

export function AIAssistant({
  context = {},
}: AIAssistantProps) {
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<
    AssistantMessage[]
  >([welcomeMessage]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, isOpen]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const question = input.trim();

    if (!question || isSending) {
      return;
    }

    const userMessage: AssistantMessage = {
      role: "user",
      content: question,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

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

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: response.data.answer,
        },
      ]);
    } catch (error) {
      console.error(
        "AI assistant request failed:",
        error
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content:
            "I’m unable to respond right now. Please check that the backend is running and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function clearConversation() {
    setMessages([welcomeMessage]);
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

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user"
                  ? "justify-end"
                  : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user"
                    ? "rounded-br-md bg-purple-600 text-white"
                    : "rounded-bl-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
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
                      strong: ({ children }) => (
                        <strong className="font-semibold">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

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
              className="mb-3 text-xs font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400"
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
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-purple-900"
              />

              <button
                type="submit"
                disabled={!input.trim() || isSending}
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