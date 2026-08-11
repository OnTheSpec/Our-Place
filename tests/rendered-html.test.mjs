import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

let workerImportCounter = 0;

async function readSourceTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = [];

  for (const entry of entries) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) {
      sources.push(...await readSourceTree(url));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      sources.push({ path: url.pathname, source: await readFile(url, "utf8") });
    }
  }

  return sources;
}

async function requestWorker(request, environment = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${workerImportCounter++}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(request, {
    DB: {},
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    ...environment,
  }, { waitUntil() {}, passThroughOnException() {} });
}

async function render(url = "http://localhost/", requestHeaders = {}) {
  return requestWorker(new Request(url, { headers: { accept: "text/html", ...requestHeaders } }));
}

function postAnswers(answers) {
  return requestWorker(new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers }),
  }));
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const openingBrace = source.indexOf("{", start);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }
  assert.fail(`unterminated function ${name}`);
}

test("server-renders the Our Place experience", async () => {
  const response = await render("https://preview.our-place.example/", {
    "x-forwarded-host": "preview.our-place.example",
    "x-forwarded-proto": "https",
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Our Place/);
  assert.match(html, /name="description" content="A warm place for older adults to share their days and for families to stay close\."/);
  assert.match(html, />Our Place</);
  assert.match(html, />A warm place to stay close</);
  assert.match(html, />The small things are how we stay close\.</);
  assert.match(html, />Enter Our Place</);
  assert.match(html, /our-place-family-world\.webp/);
  assert.match(html, /A multigenerational family embracing together on their porch at golden-hour dusk/);
  assert.match(html, />Your space · Ready when you are</);
  assert.match(html, />Only what you approve is shared</);
  assert.match(html, />Speak freely</);
  assert.match(html, />Check what we heard</);
  assert.match(html, />Share only when it feels true</);
  assert.match(html, /our-place-family-mark\.png/);
  assert.match(html, /Our Place — A warm place to stay close, with a family embracing at home/);
  assert.match(html, /https:\/\/preview\.our-place\.example\/og\.png/);
  assert.match(html, /summary_large_image/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("credential-free extraction keeps the exact synthetic demo fixture", async () => {
  const response = await postAnswers([
    "I’m feeling pretty good today. The sunshine has been lovely.",
    "I watered my tomatoes and remembered the blue porch swing Frank and I painted.",
    "I’m almost out of milk, and the kitchen light keeps flickering.",
  ]);
  assert.equal(response.status, 200);
  const extraction = await response.json();
  assert.equal(extraction.safety_level, "routine");
  assert.equal(extraction.tone, "In Evelyn’s own words");
  assert.match(extraction.summary, /sunshine/i);
  assert.deepEqual(extraction.items.filter((item) => item.kind === "request").map((item) => item.title), ["Pick up milk", "Check the kitchen light"]);
});

test("required urgent phrases take the deterministic human-help path", async () => {
  const urgentPhrases = [
    "I have fallen and cannot stand up.",
    "I fell and cannot get up.",
    "I have fallen and cannot get up.",
    "I fell and cannot stand up.",
    "Ive fallen and cant get up.",
    "I am having a heart attack.",
    "I have chest pain.",
    "I cannot breathe.",
    "I have suicidal intent and need help.",
    "I took an overdose.",
    "There is a fire in my room.",
    "My home is on fire.",
    "A fire is burning in my kitchen.",
  ];

  for (const phrase of urgentPhrases) {
    const response = await postAnswers([
      "I was having a quiet morning.",
      phrase,
      "Please call a person nearby.",
    ]);
    assert.equal(response.status, 200, phrase);
    const extraction = await response.json();
    assert.equal(extraction.safety_level, "urgent", phrase);
    assert.deepEqual(extraction.items, [], phrase);
    assert.match(extraction.action, /trusted person|emergency services/i, phrase);
    assert.doesNotMatch(JSON.stringify(extraction), /dispatched|help is on the way/i, phrase);
  }
});

test("urgent detection does not match related substrings or ordinary figurative language", async () => {
  const routinePhrases = [
    "The fireworks at the park were lovely.",
    "My fellow gardener brought tomatoes.",
    "I told a bonfire story from summer camp.",
    "I fell in love with a new poem.",
    "That jazz band was on fire last night.",
  ];

  for (const phrase of routinePhrases) {
    const response = await postAnswers([
      "I was having a quiet morning.",
      phrase,
      "I do not need anything today.",
    ]);
    assert.equal(response.status, 200, phrase);
    const extraction = await response.json();
    assert.equal(extraction.safety_level, "routine", phrase);
  }
});

test("credential-free non-demo extraction stays in the submitted words", async () => {
  const answers = [
    "I read beside the window this morning.",
    "A red scarf on the chair reminded me of winter.",
    "I do not need anything from the store.",
  ];
  const response = await postAnswers(answers);
  assert.equal(response.status, 200);
  const extraction = await response.json();
  assert.equal(extraction.safety_level, "routine");
  assert.deepEqual(extraction.items, []);
  const returnedWords = `${extraction.summary} ${extraction.reflection}`;
  for (const phrase of ["beside the window", "red scarf", "do not need anything"]) assert.match(returnedWords, new RegExp(phrase, "i"));
  assert.doesNotMatch(returnedWords, /tomato|porch|milk|sunshine/i);
});

test("extraction requires exactly three non-empty short strings", async () => {
  const invalidAnswers = [
    ["one", "two"],
    ["one", "   ", "three"],
    ["one", "two", "x".repeat(601)],
  ];
  for (const answers of invalidAnswers) {
    const response = await postAnswers(answers);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /three non-empty short answers/i);
  }
});

test("keeps safety, extraction, opening-screen, and voice-heart boundaries in source", async () => {
  const [route, client, css, layout, handwriting, voiceHeart] = await Promise.all([
    readFile(new URL("../app/api/extract/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/our-place-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/hand-writing-text.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/voice-powered-orb.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /urgentLanguagePatterns/);
  assert.match(route, /hasUrgentLanguage/);
  assert.doesNotMatch(route, /const\s+urgentLanguage\s*=\s*\/(?:[^/\\]|\\.)+\/[a-z]*/i);
  assert.match(route, /json_schema/);
  assert.match(route, /Never diagnose/);
  assert.match(route, /person-centered reflection/);
  assert.match(client, /I’d rather type/);
  assert.match(client, /export function OurPlaceApp/);
  assert.match(client, /useState<View>\("opening"\)/);
  assert.match(client, /view !== "opening" && <Header/);
  const openingStart = client.indexOf("function Opening(");
  const openingEnd = client.indexOf("function Header(", openingStart);
  assert.notEqual(openingStart, -1, "missing Opening function");
  assert.notEqual(openingEnd, -1, "missing Opening function boundary");
  const opening = client.slice(openingStart, openingEnd);
  assert.match(opening, /src="\/our-place-family-world\.webp"/);
  assert.match(opening, /alt="A multigenerational family embracing together on their porch at golden-hour dusk"/);
  assert.match(opening, /\bfill\b/);
  assert.match(opening, /sizes="100vw"/);
  assert.match(opening, /\bpriority\b/);
  assert.match(opening, /\bunoptimized\b/);
  assert.match(opening, /A warm place to stay close/);
  assert.match(opening, /The small things are how we stay close/);
  assert.match(opening, /Your space · Ready when you are/);
  assert.match(opening, /Only what you approve is shared/);
  assert.equal((opening.match(/className="opening-status-note"/g) ?? []).length, 2);
  assert.match(opening, /Speak freely/);
  assert.match(opening, /Check what we heard/);
  assert.match(opening, /Share only when it feels true/);
  assert.match(opening, /steps\.current\?\.focus\(\)/);
  assert.equal((opening.match(/<h1\b/g) ?? []).length, 1);
  assert.match(opening, /aria-labelledby="opening-title"/);
  assert.match(opening, /<h1 id="opening-title"/);
  assert.doesNotMatch(opening, /Cofounder|streaks?|scores?|quests?|coins?|badges?|completion percentages?|progress rings?|monitoring|diagnosis/i);
  assert.match(client, /Good morning/);
  assert.match(client, /Talk about my day/);
  assert.match(client, /Nothing from Sarah yet/);
  assert.match(client, /useState<Reply \| null>\(null\)/);
  assert.doesNotMatch(client, /Call my family|Remind me at 10:00|Get help|Hear Sarah’s message|Call Evelyn|I’d like Sarah beside me/);
  assert.match(client, /I want to understand you as you mean it/);
  assert.match(client, /Am I staying close to what you mean/);
  assert.match(client, /Come close before you act/);
  assert.match(client, /will take care of this/);
  assert.match(client, /sourceQuote/);
  assert.match(client, /item\.kind === "request"/);
  assert.match(client, /I can help/);
  assert.match(client, /Family demo · Sarah’s view/);
  assert.match(client, />Today</);
  assert.match(client, />Stories</);
  assert.match(client, /Create this space together/);
  assert.match(client, /Approved and ready in this demo/);
  assert.match(client, /Nothing was delivered/);
  assert.match(client, /Evelyn approved this check-in/);
  assert.doesNotMatch(client, /Shared with Sarah and Daniel|Evelyn shared 8 minutes ago/);
  assert.match(client, /const \[reaction, setReaction\] = useState\(""\)/);
  assert.match(client, /aria-pressed=\{reaction === item\}/);
  assert.match(client, /setReaction\(reaction === item \? "" : item\)/);
  assert.match(client, /Write a reply for Evelyn/);
  assert.match(client, /disabled=\{!trimmedReply\}/);
  assert.match(client, /message: trimmedReply/);
  assert.match(client, /Save reply in this demo/);
  assert.doesNotMatch(client, /voiceReply|voice-reply|recording|Voice reply sent/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /\.opening-world-image/);
  assert.match(css, /\.opening-world-wash/);
  assert.match(css, /background:#172a29/);
  assert.match(css, /object-position:68% center/);
  assert.match(css, /--clay:#a44735/);
  assert.match(css, /--violet:#75639d/);
  assert.match(css, /Klee-inspired color dialogue/);
  assert.match(css, /\.reply-card-empty/);
  assert.match(css, /\.reply-composer/);
  assert.doesNotMatch(css, /\.help-button|\.elder-actions|\.routine-button|\.play-reply|\.voice-reply/);
  assert.match(layout, /our-place-family-mark\.png/);
  assert.match(layout, /x-forwarded-host/);
  assert.match(layout, /generateMetadata/);
  assert.match(handwriting, /export function HandWrittenTitle/);
  assert.match(handwriting, /useReducedMotion/);
  assert.match(handwriting, /aria-hidden="true"/);
  assert.match(handwriting, /<motion\.h1/);
  assert.match(handwriting, /<motion\.path/);
  assert.doesNotMatch(handwriting, /KokonutUI/i);
  assert.match(voiceHeart, /import \{ Mesh, Program, Renderer, Triangle, Vec3 \} from "ogl"/);
  assert.match(voiceHeart, /if \(!enableVoiceControl\)[\s\S]{0,500}return/);
  assert.match(voiceHeart, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(voiceHeart, /cancelled \|\| !enabledRef\.current/);
  assert.match(voiceHeart, /stopStream\(lateStream\)/);
  assert.match(voiceHeart, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(voiceHeart, /source\?\.disconnect\(\)/);
  assert.match(voiceHeart, /context\.close\(\)/);
  assert.match(voiceHeart, /prefers-reduced-motion: reduce/);
  assert.match(voiceHeart, /aria-hidden="true"/);
  assert.match(voiceHeart, /canvas\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(voiceHeart, /WEBGL_lose_context/);
  assert.match(client, /<VoicePoweredOrb enableVoiceControl=\{listening\}/);
  assert.match(client, /aria-pressed=\{listening\}/);
  assert.match(client, /captureTimeout/);
  assert.match(client, /clearTimeout/);
  assert.match(css, /\.voice-heart-button/);
  assert.match(css, /\.voice-heart-radiance/);
  assert.match(css, /(?:-webkit-)?mask:url\("data:image\/svg\+xml/);
  assert.match(css, /heart-listening-radiance/);
  assert.doesNotMatch(css, /\.voice-orb|\.orb-dot/);
});

test("client extraction, approval, edit, and tracker guards stay wired", async () => {
  const [client, css] = await Promise.all([
    readFile(new URL("../app/our-place-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(client, /fetch\("\/api\/extract"[\s\S]{0,320}body: JSON\.stringify\(\{ answers \}\)/);
  assert.match(client, /setView\("complete"\); void loadExtraction\(answers\)/);
  assert.match(client, /onApprove=\{setApprovedExtraction\}/);
  assert.match(client, /view === "family" && approvedExtraction/);
  assert.match(client, /view === "family" && approvedExtraction && <Family extraction=\{approvedExtraction\}/);
  assert.match(client, /view === "memories" && approvedExtraction && <Memories extraction=\{approvedExtraction\}/);
  assert.match(client, /\{approved && <>[\s\S]{0,420}demo-family-link/);

  const goBody = functionBody(client, "go");
  assert.match(goBody, /nextView === "family"/);
  assert.match(goBody, /nextView === "memories"/);
  assert.match(goBody, /!approvedExtraction\) return/);

  const editBody = functionBody(client, "editUpdate");
  assert.match(editBody, /setExtraction\(null\)/);
  assert.match(editBody, /setApprovedExtraction\(null\)/);
  assert.match(editBody, /setView\("checkin"\)/);
  assert.doesNotMatch(editBody, /setAnswers/);

  assert.doesNotMatch(client, /weekly-details|Four check-ins this week|This week’s check-in rhythm|felt lighter|felt close/i);
  assert.doesNotMatch(css, /weekly-details|\.week(?:\s|\{|\.)|rhythm-card/i);
  assert.doesNotMatch(client, /Sarah is bringing milk tomorrow/i);
  assert.match(client, /Our Place has not contacted or dispatched anyone for you/);
});

test("approval preview covers every shareable item field before approval", async () => {
  const client = await readFile(new URL("../app/our-place-app.tsx", import.meta.url), "utf8");
  const previewStart = client.indexOf('<section className="approval-items"');
  const previewEnd = client.indexOf("</section>", previewStart);
  const approvalAction = client.indexOf("Yes, this feels true to me", previewStart);

  assert.notEqual(previewStart, -1, "missing complete approval item preview");
  assert.notEqual(previewEnd, -1, "approval item preview is not closed");
  assert.ok(previewStart < approvalAction, "approval items must appear before the approval action");

  const preview = client.slice(previewStart, previewEnd);
  assert.match(preview, /aria-labelledby="approval-items-heading"/);
  assert.match(preview, /extraction\.items\.map/);
  assert.match(preview, /EXTRACTION_KIND_LABELS\[item\.kind\]/);
  assert.match(preview, /item\.title/);
  assert.match(preview, /item\.detail/);
  assert.match(preview, /item\.source_quote/);

  for (const label of ["Life update", "Memory", "Request", "Possible concern"]) {
    assert.match(client, new RegExp(label));
  }
});

test("Stories uses only approved current-extraction memories and has a calm empty state", async () => {
  const client = await readFile(new URL("../app/our-place-app.tsx", import.meta.url), "utf8");
  const memoriesStart = client.indexOf("function Memories(");
  const memoriesEnd = client.indexOf("function Invitation(", memoriesStart);
  const memories = client.slice(memoriesStart, memoriesEnd);

  assert.match(client, /view === "memories" && approvedExtraction && <Memories extraction=\{approvedExtraction\}/);
  assert.match(memories, /extraction\.items\.filter\(\(item\) => item\.kind === "memory"\)/);
  assert.match(memories, /<strong>\{currentMemories\.length\}<\/strong>/);
  assert.match(memories, /No stories were shared today/);
  assert.match(memories, /currentMemories\.length > 0/);
  assert.doesNotMatch(memories, /archive|historical/i);
  assert.doesNotMatch(client, /const entries\s*=/);
  assert.doesNotMatch(client, /Saturday pancakes|Meeting Frank|church picnic|extra blueberries/);
});

test("active schema and judge-facing docs stay free of progress internals and the legacy hostname", async () => {
  const [schema, boundary, architecture, submission, narration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/PRODUCT_BOUNDARY.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/SUBMISSION.md", import.meta.url), "utf8"),
    readFile(new URL("../demo/narration.txt", import.meta.url), "utf8"),
  ]);
  const extractedItems = schema.slice(schema.indexOf("export const extractedItems"), schema.indexOf("export const familyReplies"));
  const commitments = schema.slice(schema.indexOf("export const commitments"));

  assert.doesNotMatch(extractedItems, /\bstatus\s*:/);
  assert.doesNotMatch(extractedItems, /open|done|archived/);
  assert.doesNotMatch(commitments, /\bstatus\s*:/);
  assert.doesNotMatch(commitments, /completedAt|completed_at|claimed|completed|cancelled/);
  assert.match(boundary, /no workflow status or completion timestamps/i);
  assert.match(architecture, /no open\/done\/archive workflow or completion timestamps/i);
  assert.doesNotMatch(architecture, /request completion|complete request/i);
  assert.match(submission, /Sites project retains a historical private hostname/i);
  assert.match(submission, /must use an Our Place-branded custom URL before judging/i);
  assert.doesNotMatch(submission, /still-here-family-checkin|https?:\/\/[^\s`]*chatgpt\.site/i);
  for (const copy of [submission, narration]) {
    assert.match(copy, /only an approved memory from this check-in appears in Stories/i);
    assert.doesNotMatch(copy, /Evelyn[^.\n]*\b(?:remove|delete)\b/i);
  }
});

test("forward migration removes only the legacy progress columns", async () => {
  const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  const forwardEntry = journal.entries.at(-1);

  assert.equal(forwardEntry.idx, 2);
  assert.equal(forwardEntry.tag, "0002_bent_malice");

  const [migration, before, after] = await Promise.all([
    readFile(new URL(`../drizzle/${forwardEntry.tag}.sql`, import.meta.url), "utf8"),
    readFile(new URL("../drizzle/meta/0001_snapshot.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../drizzle/meta/0002_snapshot.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const statements = migration.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);

  assert.deepEqual(statements, [
    "ALTER TABLE `commitments` DROP COLUMN `status`;",
    "ALTER TABLE `commitments` DROP COLUMN `completed_at`;",
    "ALTER TABLE `extracted_items` DROP COLUMN `status`;",
  ]);
  assert.equal(after.prevId, before.id);
  assert.deepEqual(Object.keys(after.tables).sort(), Object.keys(before.tables).sort());

  const removedColumns = {
    commitments: ["status", "completed_at"],
    extracted_items: ["status"],
  };
  for (const [tableName, beforeTable] of Object.entries(before.tables)) {
    const afterTable = after.tables[tableName];
    const removed = removedColumns[tableName] ?? [];
    assert.deepEqual(
      Object.keys(afterTable.columns),
      Object.keys(beforeTable.columns).filter((column) => !removed.includes(column)),
      tableName,
    );
    assert.deepEqual(afterTable.foreignKeys, beforeTable.foreignKeys, tableName);
  }
});

test("keeps the active product free of legacy identity and chore-domain internals", async () => {
  const [appSources, dbSources, packageJson, packageLock] = await Promise.all([
    readSourceTree(new URL("../app/", import.meta.url)),
    readSourceTree(new URL("../db/", import.meta.url)),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  ]);
  const activeSources = [
    ...appSources,
    ...dbSources,
    { path: "package.json", source: packageJson },
    { path: "package-lock.json", source: packageLock },
  ];
  const corpus = activeSources.map(({ path, source }) => `${path}\n${source}`).join("\n");
  const legacyStem = ["still", "here"].join("-");
  const legacyIdentifiers = [
    ["Still", "Here", "App"].join(""),
    `${legacyStem}-app`,
    `${legacyStem}-family-mark`,
  ];

  for (const identifier of legacyIdentifiers) {
    assert.equal(corpus.includes(identifier), false, `active product still contains ${identifier}`);
  }

  const forbiddenDomainPatterns = [
    [/\/api\/tasks(?:\/|\b)/i, "tasks route"],
    [/sqliteTable\(\s*["'`]tasks["'`]/i, "tasks table"],
    [/(?:\b(?:category|categories|kinds?)\b[\s\S]{0,240}\b(?:chores?|grocer(?:y|ies)|errands?)\b|\b(?:chores?|grocer(?:y|ies)|errands?)\b[\s\S]{0,240}\b(?:category|categories|kinds?)\b)/i, "chore category model"],
    [/sqliteTable\(\s*["'`](?:rooms|progress|assignments|wardrobe)["'`]/i, "excluded domain table"],
    [/\/api\/(?:rooms|progress|assignments|wardrobe)(?:\/|\b)/i, "excluded domain route"],
    [/\b(?:interface|type|class|enum)\s+[A-Za-z0-9_$]*(?:Room|Rooms|Assignment|Assignments|Wardrobe|Progress)(?:Model|State|Tracker|Tracking|Record|Schema)?\b/, "excluded domain type"],
    [/\b(?:const|let|var)\s+[A-Za-z0-9_$]*(?:room|rooms|assignment|assignments|wardrobe|progress)(?:Model|State|Tracker|Tracking|Record|Schema)?\s*=/i, "excluded domain state"],
    [/\[\s*(?:rooms?|assignments?|wardrobe|progress)\s*,\s*set[A-Z]/i, "excluded domain state hook"],
    [/[,{]\s*[A-Za-z0-9_$]*(?:room|rooms|assignment|assignments|wardrobe|progress)(?:Model|State|Tracker|Tracking|Record|Schema)?\s*:/i, "excluded domain property"],
    [/\b[A-Za-z0-9_$]*(?:Room|Rooms|Assignment|Assignments|Wardrobe|Progress)(?:Model|State|Tracker|Tracking|Record|Schema)\b/, "excluded domain model"],
  ];

  const excludedModelExamples = [
    'const categories = ["chore", "grocery"]',
    "interface HouseholdRoomModel {}",
    "const familyAssignments = []",
    "const board = { rooms: [] }",
    "const [progress, setProgress] = useState({})",
    "type MemberWardrobeState = {}",
  ];

  for (const example of excludedModelExamples) {
    assert.equal(
      forbiddenDomainPatterns.some(([pattern]) => pattern.test(example)),
      true,
      `contamination guard does not reject: ${example}`,
    );
  }

  for (const [pattern, label] of forbiddenDomainPatterns) {
    assert.doesNotMatch(corpus, pattern, `active product contains an excluded ${label}`);
  }

  assert.equal(JSON.parse(packageJson).name, "our-place-family-connection");
  assert.equal(JSON.parse(packageLock).name, "our-place-family-connection");

  await Promise.all([
    access(new URL("../public/our-place-family-mark.png", import.meta.url)),
    access(new URL("../public/our-place-family-world.webp", import.meta.url)),
    access(new URL("../public/our-place-family-mark-original.png", import.meta.url)),
    access(new URL(`../demo/legacy-assets/${legacyStem}-social-card.png`, import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    assert.rejects(access(new URL(`../app/${legacyStem}-app.tsx`, import.meta.url))),
    assert.rejects(access(new URL(`../public/${legacyStem}-family-mark.png`, import.meta.url))),
    assert.rejects(access(new URL(`../public/${legacyStem}-family-mark-original.png`, import.meta.url))),
  ]);
});
