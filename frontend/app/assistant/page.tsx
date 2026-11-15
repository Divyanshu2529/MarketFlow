"use client";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bot,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  addAssistantMessage,
  api,
  createAssistantConversation,
  deleteAssistantConversation,
  getAssistantConversation,
  getAssistantConversations,
  uploadAssistantDocument,
} from "@/lib/api";
import type {
  AssistantConversation,
  AssistantDocument,
  AssistantMessage,
} from "@/lib/api";

type ChatMessage = Pick<
  AssistantMessage,
  "role" | "content"
>;

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I’m the MarketFlow Assistant. Ask me about company research, stock analysis, financial concepts, news, watchlists, reports, uploaded documents, or anything related to MarketFlow.",
};

export default function MarketFlowBotPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<
    AssistantConversation[]
  >([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(
    []
  );
  const [input, setInput] = useState("");
  const [uploadedDocument, setUploadedDocument] =
    useState<AssistantDocument | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] =
    useState(false);
  const [isLoadingConversations, setIsLoadingConversations] =
    useState(true);
  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingConversationId, setDeletingConversationId] =
    useState<number | null>(null);
  const [error, setError] = useState("");

  const selectedConversation = conversations.find(
    (conversation) =>
      conversation.id === selectedConversationId
  );

  const visibleMessages =
    messages.length > 0 ? messages : [welcomeMessage];

  useEffect(() => {
    void initializePage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isSending]);

  async function initializePage() {
    setIsLoadingConversations(true);
    setError("");

    try {
      const savedConversations =
        await getAssistantConversations();

      setConversations(savedConversations);

      if (savedConversations.length > 0) {
        await loadConversation(
          savedConversations[0].id
        );
      }
    } catch (loadError) {
      console.error(
        "Unable to load MarketFlow Bot conversations:",
        loadError
      );

      setError(
        "Unable to load your conversations. Please check that you are logged in and try again."
      );
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function loadConversation(
    conversationId: number
  ) {
    setSelectedConversationId(conversationId);
    setIsLoadingMessages(true);
    setUploadedDocument(null);
    setError("");

    try {
      const conversation =
        await getAssistantConversation(
          conversationId
        );

      setMessages(
        conversation.messages.map((message) => ({
          role: message.role,
          content: message.content,
        }))
      );
    } catch (loadError) {
      console.error(
        "Unable to load assistant conversation:",
        loadError
      );

      setError(
        "Unable to load this conversation. Please try again."
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleNewConversation() {
    if (isSending || isUploadingDocument) {
      return;
    }

    setError("");
    setUploadedDocument(null);
    setInput("");

    try {
      const conversation =
        await createAssistantConversation(
          "New conversation"
        );

      setConversations((currentConversations) => [
        conversation,
        ...currentConversations,
      ]);

      setSelectedConversationId(conversation.id);
      setMessages([]);
    } catch (createError) {
      console.error(
        "Unable to create assistant conversation:",
        createError
      );

      setError(
        "Unable to start a new conversation. Please try again."
      );
    }
  }

  async function handleDeleteConversation(
    conversationId: number
  ) {
    if (
      isSending ||
      isUploadingDocument ||
      deletingConversationId !== null
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this conversation? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeletingConversationId(conversationId);
    setError("");

    try {
      await deleteAssistantConversation(
        conversationId
      );

      const remainingConversations = conversations.filter(
        (conversation) =>
          conversation.id !== conversationId
      );

      setConversations(remainingConversations);

      if (selectedConversationId === conversationId) {
        const nextConversation =
          remainingConversations[0];

        if (nextConversation) {
          await loadConversation(
            nextConversation.id
          );
        } else {
          setSelectedConversationId(null);
          setMessages([]);
          setUploadedDocument(null);
        }
      }
    } catch (deleteError) {
      console.error(
        "Unable to delete assistant conversation:",
        deleteError
      );

      setError(
        "Unable to delete this conversation. Please try again."
      );
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function ensureConversation(): Promise<
    number | null
  > {
    if (selectedConversationId !== null) {
      return selectedConversationId;
    }

    try {
      const conversation =
        await createAssistantConversation(
          "New conversation"
        );

      setConversations((currentConversations) => [
        conversation,
        ...currentConversations,
      ]);

      setSelectedConversationId(conversation.id);

      return conversation.id;
    } catch (createError) {
      console.error(
        "Unable to create assistant conversation:",
        createError
      );

      setError(
        "Unable to create a conversation. Please try again."
      );

      return null;
    }
  }

  async function saveMessage(
    conversationId: number,
    message: ChatMessage
  ) {
    try {
      await addAssistantMessage(
        conversationId,
        message.role,
        message.content
      );
    } catch (saveError) {
      console.error(
        "Unable to save assistant message:",
        saveError
      );

      setError(
        "The assistant responded, but this message could not be saved."
      );
    }
  }

  async function handleDocumentSelected(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();

    const isSupported =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".docx");

    if (!isSupported) {
      setError(
        "Only PDF and DOCX files are supported."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "The file is too large. Maximum size is 10 MB."
      );
      return;
    }

    setError("");
    setIsUploadingDocument(true);

    try {
      const document =
        await uploadAssistantDocument(file);

      setUploadedDocument(document);
    } catch (uploadError) {
      console.error(
        "Document upload failed:",
        uploadError
      );

      setError(
        "Unable to read this document. Please choose a readable PDF or DOCX file."
      );
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const question = input.trim();

    if (
      !question ||
      isSending ||
      isUploadingDocument
    ) {
      return;
    }

    setInput("");
    setIsSending(true);
    setError("");

    const conversationId =
      await ensureConversation();

    if (conversationId === null) {
      setIsSending(false);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);

    await saveMessage(
      conversationId,
      userMessage
    );

    const assistantContext: Record<
      string,
      unknown
    > = {
      currentPage: "/assistant",
      section: "MarketFlow Bot",
    };

    if (uploadedDocument) {
      assistantContext.uploadedDocument =
        uploadedDocument;
    }

    try {
      const response = await api.post<{
        answer: string;
      }>("/api/assistant/chat", {
        message: question,
        history: updatedMessages.slice(-12),
        context: assistantContext,
      });

      const assistantMessage: ChatMessage = {
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

      setConversations((currentConversations) =>
        currentConversations
          .map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  title:
                    conversation.title ===
                    "New conversation"
                      ? question.slice(0, 80)
                      : conversation.title,
                  updated_at:
                    new Date().toISOString(),
                }
              : conversation
          )
          .sort(
            (first, second) =>
              new Date(
                second.updated_at
              ).getTime() -
              new Date(
                first.updated_at
              ).getTime()
          )
      );
    } catch (chatError) {
      console.error(
        "MarketFlow Bot request failed:",
        chatError
      );

      const errorMessage: ChatMessage = {
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

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-4 overflow-hidden">
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <Bot size={26} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                MarketFlow Bot
              </h1>

              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Your dedicated AI research workspace.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid min-h-0 flex-1 grid-rows-[13rem_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
          <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() =>
                  void handleNewConversation()
                }
                disabled={
                  isSending ||
                  isUploadingDocument
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                New conversation
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Previous conversations
              </p>

              {isLoadingConversations ? (
                <div className="flex items-center gap-2 px-2 py-4 text-sm text-slate-500">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  No conversations yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => {
                    const isSelected =
                      conversation.id ===
                      selectedConversationId;

                    const isDeleting =
                      deletingConversationId ===
                      conversation.id;

                    return (
                      <div
                        key={conversation.id}
                        className={`flex items-center gap-1 rounded-xl border transition ${
                          isSelected
                            ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/40"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void loadConversation(
                              conversation.id
                            )
                          }
                          className="min-w-0 flex-1 px-3 py-3 text-left"
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare
                              size={16}
                              className="mt-0.5 shrink-0 text-purple-600"
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {conversation.title}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {new Date(
                                  conversation.updated_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteConversation(
                              conversation.id
                            )
                          }
                          disabled={
                            isSending ||
                            isUploadingDocument ||
                            deletingConversationId !==
                              null
                          }
                          aria-label={`Delete ${conversation.title}`}
                          className="mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40"
                        >
                          {isDeleting ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <Sparkles size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-bold text-slate-900 dark:text-white">
                  {selectedConversation?.title ??
                    "New conversation"}
                </h2>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  MarketFlow Assistant
                </p>
              </div>
            </header>

            <div
              aria-busy={isLoadingMessages}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5"
            >
              {isLoadingMessages ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Loading conversation...
                </div>
              ) : (
                visibleMessages.map((message, index) => {
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
                        className={`max-w-[85%] break-words overflow-hidden rounded-2xl px-4 py-3 text-sm leading-6 ${
                          isUser
                            ? "rounded-br-md bg-purple-600 text-white"
                            : "rounded-bl-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            table: ({ children }) => (
                              <div className="my-2 overflow-x-auto">
                                <table className="min-w-full border-collapse text-left text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-slate-200 dark:bg-slate-700">
                                {children}
                              </thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody>{children}</tbody>
                            ),
                            tr: ({ children }) => (
                              <tr className="border-b border-slate-200 dark:border-slate-600">
                                {children}
                              </tr>
                            ),
                            th: ({ children }) => (
                              <th className="px-2 py-2 font-semibold">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-2 py-2">
                                {children}
                              </td>
                            ),
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
                })
              )}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) =>
                  void handleDocumentSelected(event)
                }
                className="hidden"
              />

              {uploadedDocument && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-800 dark:bg-purple-950/40">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      size={18}
                      className="shrink-0 text-purple-600"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {uploadedDocument.fileName}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {uploadedDocument.pageCount !==
                        null
                          ? `${uploadedDocument.pageCount} pages`
                          : "DOCX document"}{" "}
                        · attached
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setUploadedDocument(null)
                    }
                    disabled={isSending}
                    aria-label="Remove attached document"
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-purple-100 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-purple-900/50"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    isSending ||
                    isUploadingDocument
                  }
                  aria-label="Upload PDF or DOCX document"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-500 transition hover:border-purple-500 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-400"
                >
                  {isUploadingDocument ? (
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                  ) : (
                    <Paperclip size={20} />
                  )}
                </button>

                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  placeholder="Ask MarketFlow Bot a question..."
                  rows={3}
                  maxLength={4000}
                  disabled={
                    isSending ||
                    isUploadingDocument
                  }
                  className="min-h-14 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-purple-900"
                />

                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    isSending ||
                    isUploadingDocument
                  }
                  aria-label="Send message"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>

              <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                AI responses may be imperfect. Verify important
                financial information independently.
              </p>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}