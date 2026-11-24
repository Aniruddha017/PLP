import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadSimple,
  CircleNotch,
  Sparkle,
  CheckCircle,
  WarningCircle,
  Trash,
  ArrowRight,
  BookOpen,
  Books,
  Lightning,
  PaperPlaneTilt,
} from '../icons';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { docLearningService } from '../../services/docLearningService';

export const DocLearningView = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeTab, setActiveTab] = useState('tutor'); // 'tutor' | 'summary' | 'questions' | 'quiz'
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // --- Tutor Tab State ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatBottomRef = useRef(null);

  // --- Summary Tab State ---
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // --- Question Bank State ---
  const [questionData, setQuestionData] = useState(null);
  const [questionDifficulty, setQuestionDifficulty] = useState('Medium');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // --- Interactive Quiz State ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // 1. Initial Load of Documents
  useEffect(() => {
    loadDocumentsList();
  }, []);

  const loadDocumentsList = async () => {
    try {
      setLoadingDocs(true);
      const docs = await docLearningService.listDocuments();
      setDocuments(docs || []);
      if (docs && docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const activeDoc = documents.find((d) => d.id === selectedDocId) || null;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'tutor') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isThinking, activeTab]);

  // Load Tab Content on Selection Change
  useEffect(() => {
    if (!selectedDocId) return;

    if (activeTab === 'summary' && !summaryData) {
      handleLoadSummary(selectedDocId);
    } else if (activeTab === 'questions' && !questionData) {
      handleLoadQuestions(selectedDocId, questionDifficulty);
    } else if (activeTab === 'quiz' && quizQuestions.length === 0 && !quizResult) {
      handleLoadQuiz(selectedDocId);
    }
  }, [selectedDocId, activeTab]);

  // Reset tab caches when switching active document
  const handleSelectDocument = (docId) => {
    setSelectedDocId(docId);
    setChatMessages([]);
    setSummaryData(null);
    setQuestionData(null);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
  };

  // --- File Upload Handler ---
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const res = await docLearningService.uploadDocument(file);

      if (!res.is_valid) {
        setUploadError({
          title: 'Document Rejected (Not B.Tech CS)',
          message: res.rejection_reason || 'This document is not related to B.Tech Computer Science.',
          score: Math.round((res.relevance_score || 0) * 100),
          subject: res.detected_subject,
        });
      } else {
        await loadDocumentsList();
        setSelectedDocId(res.id);
        setActiveTab('summary');
      }
    } catch (err) {
      setUploadError({
        title: 'Upload Failed',
        message: err.message || 'Error uploading document. Please try again.',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document and all its processed vector chunks?')) return;
    try {
      await docLearningService.deleteDocument(docId);
      const remaining = documents.filter((d) => d.id !== docId);
      setDocuments(remaining);
      if (selectedDocId === docId) {
        handleSelectDocument(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // --- Tutor Chat Action ---
  const handleSendMessage = async (customText = null) => {
    const text = customText || chatInput;
    if (!text || !text.trim() || !selectedDocId) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setIsThinking(true);

    try {
      const res = await docLearningService.chatWithDocument({
        documentId: selectedDocId,
        message: text.trim(),
        chatHistory: chatMessages.slice(-4).map(({ role, content }) => ({
          role, content
        })),
      });

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        cards: res.cards || [],
        key_insight: res.key_insight,
        follow_up_questions: res.follow_up_questions || [],
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${err.message || 'Unable to retrieve explanation from document.'}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- Summary Loader ---
  const handleLoadSummary = async (docId) => {
    try {
      setLoadingSummary(true);
      const data = await docLearningService.getDocumentSummary(docId);
      setSummaryData(data);
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // --- Questions Loader ---
  const handleLoadQuestions = async (docId, difficulty) => {
    try {
      setLoadingQuestions(true);
      const data = await docLearningService.generateQuestions({
        documentId: docId,
        difficulty,
      });
      setQuestionData(data);
    } catch (err) {
      console.error('Questions error:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // --- Quiz Loader & Evaluator ---
  const handleLoadQuiz = async (docId) => {
    try {
      setLoadingQuiz(true);
      setQuizResult(null);
      setQuizAnswers({});
      const res = await docLearningService.generateQuiz({ documentId: docId, numQuestions: 5 });
      setQuizQuestions(res.questions || []);
    } catch (err) {
      console.error('Quiz error:', err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectQuizAnswer = (qId, optionIdx) => {
    if (quizResult) return;
    setQuizAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      if (!window.confirm('You have unanswered questions. Submit anyway?')) return;
    }

    try {
      setSubmittingQuiz(true);
      const result = await docLearningService.evaluateQuiz({
        documentId: selectedDocId,
        questions: quizQuestions,
        answers: quizAnswers,
      });
      setQuizResult(result);
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden select-text text-left">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-3.5 bg-zinc-50/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-2xs">
            <FileText size={18} weight="fill" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <span>Agentic Document Learning</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <Sparkle size={10} weight="fill" />
                LangGraph RAG
              </span>
            </h1>
            <p className="text-xs text-zinc-500">
              Upload B.Tech Computer Science notes, textbooks, and papers for grounded Q&amp;A, summaries, and assessments.
            </p>
          </div>
        </div>

        {/* Upload Trigger Button */}
        <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-all cursor-pointer shadow-2xs active:scale-95">
          <UploadSimple size={14} weight="bold" />
          <span>Upload Material</span>
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.txt"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Left Rail: Document Library & Uploader */}
        <div className="w-72 shrink-0 border-r border-zinc-200/80 bg-zinc-50/30 flex flex-col justify-between overflow-y-auto p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Document Library
              </span>
              <span className="text-[11px] font-medium text-zinc-500">
                {documents.length} File{documents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Validation Rejection Alert if applicable */}
            {uploadError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                  <WarningCircle size={14} weight="fill" />
                  <span>{uploadError.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed">{uploadError.message}</p>
                {uploadError.score !== undefined && (
                  <p className="text-[10px] text-rose-700 font-mono">
                    CS Relevance: {uploadError.score}% (Requires &gt;= 60%)
                  </p>
                )}
              </div>
            )}

            {/* Active Uploading Indicator */}
            {uploading && (
              <div className="mb-3 p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs flex items-center gap-2">
                <CircleNotch size={16} className="animate-spin text-zinc-800 shrink-0" />
                <div className="leading-tight">
                  <p className="font-semibold text-zinc-900">Validating &amp; Chunking...</p>
                  <p className="text-[11px] text-zinc-500">Document Validation Agent analyzing CS relevance</p>
                </div>
              </div>
            )}

            {/* Document Cards List */}
            {loadingDocs ? (
              <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                <CircleNotch size={20} className="animate-spin text-zinc-600" />
                <span>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-8 px-3 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-white space-y-2">
                <BookOpen size={28} className="mx-auto text-zinc-400" />
                <p className="text-xs font-medium text-zinc-700">No documents yet</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Upload a PDF, DOCX, PPTX, or TXT file from your B.Tech CS courses.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc.id)}
                      className={`group p-3 rounded-xl text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-white border-zinc-900 shadow-2xs ring-1 ring-zinc-900/10'
                          : 'bg-white/80 border-zinc-200/80 hover:bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">
                            {doc.filename}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">
                              {doc.detected_subject || 'CS'}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {doc.page_count} pgs
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          title="Delete Document"
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 transition-all rounded hover:bg-rose-50"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-zinc-100/70 rounded-xl border border-zinc-200/60 text-[11px] text-zinc-500 leading-relaxed space-y-1">
            <span className="font-semibold text-zinc-700 flex items-center gap-1">
              <CheckCircle size={12} weight="fill" className="text-emerald-600" />
              Automated Validation
            </span>
            <p>
              Uploaded materials are verified against B.Tech CS subjects (DSA, OS, DBMS, Networks, AI/ML, Math).
            </p>
          </div>
        </div>

        {/* Right Workspace */}
        {activeDoc ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
            {/* Top Workspace Header & Tabs */}
            <div className="border-b border-zinc-200/80 px-6 pt-3 bg-white shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-zinc-900 truncate flex items-center gap-2">
                    <span>{activeDoc.filename}</span>
                    <span className="text-[11px] font-semibold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200">
                      {activeDoc.detected_subject}
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {activeDoc.summary || 'Course reference notes with vector-indexed chunks.'}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 text-xs font-semibold">
                {[
                  { id: 'tutor', label: '💬 Ask AI (Tutor)' },
                  { id: 'summary', label: '📝 Summary & Formulas' },
                  { id: 'questions', label: '❓ Question Bank' },
                  { id: 'quiz', label: '🎯 Interactive Quiz' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-zinc-900 text-zinc-900 font-bold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: TUTOR CHAT */}
              {activeTab === 'tutor' && (
                <div className="max-w-3xl mx-auto flex flex-col h-full justify-between">
                  {/* Messages Feed */}
                  <div className="space-y-4 mb-4 overflow-y-auto pr-1">
                    {chatMessages.length === 0 ? (
                      <div className="py-12 text-center text-zinc-400 space-y-3">
                        <Sparkle size={32} className="mx-auto text-zinc-300" />
                        <h3 className="text-sm font-semibold text-zinc-800">
                          Ask anything about {activeDoc.filename}
                        </h3>
                        <p className="text-xs max-w-md mx-auto text-zinc-500 leading-relaxed">
                          The Document Tutor Agent provides step-by-step explanations, citations to exact pages, and mathematical derivations.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center pt-2">
                          {[
                            'What are the core concepts covered?',
                            'Explain the primary algorithm step-by-step.',
                            'What formulas and bounds are introduced?',
                          ].map((prompt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(prompt)}
                              className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-zinc-900 text-white shadow-2xs'
                                : 'bg-zinc-50 border border-zinc-200/80 text-zinc-800 shadow-2xs space-y-3'
                            }`}
                          >
                            {msg.role === 'user' ? (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                              <>
                                <MarkdownRenderer content={msg.content} />

                                {/* Citations Badges */}
                                {msg.citations && msg.citations.length > 0 && (
                                  <div className="pt-2 border-t border-zinc-200/60 flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                      Citations:
                                    </span>
                                    {msg.citations.map((c, idx) => (
                                      <span
                                        key={idx}
                                        title={c.snippet}
                                        className="text-[10px] bg-white border border-zinc-300 text-zinc-700 px-2 py-0.5 rounded-full cursor-help hover:border-zinc-500 transition-all font-mono"
                                      >
                                        Page {c.page_number} ({c.heading})
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Concept Cards */}
                                {msg.cards && msg.cards.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                    {msg.cards.map((card, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 bg-white border border-zinc-200 rounded-xl space-y-1 text-left"
                                      >
                                        <div className="font-semibold text-zinc-900 text-xs">
                                          {card.title}
                                        </div>
                                        <div className="text-[11px] text-zinc-600 leading-normal">
                                          {card.description}
                                        </div>
                                        {card.formula && (
                                          <div className="pt-1 font-mono text-[11px] text-emerald-800 bg-emerald-50/50 p-1 rounded border border-emerald-100">
                                            <MarkdownRenderer content={card.formula} />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Socratic Follow-Up Questions */}
                                {msg.follow_up_questions && msg.follow_up_questions.length > 0 && (
                                  <div className="pt-2 space-y-1">
                                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                      Explore Further:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {msg.follow_up_questions.map((fq, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => handleSendMessage(fq)}
                                          className="text-[11px] bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 px-2.5 py-1 rounded-full text-left transition-all cursor-pointer"
                                        >
                                          {fq}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {isThinking && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs text-zinc-500 flex items-center gap-2">
                          <CircleNotch size={14} className="animate-spin text-zinc-700" />
                          <span>Searching document chunks and synthesizing answer...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2 pt-2 border-t border-zinc-200 bg-white"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Ask a question grounded in ${activeDoc.filename}...`}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isThinking}
                      className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-black text-white flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer shrink-0"
                    >
                      <PaperPlaneTilt size={15} weight="bold" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: SUMMARY & FORMULAS */}
              {activeTab === 'summary' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {loadingSummary ? (
                    <div className="py-16 text-center text-zinc-400 space-y-2">
                      <CircleNotch size={24} className="animate-spin text-zinc-600 mx-auto" />
                      <p className="text-xs">Summarization Agent distilling chapters and formulas...</p>
                    </div>
                  ) : summaryData ? (
                    <>
                      {/* Overview Card */}
                      <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Executive Overview
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-sans">
                          {summaryData.overview}
                        </p>
                      </div>

                      {/* Formulas & Definitions */}
                      {summaryData.formulas_and_definitions?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Lightning size={14} weight="fill" className="text-zinc-700" />
                            Core Formulas &amp; Definitions
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {summaryData.formulas_and_definitions.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 bg-white border border-zinc-200 rounded-xl space-y-1.5 shadow-2xs"
                              >
                                <div className="font-bold text-zinc-900 text-xs">
                                  {item.term}
                                </div>
                                <p className="text-[11px] text-zinc-600 leading-relaxed">
                                  {item.definition}
                                </p>
                                {item.formula && (
                                  <div className="pt-1 font-mono text-[11px] text-emerald-800 bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                                    <MarkdownRenderer content={item.formula} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section Summaries */}
                      {summaryData.sections?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Chapter &amp; Section Breakdowns
                          </h3>
                          <div className="space-y-2.5">
                            {summaryData.sections.map((sec, idx) => (
                              <div
                                key={idx}
                                className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-zinc-900 text-xs">
                                    {sec.heading}
                                  </h4>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    Page {sec.page}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                  {sec.summary}
                                </p>
                                {sec.takeaways?.length > 0 && (
                                  <ul className="list-disc pl-4 text-[11px] text-zinc-700 space-y-1 pt-1">
                                    {sec.takeaways.map((t, tIdx) => (
                                      <li key={tIdx}>{t}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Revision Notes */}
                      {summaryData.revision_notes?.length > 0 && (
                        <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            Quick Exam Revision Notes
                          </h3>
                          <ul className="list-disc pl-4 text-xs text-amber-900 space-y-1.5">
                            {summaryData.revision_notes.map((note, idx) => (
                              <li key={idx} className="leading-relaxed">
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}

              {/* TAB 3: QUESTION BANK */}
              {activeTab === 'questions' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Difficulty Selector */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <span className="text-xs font-semibold text-zinc-700">
                      Target Exam Difficulty:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {['Easy', 'Medium', 'Hard'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => {
                            setQuestionDifficulty(diff);
                            handleLoadQuestions(selectedDocId, diff);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            questionDifficulty === diff
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingQuestions ? (
                    <div className="py-16 text-center text-zinc-400 space-y-2">
                      <CircleNotch size={24} className="animate-spin text-zinc-600 mx-auto" />
                      <p className="text-xs">
                        Question Generation Agent constructing {questionDifficulty} problem set...
                      </p>
                    </div>
                  ) : questionData ? (
                    <div className="space-y-6">
                      {/* MCQs */}
                      {questionData.mcqs?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Multiple Choice Questions
                          </h3>
                          <div className="space-y-3">
                            {questionData.mcqs.map((q, qIdx) => {
                              const isRevealed = revealedAnswers[`mcq_${q.id || qIdx}`];
                              return (
                                <div
                                  key={qIdx}
                                  className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2.5 shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-zinc-900 text-xs">
                                      Q{qIdx + 1}. {q.question}
                                    </span>
                                    {q.page_reference && (
                                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-mono shrink-0">
                                        p.{q.page_reference}
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                    {q.options?.map((opt, oIdx) => (
                                      <div
                                        key={oIdx}
                                        className={`p-2 rounded-lg text-xs border ${
                                          isRevealed && oIdx === q.correct_index
                                            ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900'
                                            : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                                        }`}
                                      >
                                        <span className="font-mono text-zinc-400 mr-1.5">
                                          {String.fromCharCode(65 + oIdx)}.
                                        </span>
                                        {opt}
                                      </div>
                                    ))}
                                  </div>

                                  <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevealedAnswers((prev) => ({
                                          ...prev,
                                          [`mcq_${q.id || qIdx}`]: !prev[`mcq_${q.id || qIdx}`],
                                        }))
                                      }
                                      className="text-xs text-zinc-600 font-semibold hover:text-zinc-900 transition-all cursor-pointer"
                                    >
                                      {isRevealed ? 'Hide Explanation' : 'Reveal Correct Option & Explanation'}
                                    </button>
                                  </div>

                                  {isRevealed && (
                                    <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed space-y-1">
                                      <p className="font-semibold">
                                        Correct: Option {String.fromCharCode(65 + q.correct_index)}
                                      </p>
                                      <p>{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Short Answer Questions */}
                      {questionData.short_answers?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Short Answer Conceptual Questions
                          </h3>
                          <div className="space-y-3">
                            {questionData.short_answers.map((sa, idx) => (
                              <div
                                key={idx}
                                className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2 shadow-2xs"
                              >
                                <div className="font-semibold text-zinc-900 text-xs">
                                  {sa.question}
                                </div>
                                <div className="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-700 leading-relaxed border border-zinc-200/60">
                                  <p className="font-semibold text-zinc-800 text-[11px] mb-1">
                                    Model Answer:
                                  </p>
                                  <p>{sa.model_answer}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 4: INTERACTIVE QUIZ */}
              {activeTab === 'quiz' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {loadingQuiz ? (
                    <div className="py-16 text-center text-zinc-400 space-y-2">
                      <CircleNotch size={24} className="animate-spin text-zinc-600 mx-auto" />
                      <p className="text-xs">
                        Assessment Agent generating 5-question diagnostic quiz...
                      </p>
                    </div>
                  ) : quizResult ? (
                    /* Score Report */
                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-900 text-white rounded-2xl text-center space-y-3 shadow-lg">
                        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
                          Assessment Evaluation
                        </span>
                        <div className="text-4xl font-extrabold tracking-tight">
                          {quizResult.percentage}%
                        </div>
                        <p className="text-xs text-zinc-300">
                          You answered {quizResult.score} of {quizResult.total} questions correctly.
                        </p>
                      </div>

                      {/* Weak Topics & Recommendations */}
                      {quizResult.recommendations?.length > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                            Personalized Recommendations
                          </h4>
                          <ul className="list-disc pl-4 text-xs text-amber-900 space-y-1">
                            {quizResult.recommendations.map((rec, rIdx) => (
                              <li key={rIdx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Question Review List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Detailed Question Breakdown
                        </h4>
                        {quizResult.evaluations?.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            className={`p-4 rounded-xl border text-xs space-y-2 ${
                              ev.is_correct
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-rose-50/50 border-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-900">
                                Q{evIdx + 1}. {ev.question}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  ev.is_correct
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {ev.is_correct ? 'CORRECT' : 'INCORRECT'}
                              </span>
                            </div>
                            <p className="text-zinc-600 leading-relaxed text-[11px]">
                              {ev.explanation}
                            </p>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadQuiz(selectedDocId)}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Retake Assessment with New Questions
                      </button>
                    </div>
                  ) : quizQuestions.length > 0 ? (
                    /* Quiz Questions Form */
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                          Document Diagnostic Quiz (5 Questions)
                        </h3>
                        <span className="text-xs text-zinc-400 font-mono">
                          {Object.keys(quizAnswers).length} / {quizQuestions.length} Answered
                        </span>
                      </div>

                      <div className="space-y-5">
                        {quizQuestions.map((q, qIdx) => (
                          <div
                            key={q.id || qIdx}
                            className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3 shadow-2xs"
                          >
                            <div className="font-semibold text-zinc-900 text-xs">
                              {qIdx + 1}. {q.question}
                            </div>
                            <div className="space-y-1.5">
                              {q.options?.map((opt, oIdx) => {
                                const isSelected = quizAnswers[String(q.id)] === oIdx;
                                return (
                                  <label
                                    key={oIdx}
                                    onClick={() => handleSelectQuizAnswer(String(q.id), oIdx)}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`quiz_q_${q.id}`}
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="hidden"
                                    />
                                    <span className="font-mono text-[11px] opacity-75">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz}
                        className="w-full py-3 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {submittingQuiz ? (
                          <>
                            <CircleNotch size={14} className="animate-spin text-white" />
                            <span>Evaluating with Assessment Agent...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Assessment</span>
                            <ArrowRight size={14} weight="bold" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-400">
                      <button
                        type="button"
                        onClick={() => handleLoadQuiz(selectedDocId)}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-all cursor-pointer"
                      >
                        Generate Assessment Quiz
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty Workspace */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3">
            <BookOpen size={40} className="text-zinc-300" />
            <h2 className="text-sm font-semibold text-zinc-800">No Document Selected</h2>
            <p className="text-xs max-w-sm text-zinc-500 leading-relaxed">
              Select a document from the left library, or upload lecture notes/textbooks to start grounded learning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocLearningView;
