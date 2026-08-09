"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type View = "home" | "checkin" | "complete" | "family" | "memories" | "invite";
type Reply = { from: string; message: string; voice?: boolean };
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
  const [view, setView] = useState<View>("home");
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [textMode, setTextMode] = useState(false);
  const [reply, setReply] = useState<Reply>({ from: "Sarah", message: "I listened to what you shared. I’ll call after dinner.", voice: true });
  const [reaction, setReaction] = useState("I hear you");
  const [commitments, setCommitments] = useState<Record<string, string>>({});
  const [routine, setRoutine] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>("idle");
  const [extractionError, setExtractionError] = useState("");
  const [approvedExtraction, setApprovedExtraction] = useState<RoutineExtraction | null>(null);
  const extractionRequest = useRef(0);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (textMode) textarea.current?.focus(); }, [textMode]);

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

  function begin() {
    extractionRequest.current += 1;
    setStep(0); setAnswers(["", "", ""]); setListening(false); setTextMode(false);
    setExtraction(null); setExtractionStatus("idle"); setExtractionError(""); setApprovedExtraction(null); setCommitments({}); setView("checkin");
  }

  function capture() {
    if (listening) { setListening(false); return; }
    setListening(true);
    window.setTimeout(() => {
      setAnswers((current) => current.map((answer, index) => index === step ? demoAnswers[step] : answer));
      setListening(false);
    }, 1400);
  }

  function next() {
    if (step < PROMPTS.length - 1) { setStep(step + 1); setListening(false); setTextMode(false); }
    else { setView("complete"); void loadExtraction(answers); }
  }

  function editUpdate() {
    extractionRequest.current += 1;
    setExtraction(null); setExtractionStatus("idle"); setExtractionError(""); setApprovedExtraction(null); setCommitments({});
    setStep(0); setListening(false); setTextMode(false); setView("checkin");
  }

  function go(nextView: View) {
    if ((nextView === "family" || nextView === "memories") && !approvedExtraction) return;
    setView(nextView);
  }

  return <main className={`app-shell ${familyMode ? "family-shell" : "elder-shell"}`}>
    <Header familyMode={familyMode} view={view} go={go} />
    {view === "home" && <Home onBegin={begin} reply={reply} routine={routine} setRoutine={setRoutine} onInvite={() => setView("invite")} approvedExtraction={approvedExtraction} commitments={commitments} />}
    {view === "checkin" && <CheckIn {...{ step, listening, answers, textMode, textarea, setTextMode, setAnswers, capture, next }} onExit={() => setView("home")} />}
    {view === "complete" && <Complete status={extractionStatus} error={extractionError} extraction={extraction} approved={Boolean(approvedExtraction)} onRetry={() => void loadExtraction(answers)} onEdit={editUpdate} onApprove={setApprovedExtraction} onHome={() => setView("home")} onFamily={() => go("family")} />}
    {view === "family" && approvedExtraction && <Family extraction={approvedExtraction} {...{ reaction, setReaction, commitments, setCommitments, setReply }} onMemories={() => go("memories")} />}
    {view === "memories" && approvedExtraction && <Memories extraction={approvedExtraction} />}
    {view === "invite" && <Invitation onAccept={() => setView("home")} />}
  </main>;
}

function Header({ familyMode, view, go }: { familyMode: boolean; view: View; go: (v: View) => void }) {
  return <header className="topbar">
    <button className="brand" onClick={() => go(familyMode ? "family" : "home")} aria-label="Our Place home"><span className="brand-mark" aria-hidden="true"><Image src="/our-place-family-mark.png" alt="" width={52} height={52} priority unoptimized /></span><span>Our Place</span></button>
    {familyMode ? <nav aria-label="Family demo navigation"><span className="mode-pill">Family demo · Sarah’s view</span><button className={view === "family" ? "active" : ""} onClick={() => go("family")}>Today</button><button className={view === "memories" ? "active" : ""} onClick={() => go("memories")}>Stories</button><button onClick={() => go("home")}>Demo: Evelyn’s view</button></nav> : <button className="help-button" aria-label="Get help">Help</button>}
  </header>;
}

function Home({ onBegin, reply, routine, setRoutine, onInvite, approvedExtraction, commitments }: { onBegin: () => void; reply: Reply; routine: boolean; setRoutine: (v: boolean) => void; onInvite: () => void; approvedExtraction: RoutineExtraction | null; commitments: Record<string, string> }) {
  const committedRequest = approvedExtraction?.items
    .map((item, index) => ({ item, person: commitments[extractionItemKey(item, index)] }))
    .find(({ item, person }) => item.kind === "request" && person);

  return <section className="home page">
    <div className="welcome-copy">
      <div className="hero-opening">
        <div className="hero-mark"><Image src="/our-place-family-mark.png" alt="Four generations held together in a circle of changing light" width={148} height={148} priority unoptimized /></div>
        <div><span className="eyebrow">A warm place to stay close</span><p className="hero-caption">One circle. Every voice held.</p></div>
      </div>
      <h1>Good morning,<br/><em>Evelyn.</em></h1>
      <p className="plain-promise"><strong>Whatever today has been, you can share it here.</strong><br/>We’ll listen carefully, then help your family understand.</p>
      <button className="primary jumbo" onClick={onBegin}><span className="mic" aria-hidden="true">●</span><span>Talk about my day<small>There are no right answers</small></span></button>
      <div className="elder-actions"><button className="secondary call-button">☎ Call my family</button><button className={`secondary routine-button ${routine ? "selected" : ""}`} onClick={() => setRoutine(!routine)}>{routine ? "✓ I’ll check in at 10:00" : "Remind me at 10:00"}</button></div>
    </div>
    <aside className="reply-card" aria-label="Message from Sarah">
      <div className="reply-top"><span className="avatar">S</span><div><span className="eyebrow">Sarah listened</span><h2>You were understood.</h2></div></div>
      <blockquote>“{reply.message}”</blockquote>
      {reply.voice && <button className="play-reply"><span aria-hidden="true">▶</span><span>Hear Sarah’s message<small>15 seconds</small></span></button>}
      {committedRequest && <div className="promise-note"><span>✓</span><p><strong>{committedRequest.person} offered to help: {committedRequest.item.title}.</strong><br/>From what you shared: “{committedRequest.item.source_quote}”</p></div>}
    </aside>
    <div className="reassurance"><span className="shield">✓</span><p><strong>Your words stay in the family.</strong><br/>Only the update you approve is shared.</p></div>
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
    {textMode ? <textarea ref={textarea} value={answer} onChange={(event) => setAnswers(current => current.map((value, index) => index === step ? event.target.value : value))} placeholder="Type what you’d like to share…" aria-label="Your answer" /> : <button className={`voice-orb ${listening ? "listening" : ""}`} onClick={capture} aria-label={listening ? "Stop listening" : "Start speaking"}><span className="orb-dot">●</span><strong>{listening ? "I’m listening…" : hasAnswer ? "Say it again" : "Tap to speak"}</strong></button>}
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
    <h1>{approved ? "Your family can meet you where you are today." : "Did we understand you?"}</h1>
    {!approved && <div className="share-preview"><div><span className="avatar">E</span><p><small>Today’s check-in</small><strong>{extraction.tone}</strong></p></div><p>{extraction.summary}</p><div className="review-reflection"><small>A careful reflection</small><p>{extraction.reflection}</p></div><section className="approval-items" aria-labelledby="approval-items-heading"><h2 id="approval-items-heading">Everything your family will see</h2>{extraction.items.length > 0 ? extraction.items.map((item, index) => <article className="approval-item" key={extractionItemKey(item, index)}><span className="approval-item-kind">{EXTRACTION_KIND_LABELS[item.kind]}</span><h3>{item.title}</h3><p>{item.detail}</p><blockquote><small>From your words</small>“{item.source_quote}”</blockquote></article>) : <p className="approval-empty">No additional updates, memories, requests, or possible concerns were found in your words.</p>}</section><button className="edit-link" onClick={onEdit}>Edit this update</button></div>}
    {approved ? <div className="delivered"><div className="family-faces"><span>S</span><span>D</span></div><p><strong>Shared with Sarah and Daniel</strong><br/>They’re invited to listen first, then respond.</p></div> : <button className="primary wide" onClick={() => onApprove(extraction)}>Yes, this feels true to me</button>}
    {approved && <><button className="primary wide" onClick={onHome}>Back to my home</button><button className="text-link demo-family-link" onClick={onFamily}>Open the family side of this demo →</button></>}
  </section>;
}

function Family({ extraction, reaction, setReaction, commitments, setCommitments, setReply, onMemories }: { extraction: RoutineExtraction; reaction: string; setReaction: (v: string) => void; commitments: Record<string,string>; setCommitments: React.Dispatch<React.SetStateAction<Record<string,string>>>; setReply: (v: Reply) => void; onMemories: () => void }) {
  const [recording, setRecording] = useState(false); const [sent, setSent] = useState(false);
  const offerHelp = (requestId: string) => setCommitments(current => ({ ...current, [requestId]: "Sarah" }));
  const requests = extraction.items.map((item, index) => ({ item, requestId: extractionItemKey(item, index) })).filter(({ item }) => item.kind === "request");
  const memory = extraction.items.find((item) => item.kind === "memory");
  function voiceReply() { setRecording(true); window.setTimeout(() => { setRecording(false); setSent(true); setReply({ from: "Sarah", message: "I listened to what you shared. I’ll call after dinner.", voice: true }); }, 1200); }
  return <section className="family page">
    <div className="page-title"><div><span className="eyebrow">Evelyn shared 8 minutes ago</span><h1>Come close before you act.</h1><p>Receive what she said, reflect what you heard, then respond in your own way.</p></div><button className="secondary">☎ Call Evelyn</button></div>
    <div className="family-priority">
      <article className="summary-card"><div className="summary-head"><span className="avatar large">E</span><div><span className="status">● FROM EVELYN’S CHECK-IN</span><h2>What she wants you to understand</h2></div></div><p className="summary-text">{extraction.summary}</p><div className="reflective-note"><small>A gentle reflection</small><p>{extraction.reflection}</p></div><div className="reaction-row" aria-label="Reflect back what you heard">{["I hear you", "That memory matters", "I’m here with you"].map(item => <button key={item} className={reaction === item ? "chosen" : ""} onClick={() => setReaction(item)}>{reaction === item ? "✓ " : "♡ "}{item}</button>)}</div><p className="reaction-status">Evelyn will see your response exactly as written.</p></article>
      <article className="reply-panel"><span className="eyebrow">Respond as yourself</span><h2>You don’t need perfect words.</h2><p>Begin with what you heard. Let Evelyn know how her words reached you.</p><div className="reply-guide"><span>1</span><p><strong>Reflect</strong><br/>“It sounds like…”</p><span>2</span><p><strong>Respond</strong><br/>“What I want you to know is…”</p></div><button className={`voice-reply ${recording ? "recording" : ""}`} onClick={voiceReply}><span>{recording ? "■" : "●"}</span>{recording ? "Listening…" : sent ? "✓ Voice reply sent" : "Say what you heard"}</button><small>This is a family message, not counseling.</small></article>
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
  return <section className="invitation page narrow"><div className="invite-mark"><Image src="/our-place-family-mark.png" alt="A multigenerational family embracing in one circle" width={156} height={156} unoptimized /></div><span className="eyebrow">A personal invitation from Sarah</span><h1>{accepted ? "There is room for you here, Evelyn." : "Sarah would like to understand more of your days."}</h1><p>{accepted ? "Our Place will be waiting without expectation. You decide when to speak and what your family may hear." : "Our Place is a warm place to speak in your own way—and a gentle invitation for family to listen with care."}</p>{!accepted ? <div className="invite-steps"><div><span>1</span><p><strong>Speak as you are</strong><br/>There is no right mood and no right answer.</p></div><div><span>2</span><p><strong>Feel accurately heard</strong><br/>You can correct anything that doesn’t feel true.</p></div><div><span>3</span><p><strong>Invite family closer</strong><br/>They receive your words before they offer help.</p></div></div> : <div className="success-mark">✓</div>}<button className="primary wide" onClick={() => accepted ? onAccept() : setAccepted(true)}>{accepted ? "Enter my quiet space" : "Create this space together"}</button>{!accepted && <button className="text-link">I’d like Sarah beside me</button>}<p className="invite-trust">No judgment · No medical monitoring · Your words stay yours</p></section>;
}
