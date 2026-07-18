"use client";

import { useEffect, useRef, useState } from "react";

type View = "home" | "checkin" | "complete" | "family" | "memories";

const PROMPTS = [
  "How are you feeling today?",
  "What have you been up to?",
  "Is there anything you need a hand with?",
];

const entries = [
  { date: "Today", title: "The blue porch swing", text: "Evelyn remembered the summer she and Frank painted their first porch swing blue.", tag: "A family story" },
  { date: "June 12", title: "Saturday pancakes", text: "The grandchildren always asked for extra blueberries when they slept over.", tag: "Tradition" },
  { date: "June 7", title: "Meeting Frank", text: "They met at a church picnic in 1968. He offered her the last slice of peach pie.", tag: "A family story" },
];

export function StillHereApp() {
  const [view, setView] = useState<View>("home");
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [textMode, setTextMode] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textMode) textarea.current?.focus();
  }, [textMode]);

  function begin() {
    setStep(0); setAnswers(["", "", ""]); setListening(false); setTextMode(false); setView("checkin");
  }

  function capture() {
    setListening((value) => !value);
    if (!listening && !answers[step]) {
      window.setTimeout(() => {
        const demo = [
          "I’m feeling pretty good today. The sunshine has been lovely.",
          "I watered my tomatoes and remembered the blue porch swing Frank and I painted.",
          "I’m almost out of milk, and the kitchen light keeps flickering.",
        ];
        setAnswers((current) => current.map((answer, index) => index === step ? demo[step] : answer));
        setListening(false);
      }, 1600);
    }
  }

  function next() {
    if (step < PROMPTS.length - 1) { setStep(step + 1); setListening(false); setTextMode(false); }
    else setView("complete");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")} aria-label="Still Here home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Still Here</span>
        </button>
        <nav aria-label="Main navigation">
          <button className={view === "family" ? "active" : ""} onClick={() => setView("family")}>Family view</button>
          <button className={view === "memories" ? "active" : ""} onClick={() => setView("memories")}>Memories</button>
        </nav>
      </header>

      {view === "home" && <Home onBegin={begin} onFamily={() => setView("family")} />}
      {view === "checkin" && <CheckIn {...{ step, listening, answers, textMode, textarea, setTextMode, setAnswers, capture, next }} onExit={() => setView("home")} />}
      {view === "complete" && <Complete onHome={() => setView("home")} onFamily={() => setView("family")} />}
      {view === "family" && <Family onMemories={() => setView("memories")} />}
      {view === "memories" && <Memories />}
    </main>
  );
}

function Home({ onBegin, onFamily }: { onBegin: () => void; onFamily: () => void }) {
  return <section className="home page">
    <div className="welcome-copy">
      <span className="eyebrow">A little hello goes a long way</span>
      <h1>Good morning,<br/><em>Evelyn.</em></h1>
      <p>Take a moment to share how you’re doing. Your family will get a warm little update.</p>
      <button className="primary jumbo" onClick={onBegin}><span className="mic" aria-hidden="true">●</span><span>Start my check-in<small>It only takes about 2 minutes</small></span></button>
      <button className="text-link" onClick={onFamily}>Preview what your family sees <span aria-hidden="true">→</span></button>
    </div>
    <div className="sun-card" aria-hidden="true">
      <div className="sun"></div><div className="hill hill-one"></div><div className="hill hill-two"></div>
      <div className="card-note"><span>Today’s gentle thought</span><strong>“The best part of the day is sharing it.”</strong></div>
    </div>
    <div className="reassurance"><span className="shield">✓</span><p><strong>Your words stay in the family.</strong><br/>We only share the short update you approve.</p></div>
  </section>;
}

type CheckProps = {
  step: number; listening: boolean; answers: string[]; textMode: boolean;
  textarea: React.RefObject<HTMLTextAreaElement | null>;
  setTextMode: (v: boolean) => void; setAnswers: React.Dispatch<React.SetStateAction<string[]>>;
  capture: () => void; next: () => void; onExit: () => void;
};

function CheckIn({ step, listening, answers, textMode, textarea, setTextMode, setAnswers, capture, next, onExit }: CheckProps) {
  const answer = answers[step];
  return <section className="checkin page">
    <button className="back" onClick={onExit}>← Pause and go back</button>
    <div className="progress" aria-label={`Question ${step + 1} of ${PROMPTS.length}`}><span style={{width: `${((step + 1) / PROMPTS.length) * 100}%`}} /></div>
    <p className="step-label">Question {step + 1} of {PROMPTS.length}</p>
    <h1>{PROMPTS[step]}</h1>
    <p className="helper">Take your time. I’m listening.</p>
    {textMode ? <textarea ref={textarea} value={answer} onChange={(e) => setAnswers(a => a.map((v, i) => i === step ? e.target.value : v))} placeholder="Type what you’d like to share…" aria-label="Your answer" /> :
      <button className={`voice-orb ${listening ? "listening" : ""}`} onClick={capture} aria-label={listening ? "Stop listening" : "Start speaking"}><span className="orb-dot">●</span><strong>{listening ? "Listening…" : answer ? "Speak again" : "Tap to speak"}</strong></button>}
    {answer && <div className="heard"><span>✓</span><p><small>I heard</small>{answer}</p></div>}
    <div className="check-actions">
      <button className="secondary" onClick={() => setTextMode(!textMode)}>{textMode ? "Use my voice" : "I’d rather type"}</button>
      <button className="primary" onClick={next} disabled={!answer}>{step === 2 ? "Finish my check-in" : "Next question"} →</button>
    </div>
    <p className="privacy-note">🔒 Your conversation is private and shared only with your family.</p>
  </section>;
}

function Complete({ onHome, onFamily }: { onHome: () => void; onFamily: () => void }) {
  return <section className="complete page narrow">
    <div className="success-mark">✓</div><span className="eyebrow">All done</span>
    <h1>Thank you, Evelyn.</h1><p>Your update is ready for the family. You shared a lovely memory, too.</p>
    <div className="share-preview"><div><span className="avatar">E</span><p><small>Today’s check-in</small><strong>Evelyn is feeling good</strong></p></div><p>She enjoyed the sunshine, watered her tomatoes, and remembered painting the porch swing with Frank.</p><div className="tag-row"><span>🛒 Milk</span><span>💡 Kitchen light</span></div></div>
    <button className="primary wide" onClick={onFamily}>See the family update →</button><button className="text-link" onClick={onHome}>Back to home</button>
  </section>;
}

function Family({ onMemories }: { onMemories: () => void }) {
  return <section className="family page">
    <div className="page-title"><div><span className="eyebrow">Friday, July 17</span><h1>Evelyn’s day</h1><p>A warm, useful glimpse between phone calls.</p></div><button className="secondary">Call Evelyn</button></div>
    <div className="dashboard-grid">
      <article className="summary-card"><div className="summary-head"><span className="avatar large">E</span><div><span className="status">● CHECKED IN TODAY</span><h2>She’s feeling good.</h2></div></div><p className="summary-text">Evelyn enjoyed the sunshine and spent some time watering her tomatoes. She talked fondly about painting a blue porch swing with Frank years ago.</p><div className="tone"><span>☀</span><p><small>Today’s tone</small>Bright and talkative</p></div></article>
      <article className="needs-card"><span className="eyebrow">A little help</span><h2>Two things to follow up on</h2><label><input type="checkbox"/><span><strong>Pick up some milk</strong><small>“I’m almost out of milk.”</small></span></label><label><input type="checkbox"/><span><strong>Check the kitchen light</strong><small>She said it keeps flickering.</small></span></label><p className="safe-note">These are practical requests from Evelyn’s own words—not medical advice.</p></article>
      <article className="memory-feature"><span className="eyebrow">Memory saved today</span><blockquote>“Frank and I painted that old porch swing the brightest blue we could find.”</blockquote><button className="text-link" onClick={onMemories}>Visit the memory archive →</button></article>
      <article className="rhythm-card"><span className="eyebrow">This week</span><h2>A steady rhythm</h2><div className="week" aria-label="Four check-ins this week"><span className="done">M</span><span className="done">T</span><span>W</span><span className="done">T</span><span className="today">F</span><span>S</span><span>S</span></div><p>4 check-ins · No unusual change noticed</p></article>
    </div>
    <p className="family-disclaimer">Still Here notices patterns to help families connect. It never diagnoses or replaces professional or emergency care.</p>
  </section>;
}

function Memories() {
  return <section className="memories page">
    <div className="page-title"><div><span className="eyebrow">The things worth keeping</span><h1>Family memories</h1><p>Small stories, safely gathered one conversation at a time.</p></div><div className="memory-count"><strong>12</strong><span>stories saved</span></div></div>
    <div className="memory-grid">{entries.map((entry, index) => <article key={entry.title} className={index === 0 ? "featured" : ""}><span className="memory-date">{entry.date}</span><div className="memory-icon" aria-hidden="true">✦</div><span className="eyebrow">{entry.tag}</span><h2>{entry.title}</h2><p>{entry.text}</p><button className="text-link">Read the full memory →</button></article>)}</div>
    <div className="archive-note"><span>♡</span><p><strong>A living family archive</strong><br/>Every story stays private and can be removed by Evelyn or her family at any time.</p></div>
  </section>;
}
