"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type View = "home" | "checkin" | "complete" | "family" | "memories" | "invite";
type Reply = { from: string; message: string; voice?: boolean };

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

const entries = [
  { date: "Today", title: "The blue porch swing", text: "Evelyn remembered the summer she and Frank painted their first porch swing blue.", prompt: "What do you remember most clearly about painting it together?", tag: "A family story" },
  { date: "June 12", title: "Saturday pancakes", text: "The grandchildren always asked for extra blueberries when they slept over.", prompt: "What made those Saturday mornings feel like yours?", tag: "Tradition" },
  { date: "June 7", title: "Meeting Frank", text: "They met at a church picnic in 1968. He offered her the last slice of peach pie.", prompt: "When you think of that afternoon now, what comes to you first?", tag: "A family story" },
];

export function StillHereApp() {
  const [view, setView] = useState<View>("home");
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [textMode, setTextMode] = useState(false);
  const [reply, setReply] = useState<Reply>({ from: "Sarah", message: "I loved hearing about your tomatoes. I’ll call after dinner.", voice: true });
  const [reaction, setReaction] = useState("I hear you");
  const [commitments, setCommitments] = useState<Record<string, string>>({});
  const [routine, setRoutine] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (textMode) textarea.current?.focus(); }, [textMode]);

  const familyMode = view === "family" || view === "memories";

  function begin() {
    setStep(0); setAnswers(["", "", ""]); setListening(false); setTextMode(false); setView("checkin");
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
    else setView("complete");
  }

  return <main className={`app-shell ${familyMode ? "family-shell" : "elder-shell"}`}>
    <Header familyMode={familyMode} view={view} go={setView} />
    {view === "home" && <Home onBegin={begin} reply={reply} routine={routine} setRoutine={setRoutine} onInvite={() => setView("invite")} />}
    {view === "checkin" && <CheckIn {...{ step, listening, answers, textMode, textarea, setTextMode, setAnswers, capture, next }} onExit={() => setView("home")} />}
    {view === "complete" && <Complete onHome={() => setView("home")} onFamily={() => setView("family")} />}
    {view === "family" && <Family {...{ reaction, setReaction, commitments, setCommitments, setReply }} onMemories={() => setView("memories")} />}
    {view === "memories" && <Memories />}
    {view === "invite" && <Invitation onAccept={() => setView("home")} />}
  </main>;
}

function Header({ familyMode, view, go }: { familyMode: boolean; view: View; go: (v: View) => void }) {
  return <header className="topbar">
    <button className="brand" onClick={() => go(familyMode ? "family" : "home")} aria-label="Our Place home"><span className="brand-mark" aria-hidden="true"><Image src="/still-here-family-mark.png" alt="" width={52} height={52} priority unoptimized /></span><span>Our Place</span></button>
    {familyMode ? <nav aria-label="Family navigation"><span className="mode-pill">Sarah’s family space</span><button className={view === "family" ? "active" : ""} onClick={() => go("family")}>Today</button><button className={view === "memories" ? "active" : ""} onClick={() => go("memories")}>Stories</button><button onClick={() => go("home")}>Evelyn’s view</button></nav> : <button className="help-button" aria-label="Get help">Help</button>}
  </header>;
}

function Home({ onBegin, reply, routine, setRoutine, onInvite }: { onBegin: () => void; reply: Reply; routine: boolean; setRoutine: (v: boolean) => void; onInvite: () => void }) {
  return <section className="home page">
    <div className="welcome-copy">
      <div className="hero-opening">
        <div className="hero-mark"><Image src="/still-here-family-mark.png" alt="Four generations held together in a circle of changing light" width={148} height={148} priority unoptimized /></div>
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
      <div className="promise-note"><span>✓</span><p><strong>Sarah is bringing milk tomorrow.</strong><br/>She heard what would help.</p></div>
    </aside>
    <div className="reassurance"><span className="shield">✓</span><p><strong>Your words stay in the family.</strong><br/>Only the update you approve is shared.</p></div>
    <button className="family-entry" onClick={onInvite}>See how a family invitation works →</button>
  </section>;
}

type CheckProps = { step: number; listening: boolean; answers: string[]; textMode: boolean; textarea: React.RefObject<HTMLTextAreaElement | null>; setTextMode: (v: boolean) => void; setAnswers: React.Dispatch<React.SetStateAction<string[]>>; capture: () => void; next: () => void; onExit: () => void };

function CheckIn({ step, listening, answers, textMode, textarea, setTextMode, setAnswers, capture, next, onExit }: CheckProps) {
  const answer = answers[step];
  return <section className="checkin page">
    <button className="back" onClick={onExit}>← Pause for now</button>
    <p className="step-label">{PROMPTS[step].lead}</p>
    <h1>{PROMPTS[step].question}</h1>
    {!answer && <p className="helper">Take your time. Start wherever feels true for you.</p>}
    {textMode ? <textarea ref={textarea} value={answer} onChange={(event) => setAnswers(current => current.map((value, index) => index === step ? event.target.value : value))} placeholder="Type what you’d like to share…" aria-label="Your answer" /> : <button className={`voice-orb ${listening ? "listening" : ""}`} onClick={capture} aria-label={listening ? "Stop listening" : "Start speaking"}><span className="orb-dot">●</span><strong>{listening ? "I’m listening…" : answer ? "Say it again" : "Tap to speak"}</strong></button>}
    <div aria-live="polite">{answer && <div className="heard reflection"><span>♡</span><p><small>I want to understand you as you mean it</small><strong>{reflectionFor(step, answer)}</strong><em>Am I staying close to what you mean?</em></p></div>}</div>
    <div className="single-choice">{answer ? <div className="reflection-actions"><button className="primary" onClick={next}>Yes, you understood me →</button><button className="secondary" onClick={() => { setAnswers(current => current.map((value, index) => index === step ? "" : value)); setTextMode(false); }}>Not quite—let me try again</button></div> : <button className="text-link" onClick={() => setTextMode(!textMode)}>{textMode ? "Use my voice instead" : "I’d rather type"}</button>}</div>
    <p className="gentle-progress">Your words remain yours · You can pause at any time</p>
  </section>;
}

function Complete({ onHome, onFamily }: { onHome: () => void; onFamily: () => void }) {
  const [shared, setShared] = useState(false);
  return <section className="complete page narrow">
    <div className="success-mark">♡</div><span className="eyebrow">Heard with care</span>
    <h1>{shared ? "Your family can meet you where you are today." : "Did we understand you?"}</h1>
    {!shared && <div className="share-preview"><div><span className="avatar">E</span><p><small>Today’s check-in</small><strong>Evelyn is feeling good</strong></p></div><p>She enjoyed the sunshine, watered her tomatoes, and remembered painting the porch swing with Frank.</p><div className="tag-row"><span>🛒 Milk</span><span>💡 Kitchen light</span></div><button className="edit-link">Edit this update</button></div>}
    {shared ? <div className="delivered"><div className="family-faces"><span>S</span><span>D</span></div><p><strong>Shared with Sarah and Daniel</strong><br/>They’re invited to listen first, then respond.</p></div> : <button className="primary wide" onClick={() => setShared(true)}>Yes, this feels true to me</button>}
    {shared && <button className="primary wide" onClick={onHome}>Back to my home</button>}
    <button className="text-link demo-family-link" onClick={onFamily}>Open the family side of this demo →</button>
  </section>;
}

function Family({ reaction, setReaction, commitments, setCommitments, setReply, onMemories }: { reaction: string; setReaction: (v: string) => void; commitments: Record<string,string>; setCommitments: React.Dispatch<React.SetStateAction<Record<string,string>>>; setReply: (v: Reply) => void; onMemories: () => void }) {
  const [recording, setRecording] = useState(false); const [sent, setSent] = useState(false);
  const claim = (task: string) => setCommitments(current => ({ ...current, [task]: "Sarah" }));
  function voiceReply() { setRecording(true); window.setTimeout(() => { setRecording(false); setSent(true); setReply({ from: "Sarah", message: "I loved hearing about your tomatoes. I’ll call after dinner.", voice: true }); }, 1200); }
  return <section className="family page">
    <div className="page-title"><div><span className="eyebrow">Evelyn shared 8 minutes ago</span><h1>Come close before you act.</h1><p>Receive what she said, reflect what you heard, then respond in your own way.</p></div><button className="secondary">☎ Call Evelyn</button></div>
    <div className="family-priority">
      <article className="summary-card"><div className="summary-head"><span className="avatar large">E</span><div><span className="status">● IN EVELYN’S WORDS</span><h2>What she wants you to understand</h2></div></div><p className="summary-text">“The sunshine has been lovely. Watering my tomatoes brought back the blue porch swing Frank and I painted.”</p><div className="reflective-note"><small>A gentle reflection</small><p>It sounds like today felt lighter, and that Frank’s memory felt close.</p></div><div className="reaction-row" aria-label="Reflect back what you heard">{["I hear you", "That memory matters", "I’m here with you"].map(item => <button key={item} className={reaction === item ? "chosen" : ""} onClick={() => setReaction(item)}>{reaction === item ? "✓ " : "♡ "}{item}</button>)}</div><p className="reaction-status">Evelyn will see your response exactly as written.</p></article>
      <article className="reply-panel"><span className="eyebrow">Respond as yourself</span><h2>You don’t need perfect words.</h2><p>Begin with what you heard. Let Evelyn know how her words reached you.</p><div className="reply-guide"><span>1</span><p><strong>Reflect</strong><br/>“It sounds like…”</p><span>2</span><p><strong>Respond</strong><br/>“What I want you to know is…”</p></div><button className={`voice-reply ${recording ? "recording" : ""}`} onClick={voiceReply}><span>{recording ? "■" : "●"}</span>{recording ? "Listening…" : sent ? "✓ Voice reply sent" : "Say what you heard"}</button><small>This is a family message, not counseling.</small></article>
      <article className="needs-card"><span className="eyebrow">A little help</span><h2>Two things you can take care of</h2><Task title="Pick up some milk" quote="I’m almost out of milk." owner={commitments.milk} onClaim={() => claim("milk")} /><Task title="Check the kitchen light" quote="It keeps flickering." owner={commitments.light} onClaim={() => claim("light")} /><p className="safe-note">Practical requests from Evelyn’s own words—not medical advice.</p></article>
      <article className="memory-feature"><span className="eyebrow">An open door for your next call</span><blockquote>“What do you remember most clearly about painting that porch swing together?”</blockquote><p className="question-note">Ask, then leave room for wherever Evelyn takes it.</p><button className="text-link" onClick={onMemories}>More open invitations →</button></article>
    </div>
    <details className="weekly-details"><summary>This week’s check-in rhythm</summary><div className="week"><span className="done">M</span><span className="done">T</span><span>W</span><span className="done">T</span><span className="today">F</span><span>S</span><span>S</span></div><p>Four check-ins this week. A missed day is never treated as an emergency.</p></details>
    <p className="family-disclaimer">Our Place helps families connect. It never diagnoses or replaces professional or emergency care.</p>
  </section>;
}

function Task({ title, quote, owner, onClaim }: { title: string; quote: string; owner?: string; onClaim: () => void }) {
  return <div className={`task ${owner ? "claimed" : ""}`}><span className="task-check">{owner ? "✓" : ""}</span><div><strong>{title}</strong><small>“{quote}”</small>{owner && <p><b>{owner}</b> will take care of this.</p>}</div>{!owner && <button onClick={onClaim}>I’ll do this</button>}</div>;
}

function Memories() {
  return <section className="memories page"><div className="page-title"><div><span className="eyebrow">Stories, held without judgment</span><h1>Open doors to connection</h1><p>Each memory offers a place to listen—not a fact to collect.</p></div><div className="memory-count"><strong>12</strong><span>stories shared</span></div></div><div className="memory-grid">{entries.map((entry, index) => <article key={entry.title} className={index === 0 ? "featured" : ""}><span className="memory-date">{entry.date}</span><div className="memory-icon" aria-hidden="true">✦</div><span className="eyebrow">{entry.tag}</span><h2>{entry.title}</h2><p>{entry.text}</p><div className="conversation-prompt"><small>An open invitation</small><strong>{entry.prompt}</strong><em>Let the answer go wherever it needs to.</em></div></article>)}</div><div className="archive-note"><span>♡</span><p><strong>A living family archive</strong><br/>Evelyn remains the author of every story and can remove one at any time.</p></div></section>;
}

function Invitation({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);
  return <section className="invitation page narrow"><div className="invite-mark"><Image src="/still-here-family-mark.png" alt="A multigenerational family embracing in one circle" width={156} height={156} unoptimized /></div><span className="eyebrow">A personal invitation from Sarah</span><h1>{accepted ? "There is room for you here, Evelyn." : "Sarah would like to understand more of your days."}</h1><p>{accepted ? "Our Place will be waiting without expectation. You decide when to speak and what your family may hear." : "Our Place is a warm place to speak in your own way—and a gentle invitation for family to listen with care."}</p>{!accepted ? <div className="invite-steps"><div><span>1</span><p><strong>Speak as you are</strong><br/>There is no right mood and no right answer.</p></div><div><span>2</span><p><strong>Feel accurately heard</strong><br/>You can correct anything that doesn’t feel true.</p></div><div><span>3</span><p><strong>Invite family closer</strong><br/>They receive your words before they offer help.</p></div></div> : <div className="success-mark">✓</div>}<button className="primary wide" onClick={() => accepted ? onAccept() : setAccepted(true)}>{accepted ? "Enter my quiet space" : "Create this space together"}</button>{!accepted && <button className="text-link">I’d like Sarah beside me</button>}<p className="invite-trust">No judgment · No medical monitoring · Your words stay yours</p></section>;
}
