"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";

type View = "opening" | "home" | "checkin" | "complete" | "family" | "memories" | "invite";
type Reply = { from: string; message: string };
type ExtractionItem = {
  kind: "life_update" | "memory" | "request" | "possible_concern";
  title: string;
  detail: string;
  source_quote: string;
};
type RoutineExtraction = {
  summary: string;
  reflection: string;
  tone: string;
  safety_level: "routine" | "concern";
  items: ExtractionItem[];
};
type UrgentExtraction = {
  summary: string;
  tone: string;
  safety_level: "urgent";
  items: ExtractionItem[];
  action: string;
};
type ExtractionResult = RoutineExtraction | UrgentExtraction;
type ExtractionStatus = "idle" | "loading" | "ready" | "error";

const EXTRACTION_KIND_LABELS: Record<ExtractionItem["kind"], string> = {
  life_update: "Life update",
  memory: "Memory",
  request: "Request",
  possible_concern: "Possible concern",
};

const PROMPTS = [
  { lead: "Begin wherever feels right", question: "How is today feeling for you?" },
  { lead: "I’d like to understand", question: "What has stayed with you today?" },
  { lead: "In your own words", question: "What would you like your family to understand or help with?" },
];

const demoAnswers = [
  "I’m feeling pretty good today. The sunshine has been lovely.",
  "I watered my tomatoes and remembered the blue porch swing Frank and I painted.",
  "I’m almost out of milk, and the kitchen light keeps flickering.",
];

function isExtractionItem(value: unknown): value is ExtractionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["life_update", "memory", "request", "possible_concern"].includes(String(item.kind))
    && typeof item.title === "string"
    && typeof item.detail === "string"
    && typeof item.source_quote === "string";
}

function isExtractionResult(value: unknown): value is ExtractionResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (typeof result.summary !== "string" || typeof result.tone !== "string" || !Array.isArray(result.items) || !result.items.every(isExtractionItem)) return false;
  if (result.safety_level === "urgent") return typeof result.action === "string";
  return (result.safety_level === "routine" || result.safety_level === "concern") && typeof result.reflection === "string";
}

function extractionItemKey(item: ExtractionItem, index: number) {
  return `${index}:${item.kind}:${item.source_quote}`;
}

const REFLECTIONS = [
  "You’re feeling pretty good today, and the sunshine has felt lovely.",
  "As you watered the tomatoes, you found yourself remembering Frank and the blue porch swing you painted together.",
  "You’re almost out of milk, and you’d like someone to help with the flickering kitchen light.",
];

function reflectionFor(step: number, answer: string) {
  if (answer === demoAnswers[step]) return REFLECTIONS[step];

  const words = answer.trim();
  const shortened = words.length > 220 ? `${words.slice(0, 217)}…` : words;
  return `You’re saying, “${shortened}” I don’t want to add a meaning that isn’t yours.`;
}

export function OurPlaceApp() {
  const [view, setView] = useState<View>("opening");
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [textMode, setTextMode] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [reaction, setReaction] = useState("");
  const [commitments, setCommitments] = useState<Record<string, string>>({});
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>("idle");
  const [extractionError, setExtractionError] = useState("");
  const [approvedExtraction, setApprovedExtraction] = useState<RoutineExtraction | null>(null);
  const extractionRequest = useRef(0);
  const captureTimeout = useRef<number | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (textMode) textarea.current?.focus(); }, [textMode]);
  useEffect(() => () => {
    if (captureTimeout.current !== null) window.clearTimeout(captureTimeout.current);
  }, []);

  const loadExtraction = useCallback(async (answers: string[]) => {
    const requestId = ++extractionRequest.current;
    setExtractionStatus("loading");
    setExtractionError("");
    setExtraction(null);
    setApprovedExtraction(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).error === "string"
          ? String((payload as Record<string, unknown>).error)
          : "We couldn’t prepare this update.";
        throw new Error(message);
      }
      if (!isExtractionResult(payload)) throw new Error("We couldn’t read the prepared update.");
      if (extractionRequest.current !== requestId) return;
      setExtraction(payload);
      setExtractionStatus("ready");
    } catch (error) {
      if (extractionRequest.current !== requestId) return;
      setExtractionError(error instanceof Error ? error.message : "We couldn’t prepare this update.");
      setExtractionStatus("error");
    }
  }, []);

  const familyMode = Boolean(approvedExtraction) && (view === "family" || view === "memories");

  function cancelCapture() {
    if (captureTimeout.current !== null) {
      window.clearTimeout(captureTimeout.current);
      captureTimeout.current = null;
    }
  }

  function begin() {
    cancelCapture();
    extractionRequest.current += 1;
    setStep(0); setAnswers(["", "", ""]); setListening(false); setTextMode(false);
    setExtraction(null); setExtractionStatus("idle"); setExtractionError(""); setApprovedExtraction(null); setCommitments({}); setReply(null); setReplyDraft(""); setReaction(""); setView("checkin");
  }

  function capture() {
    if (listening) { cancelCapture(); setListening(false); return; }
    cancelCapture();
    setListening(true);
    const capturedStep = step;
    captureTimeout.current = window.setTimeout(() => {
      captureTimeout.current = null;
      setAnswers((current) => current.map((answer, index) => index === capturedStep ? demoAnswers[capturedStep] : answer));
      setListening(false);
    }, 1400);
  }

  function next() {
    cancelCapture();
    if (step < PROMPTS.length - 1) { setStep(step + 1); setListening(false); setTextMode(false); }
    else { setView("complete"); void loadExtraction(answers); }
  }

  function editUpdate() {
    cancelCapture();
    extractionRequest.current += 1;
    setExtraction(null); setExtractionStatus("idle"); setExtractionError(""); setApprovedExtraction(null); setCommitments({}); setReply(null); setReplyDraft(""); setReaction("");
    setStep(0); setListening(false); setTextMode(false); setView("checkin");
  }

  function go(nextView: View) {
    if ((nextView === "family" || nextView === "memories") && !approvedExtraction) return;
    cancelCapture();
    setListening(false);
    setView(nextView);
  }

  function changeTextMode(value: boolean) {
    if (value) {
      cancelCapture();
      setListening(false);
    }
    setTextMode(value);
  }

  return <main className={`app-shell ${familyMode ? "family-shell" : "elder-shell"}`}>
    {view !== "opening" && <Header familyMode={familyMode} view={view} go={go} />}
    {view === "opening" && <Opening onEnter={() => setView("home")} />}
    {view === "home" && <Home onBegin={begin} reply={reply} reaction={reaction} onInvite={() => setView("invite")} approvedExtraction={approvedExtraction} commitments={commitments} />}
    {view === "checkin" && <CheckIn {...{ step, listening, answers, textMode, textarea, setAnswers, capture, next }} setTextMode={changeTextMode} onExit={() => { cancelCapture(); setListening(false); setView("home"); }} />}
    {view === "complete" && <Complete status={extractionStatus} error={extractionError} extraction={extraction} approved={Boolean(approvedExtraction)} onRetry={() => void loadExtraction(answers)} onEdit={editUpdate} onApprove={setApprovedExtraction} onHome={() => setView("home")} onFamily={() => go("family")} />}
    {view === "family" && approvedExtraction && <Family extraction={approvedExtraction} {...{ reaction, setReaction, commitments, setCommitments, reply, setReply, replyDraft, setReplyDraft }} onMemories={() => go("memories")} />}
    {view === "memories" && approvedExtraction && <Memories extraction={approvedExtraction} />}
    {view === "invite" && <Invitation onAccept={() => setView("home")} />}
  </main>;
}

function Opening({ onEnter }: { onEnter: () => void }) {
  const steps = useRef<HTMLOListElement>(null);

  return <section className="opening-screen" aria-labelledby="opening-title">
    <header className="opening-bar">
      <div className="opening-brand">
        <span className="opening-brand-mark" aria-hidden="true"><Image src="/our-place-family-mark.png" alt="" width={48} height={48} unoptimized /></span>
        <span><strong>Our Place</strong><small>Family stays close here</small></span>
      </div>
      <p className="opening-trust"><span aria-hidden="true">♡</span> Your words remain yours.</p>
    </header>

    <div className="opening-main">
      <div className="opening-copy">
        <p className="opening-kicker">A warm place to stay close</p>
        <h1 id="opening-title">The small things are how we stay close.</h1>
        <p className="opening-promise">Speak about your day in your own words. Check what we heard, then choose what your family may see.</p>
        <div className="opening-actions">
          <button className="primary opening-enter" onClick={onEnter}>Enter Our Place <span aria-hidden="true">→</span></button>
          <button className="opening-how" onClick={() => steps.current?.focus()}>See how it works <span aria-hidden="true">↓</span></button>
        </div>
      </div>

      <div className="opening-constellation">
        <div className="opening-constellation-forms">
          <span className="opening-orbit-form opening-orbit-love" aria-hidden="true" />
          <span className="opening-orbit-form opening-orbit-health" aria-hidden="true" />
          <span className="opening-orbit-form opening-orbit-company" aria-hidden="true" />
          <span className="opening-orbit-form opening-orbit-prosperity" aria-hidden="true" />
        </div>
        <div className="opening-constellation-center">
          <span className="opening-halo" aria-hidden="true" />
          <Image className="opening-constellation-mark" src="/our-place-family-mark.png" alt="Our Place family circle" width={224} height={224} priority unoptimized />
        </div>
      </div>
    </div>

    <aside className="opening-reassurance" aria-label="What to expect in Our Place">
      <p><span aria-hidden="true">○</span>Your space is ready whenever you are.</p>
      <p><span aria-hidden="true">○</span>Only what you approve is shared.</p>
    </aside>
    <ol className="opening-steps" ref={steps} role="list" tabIndex={-1} aria-label="How Our Place works">
      <li><span aria-hidden="true">01</span><p><strong>Speak freely</strong><small>There is no right mood or answer.</small></p></li>
      <li><span aria-hidden="true">02</span><p><strong>Check what we heard</strong><small>Correct anything that does not feel true.</small></p></li>
      <li><span aria-hidden="true">03</span><p><strong>Share only when it feels true</strong><small>Your approval always comes first.</small></p></li>
    </ol>
  </section>;
}

function Header({ familyMode, view, go }: { familyMode: boolean; view: View; go: (v: View) => void }) {
  return <header className="topbar">
    <button className="brand" onClick={() => go(familyMode ? "family" : "home")} aria-label="Our Place home"><span className="brand-mark" aria-hidden="true"><Image src="/our-place-family-mark.png" alt="" width={52} height={52} priority unoptimized /></span><span>Our Place</span></button>
    {familyMode && <nav aria-label="Family demo navigation"><span className="mode-pill">Family demo · Sarah’s view</span><button className={view === "family" ? "active" : ""} onClick={() => go("family")}>Today</button><button className={view === "memories" ? "active" : ""} onClick={() => go("memories")}>Stories</button><button onClick={() => go("home")}>Demo: Evelyn’s view</button></nav>}
  </header>;
}

function Home({ onBegin, reply, reaction, onInvite, approvedExtraction, commitments }: { onBegin: () => void; reply: Reply | null; reaction: string; onInvite: () => void; approvedExtraction: RoutineExtraction | null; commitments: Record<string, string> }) {
  const committedRequest = approvedExtraction?.items
    .map((item, index) => ({ item, person: commitments[extractionItemKey(item, index)] }))
    .find(({ item, person }) => item.kind === "request" && person);
  const hasFamilyActivity = Boolean(reply || reaction || committedRequest);

  return <section className="home page home-garden" aria-labelledby="home-title">
    <div className="home-shape-layer" aria-hidden="true">
      <span className="home-perimeter-shape home-perimeter-heart" />
      <span className="home-perimeter-shape home-perimeter-flower" />
      <span className="home-perimeter-shape home-perimeter-pebbles" />
      <span className="home-perimeter-shape home-perimeter-seed" />
    </div>
    <div className="home-intro">
      <p className="eyebrow">Welcome back, Evelyn</p>
      <h1 id="home-title">There is room for whatever today has been.</h1>
      <p>Speak freely. Nothing reaches your family until you say it feels true.</p>
    </div>
    <div className="home-heart-action">
      <button className="home-heart-button" aria-label="Talk about my day" onClick={onBegin}>
        <span className="home-heart-radiance" aria-hidden="true" />
        <span className="home-heart-copy"><strong>Talk about my day</strong><small>There are no right answers.</small></span>
      </button>
      <p>Tap the heart when you’re ready.</p>
    </div>
    <ul className="home-values" aria-label="What Our Place holds">
      <li className="home-value home-value-love"><span className="home-value-shape" aria-hidden="true" /><strong>Love</strong><span>Words held with care</span></li>
      <li className="home-value home-value-health"><span className="home-value-shape" aria-hidden="true" /><strong>Health</strong><span>Space to say how today feels</span></li>
      <li className="home-value home-value-company"><span className="home-value-shape" aria-hidden="true" /><strong>Company</strong><span>Family close by</span></li>
      <li className="home-value home-value-prosperity"><span className="home-value-shape" aria-hidden="true" /><strong>Prosperity</strong><span>The stories that make life rich</span></li>
    </ul>
    <aside className={`reply-card ${hasFamilyActivity ? "" : "reply-card-empty"}`} aria-label="Family response in this demo">
      <p className="home-company-label">Company · Family close by</p>
      {hasFamilyActivity ? <div className="reply-top"><span className="avatar">S</span><div><span className="eyebrow">Sarah responded in this demo</span><h2>What Sarah chose to share</h2></div></div> : <div className="reply-empty" role="status"><span aria-hidden="true">♡</span><div><span className="eyebrow">Family response</span><h2>Nothing from Sarah yet.</h2><p>After you approve a check-in, this demo can show a reaction, written reply, or offer to help that Sarah chooses.</p></div></div>}
      {reaction && <p className="reply-reaction"><span aria-hidden="true">♡</span><strong>{reaction}</strong></p>}
      {reply && <blockquote>“{reply.message}”</blockquote>}
      {committedRequest && <div className="promise-note"><span>✓</span><p><strong>{committedRequest.person} offered to help: {committedRequest.item.title}.</strong><br/>From what you shared: “{committedRequest.item.source_quote}”</p></div>}
    </aside>
    <div className="reassurance"><span className="shield">✓</span><p><strong>Your words remain yours.</strong><br/>Only the update you approve can appear in the family demo.</p></div>
    <button className="family-entry" onClick={onInvite}>See how a family invitation works →</button>
  </section>;
}

type CheckProps = { step: number; listening: boolean; answers: string[]; textMode: boolean; textarea: React.RefObject<HTMLTextAreaElement | null>; setTextMode: (v: boolean) => void; setAnswers: React.Dispatch<React.SetStateAction<string[]>>; capture: () => void; next: () => void; onExit: () => void };

function CheckIn({ step, listening, answers, textMode, textarea, setTextMode, setAnswers, capture, next, onExit }: CheckProps) {
  const answer = answers[step];
  const hasAnswer = Boolean(answer.trim());
  return <section className="checkin page">
    <button className="back" onClick={onExit}>← Pause for now</button>
    <p className="step-label">{PROMPTS[step].lead}</p>
    <h1>{PROMPTS[step].question}</h1>
    {!hasAnswer && <p className="helper">Take your time. Start wherever feels true for you.</p>}
    {textMode ? <textarea ref={textarea} value={answer} onChange={(event) => setAnswers(current => current.map((value, index) => index === step ? event.target.value : value))} placeholder="Type what you’d like to share…" aria-label="Your answer" /> : <button className={`voice-heart-button ${listening ? "listening" : ""}`} onClick={capture} aria-label={listening ? "Stop listening" : "Start speaking"} aria-pressed={listening}>
      <span className="voice-heart-radiance" aria-hidden="true" />
      <VoicePoweredOrb enableVoiceControl={listening} />
      <span className="voice-heart-content"><span className="voice-heart-icon" aria-hidden="true">{listening ? "■" : "●"}</span><strong>{listening ? "I’m listening…" : hasAnswer ? "Say it again" : "Tap to speak"}</strong></span>
    </button>}
    <div aria-live="polite">{hasAnswer && <div className="heard reflection"><span>♡</span><p><small>I want to understand you as you mean it</small><strong>{reflectionFor(step, answer)}</strong><em>Am I staying close to what you mean?</em></p></div>}</div>
    <div className="single-choice">{hasAnswer ? <div className="reflection-actions"><button className="primary" onClick={next}>Yes, you understood me →</button><button className="secondary" onClick={() => { setAnswers(current => current.map((value, index) => index === step ? "" : value)); setTextMode(false); }}>Not quite—let me try again</button></div> : <button className="text-link" onClick={() => setTextMode(!textMode)}>{textMode ? "Use my voice instead" : "I’d rather type"}</button>}</div>
    <p className="gentle-progress">Your words remain yours · You can pause at any time</p>
  </section>;
}

function Complete({ status, error, extraction, approved, onRetry, onEdit, onApprove, onHome, onFamily }: { status: ExtractionStatus; error: string; extraction: ExtractionResult | null; approved: boolean; onRetry: () => void; onEdit: () => void; onApprove: (result: RoutineExtraction) => void; onHome: () => void; onFamily: () => void }) {
  if (status === "loading" || status === "idle") {
    return <section className="complete page narrow extraction-state" aria-busy="true" aria-live="polite">
      <div className="success-mark" aria-hidden="true">♡</div><span className="eyebrow">Listening closely</span>
      <h1>Preparing your update…</h1><p>We’re keeping it close to the words you chose.</p>
    </section>;
  }

  if (status === "error" || !extraction) {
    return <section className="complete page narrow extraction-state" role="alert">
      <div className="success-mark" aria-hidden="true">!</div><span className="eyebrow">Your words have not been shared</span>
      <h1>We couldn’t prepare the update.</h1><p>{error || "Please try again."}</p>
      <div className="review-actions"><button className="primary wide" onClick={onRetry}>Try again</button><button className="secondary wide" onClick={onEdit}>Return to my answers</button></div>
    </section>;
  }

  if (extraction.safety_level === "urgent") {
    return <section className="complete page narrow urgent-interruption" role="alert">
      <div className="success-mark" aria-hidden="true">!</div><span className="eyebrow">Pause this check-in</span>
      <h1>Please contact a person who can help now.</h1><p>{extraction.summary}</p>
      <div className="urgent-guidance"><strong>{extraction.action}</strong><p>Call Sarah, another trusted person nearby, or your local emergency number now. In the U.S., call 911.</p><p><b>Our Place has not contacted or dispatched anyone for you.</b></p></div>
      <a className="primary wide emergency-link" href="tel:911">Call 911 in the U.S.</a>
      <button className="secondary wide" onClick={onEdit}>Change my answers</button>
    </section>;
  }

  return <section className="complete page narrow">
    <div className="success-mark" aria-hidden="true">♡</div><span className="eyebrow">Heard with care</span>
    <h1>{approved ? "Your check-in is ready in this demo." : "Did we understand you?"}</h1>
    {!approved && <div className="share-preview"><div><span className="avatar">E</span><p><small>Today’s check-in</small><strong>{extraction.tone}</strong></p></div><p>{extraction.summary}</p><div className="review-reflection"><small>A careful reflection</small><p>{extraction.reflection}</p></div><section className="approval-items" aria-labelledby="approval-items-heading"><h2 id="approval-items-heading">Everything the family view can show</h2>{extraction.items.length > 0 ? extraction.items.map((item, index) => <article className="approval-item" key={extractionItemKey(item, index)}><span className="approval-item-kind">{EXTRACTION_KIND_LABELS[item.kind]}</span><h3>{item.title}</h3><p>{item.detail}</p><blockquote><small>From your words</small>“{item.source_quote}”</blockquote></article>) : <p className="approval-empty">No additional updates, memories, requests, or possible concerns were found in your words.</p>}</section><button className="edit-link" onClick={onEdit}>Edit this update</button></div>}
    {approved ? <div className="approval-ready"><div className="family-faces"><span>S</span><span>D</span></div><p><strong>Approved and ready in this demo</strong><br/>Nothing was delivered. You can now open the family view to demonstrate a response.</p></div> : <button className="primary wide" onClick={() => onApprove(extraction)}>Yes, this feels true to me</button>}
    {approved && <><button className="primary wide" onClick={onHome}>Back to my home</button><button className="text-link demo-family-link" onClick={onFamily}>Open the family side of this demo →</button></>}
  </section>;
}

function Family({ extraction, reaction, setReaction, commitments, setCommitments, reply, setReply, replyDraft, setReplyDraft, onMemories }: { extraction: RoutineExtraction; reaction: string; setReaction: (v: string) => void; commitments: Record<string,string>; setCommitments: React.Dispatch<React.SetStateAction<Record<string,string>>>; reply: Reply | null; setReply: (v: Reply | null) => void; replyDraft: string; setReplyDraft: (v: string) => void; onMemories: () => void }) {
  const offerHelp = (requestId: string) => setCommitments(current => ({ ...current, [requestId]: "Sarah" }));
  const requests = extraction.items.map((item, index) => ({ item, requestId: extractionItemKey(item, index) })).filter(({ item }) => item.kind === "request");
  const memory = extraction.items.find((item) => item.kind === "memory");
  const trimmedReply = replyDraft.trim();
  const replyIsSaved = Boolean(reply && reply.message === trimmedReply);
  function saveReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedReply) return;
    setReply({ from: "Sarah", message: trimmedReply });
  }
  return <section className="family page">
    <div className="page-title"><div><span className="eyebrow">Evelyn approved this check-in</span><h1>Come close before you act.</h1><p>Receive what she said, reflect what you heard, then respond in your own way.</p></div></div>
    <div className="family-priority">
      <article className="summary-card"><div className="summary-head"><span className="avatar large">E</span><div><span className="status">● FROM EVELYN’S CHECK-IN</span><h2>What she wants you to understand</h2></div></div><p className="summary-text">{extraction.summary}</p><div className="reflective-note"><small>A gentle reflection</small><p>{extraction.reflection}</p></div><div className="reaction-row" aria-label="Reflect back what you heard">{["I hear you", "That memory matters", "I’m here with you"].map(item => <button key={item} className={reaction === item ? "chosen" : ""} aria-pressed={reaction === item} onClick={() => setReaction(reaction === item ? "" : item)}>{reaction === item ? "✓ " : "♡ "}{item}</button>)}</div><p className="reaction-status" aria-live="polite">{reaction ? `Evelyn would see “${reaction}” in this demo.` : "Choose a reaction to show what Evelyn would see in this demo."}</p></article>
      <article className="reply-panel"><span className="eyebrow">Respond as yourself</span><h2>You don’t need perfect words.</h2><p>Begin with what you heard. Let Evelyn know how her words reached you.</p><div className="reply-guide"><span>1</span><p><strong>Reflect</strong><br/>“It sounds like…”</p><span>2</span><p><strong>Respond</strong><br/>“What I want you to know is…”</p></div><form className="reply-composer" onSubmit={saveReply}><label htmlFor="family-reply">Write a reply for Evelyn</label><p id="family-reply-help">This saves the exact words in this browser demo. It does not send a message.</p><textarea id="family-reply" aria-describedby="family-reply-help" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Write what you want Evelyn to see…"/><button className="primary" type="submit" disabled={!trimmedReply}>{reply ? "Save updated reply in this demo" : "Save reply in this demo"}</button></form>{replyIsSaved && <p className="reply-confirmation" role="status">Sarah’s reply was saved in this demo. Evelyn can now see it here.</p>}<small>This is a family message, not counseling.</small></article>
      {requests.length > 0 && <article className="needs-card"><span className="eyebrow">Offer practical help</span><h2>{requests.length === 1 ? "One request you can help with" : `${requests.length} requests you can help with`}</h2>{requests.map(({ item, requestId }) => <FamilyCommitment key={requestId} request={item.title} sourceQuote={item.source_quote} committedBy={commitments[requestId]} onOfferHelp={() => offerHelp(requestId)} />)}<p className="safe-note">Each request is quoted from Evelyn’s own words—not medical advice.</p></article>}
      {memory && <article className="memory-feature"><span className="eyebrow">A story Evelyn shared</span><blockquote>“{memory.source_quote}”</blockquote><p className="question-note">{memory.detail}</p><button className="text-link" onClick={onMemories}>More open invitations →</button></article>}
    </div>
    <p className="family-disclaimer">Our Place helps families connect. It never diagnoses or replaces professional or emergency care.</p>
  </section>;
}

function FamilyCommitment({ request, sourceQuote, committedBy, onOfferHelp }: { request: string; sourceQuote: string; committedBy?: string; onOfferHelp: () => void }) {
  return <div className={`family-commitment ${committedBy ? "committed" : ""}`}><span className="family-commitment-check">{committedBy ? "✓" : ""}</span><div><strong>{request}</strong><small>From Evelyn: “{sourceQuote}”</small>{committedBy && <p><b>{committedBy}</b> will take care of this.</p>}</div>{!committedBy && <button onClick={onOfferHelp}>I can help</button>}</div>;
}

function Memories({ extraction }: { extraction: RoutineExtraction }) {
  const currentMemories = extraction.items.filter((item) => item.kind === "memory");
  return <section className="memories page"><div className="page-title"><div><span className="eyebrow">Stories, held without judgment</span><h1>Open doors to connection</h1><p>Each memory offers a place to listen—not a fact to collect.</p></div><div className="memory-count"><strong>{currentMemories.length}</strong><span>{currentMemories.length === 1 ? "story shared" : "stories shared"}</span></div></div>{currentMemories.length > 0 ? <div className="memory-grid">{currentMemories.map((item) => <article key={`${item.title}:${item.source_quote}`} className="featured"><span className="memory-date">Today</span><div className="memory-icon" aria-hidden="true">✦</div><span className="eyebrow">In Evelyn’s words</span><h2>{item.title}</h2><p>{item.detail}</p><div className="conversation-prompt"><small>What Evelyn shared</small><strong>“{item.source_quote}”</strong><em>Let Evelyn decide what more she wants to say.</em></div></article>)}</div> : <div className="stories-empty" role="status"><span aria-hidden="true">♡</span><h2>No stories were shared today.</h2><p>If Evelyn approves a memory in a future check-in, it will appear here in her own words.</p></div>}<div className="stories-note"><span>♡</span><p><strong>Evelyn remains the author.</strong><br/>Only a memory she approved in this check-in appears here.</p></div></section>;
}

function Invitation({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);
  return <section className="invitation page narrow"><div className="invite-mark"><Image src="/our-place-family-mark.png" alt="A multigenerational family embracing in one circle" width={156} height={156} unoptimized /></div><span className="eyebrow">Family invitation example</span><h1>{accepted ? "There is room for you here, Evelyn." : "See how Sarah could invite Evelyn in."}</h1><p>{accepted ? "Our Place will be waiting without expectation. You decide when to speak and what the family demo may show." : "This example shows a warm invitation to speak in your own way—and a gentle place for family to respond with care."}</p>{!accepted ? <div className="invite-steps"><div><span>1</span><p><strong>Speak as you are</strong><br/>There is no right mood and no right answer.</p></div><div><span>2</span><p><strong>Feel accurately heard</strong><br/>You can correct anything that doesn’t feel true.</p></div><div><span>3</span><p><strong>Invite family closer</strong><br/>Her approved words come before any response.</p></div></div> : <div className="success-mark">✓</div>}<button className="primary wide" onClick={() => accepted ? onAccept() : setAccepted(true)}>{accepted ? "Enter my quiet space" : "Create this space together"}</button><p className="invite-trust">No judgment · No medical monitoring · Your words stay yours</p></section>;
}
