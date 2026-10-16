"use strict";

const JOBS_KEY = "smarthire.jobs";
const CANDIDATES_KEY = "smarthire.candidates";
const STAGES = ["New", "Review", "Interview", "Offer", "Hired"];
const LEVELS = ["Intern", "Junior", "Mid-level", "Senior", "Lead"];

const LEVEL_BANDS = {
  Intern: { min: 0, max: 1, label: "0-1 years" },
  Junior: { min: 0, max: 2, label: "0-2 years" },
  "Mid-level": { min: 3, max: 5, label: "3-5 years" },
  Senior: { min: 6, max: 9, label: "6-9 years" },
  Lead: { min: 10, max: Infinity, label: "10 or more years" }
};

const LEVEL_QUESTIONS = {
  Intern: "What do you want to learn in this internship, and what kind of support helps you do your best work?",
  Junior: "Describe a task you owned with some guidance. What did you do when you were unsure how to proceed?",
  "Mid-level": "Describe a piece of work you carried from a request through delivery. How did you decide what to leave out?",
  Senior: "Tell us about a time you helped a teammate improve their work, or changed how the team did something. What tradeoff did you make?",
  Lead: "How have you chosen priorities for a group when two stakeholders wanted different outcomes?"
};

const PAGE_META = {
  dashboard: ["Dashboard", "Job totals, candidate totals, and how many people are in each stage."],
  jobs: ["Jobs", "Create, search, edit, and delete roles. Saved in this browser only."],
  candidates: ["Candidates", "Fictional profiles only. Search and filter the people you add."],
  matching: ["Matching", "Compare one job's required skills with one profile's listed skills."],
  insights: ["Insights", "Interview questions and clarification prompts from saved text. A person leads the interview."],
  pipeline: ["Hiring Pipeline", "Move a candidate between New, Review, Interview, Offer, and Hired."]
};

const SEED_JOBS = [
  {
    id: "job_frontend",
    title: "Frontend Engineer",
    department: "Engineering",
    description: "Build and maintain the customer web app. Collaborate with design on accessible interfaces, review pull requests, and improve how fast key pages load. The squad has six people, including one other frontend developer.",
    skills: ["React", "TypeScript", "CSS", "Accessibility"],
    experienceLevel: "Mid-level",
    createdAt: "2026-10-08T15:00:00.000Z"
  },
  {
    id: "job_analyst",
    title: "Data Analyst",
    department: "Analytics",
    description: "Prepare weekly operations reports, clean exported tables, and explain trends in plain language. You will share a dashboard with two other analysts and take questions from the operations team.",
    skills: ["SQL", "Python", "Tableau", "Excel"],
    experienceLevel: "Junior",
    createdAt: "2026-10-10T15:00:00.000Z"
  },
  {
    id: "job_pm",
    title: "Product Manager",
    department: "Product",
    description: "Own the roadmap for a fictional hiring portal. Write the problem statement for each release, set priorities with engineering and support, and define what done means before work starts.",
    skills: ["Roadmapping", "Stakeholder management", "Agile", "SQL"],
    experienceLevel: "Senior",
    createdAt: "2026-10-14T15:00:00.000Z"
  }
];

const SEED_CANDIDATES = [
  {
    id: "cand_alex",
    name: "Alex Rivera",
    experience: 4,
    education: "B.S. Computer Science",
    skills: ["React", "TypeScript", "css", "Git"],
    status: "Interview",
    createdAt: "2026-10-09T15:00:00.000Z"
  },
  {
    id: "cand_jordan",
    name: "Jordan Lee",
    experience: 1,
    education: "B.A. Economics",
    skills: ["Excel", "SQL", "PowerPoint"],
    status: "New",
    createdAt: "2026-10-05T15:00:00.000Z"
  },
  {
    id: "cand_sam",
    name: "Sam Patel",
    experience: 7,
    education: "M.S. Information Systems",
    skills: ["Python", "sql", "Tableau", "stakeholder management", "Agile"],
    status: "Review",
    createdAt: "2026-10-07T15:00:00.000Z"
  },
  {
    id: "cand_morgan",
    name: "Morgan Chen",
    experience: 6,
    education: "B.S. Design",
    skills: ["Figma", "CSS", "Accessibility", "React"],
    status: "Offer",
    createdAt: "2026-10-11T15:00:00.000Z"
  },
  {
    id: "cand_riley",
    name: "Riley Nguyen",
    experience: 2,
    education: "B.S. Statistics",
    skills: ["Python", "SQL", "Excel", "Tableau"],
    status: "Hired",
    createdAt: "2026-10-13T15:00:00.000Z"
  },
  {
    id: "cand_taylor",
    name: "Taylor Brooks",
    experience: 2,
    education: "B.A. Communications",
    skills: ["Writing", "Research", "Excel"],
    status: "New",
    createdAt: "2026-10-15T15:00:00.000Z"
  }
];

let jobs = [];
let candidates = [];
const state = {
  page: "dashboard",
  editingJobId: null,
  editingCandidateId: null
};

let toastTimer = 0;

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseSkills(text) {
  const seen = new Set();
  const skills = [];
  String(text).split(",").forEach((part) => {
    const clean = part.trim().replace(/\s+/g, " ");
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    skills.push(clean);
  });
  return skills;
}

function normalizeSkill(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function readArray(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAll() {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates));
    return true;
  } catch (error) {
    toast("Could not save in this browser. Storage may be full or blocked.");
    return false;
  }
}

function cloneSeed() {
  return {
    jobs: JSON.parse(JSON.stringify(SEED_JOBS)),
    candidates: JSON.parse(JSON.stringify(SEED_CANDIDATES))
  };
}

function normalizeJob(job) {
  const level = LEVELS.includes(job.experienceLevel) ? job.experienceLevel : "Mid-level";
  return {
    id: job.id ? String(job.id) : uid("job"),
    title: String(job.title || "Untitled role").trim(),
    department: String(job.department || "General").trim(),
    description: String(job.description || "").trim(),
    skills: Array.isArray(job.skills) ? parseSkills(job.skills.join(", ")) : [],
    experienceLevel: level,
    createdAt: job.createdAt || new Date().toISOString()
  };
}

function normalizeCandidate(candidate) {
  let years = Number(candidate.experience);
  if (!Number.isFinite(years) || years < 0) years = 0;
  years = Math.min(60, Math.round(years));
  const status = STAGES.includes(candidate.status) ? candidate.status : "New";
  return {
    id: candidate.id ? String(candidate.id) : uid("cand"),
    name: String(candidate.name || "Unnamed candidate").trim(),
    experience: years,
    education: String(candidate.education || "").trim(),
    skills: Array.isArray(candidate.skills) ? parseSkills(candidate.skills.join(", ")) : [],
    status,
    createdAt: candidate.createdAt || new Date().toISOString()
  };
}

function load() {
  try {
    const storedJobs = readArray(JOBS_KEY);
    const storedCandidates = readArray(CANDIDATES_KEY);
    if (storedJobs === null && storedCandidates === null) {
      const seed = cloneSeed();
      jobs = seed.jobs.map(normalizeJob);
      candidates = seed.candidates.map(normalizeCandidate);
      saveAll();
      return;
    }
    jobs = (storedJobs || []).map(normalizeJob);
    candidates = (storedCandidates || []).map(normalizeCandidate);
  } catch (error) {
    const seed = cloneSeed();
    jobs = seed.jobs;
    candidates = seed.candidates;
    toast("Browser storage is unavailable. Data will last until you close this tab.");
  }
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function byNewest(a, b) {
  return String(b.createdAt).localeCompare(String(a.createdAt));
}

function yearLabel(years) {
  return `${years} ${Number(years) === 1 ? "year" : "years"}`;
}

function stageClass(status) {
  return `stage-${String(status).toLowerCase()}`;
}

function chipsHtml(skills, extraClass) {
  if (!skills.length) return `<p class="hint">None</p>`;
  const className = extraClass ? `chip ${extraClass}` : "chip";
  return `<div class="chips">${skills.map((skill) => `<span class="${className}">${escapeHtml(skill)}</span>`).join("")}</div>`;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove("show"), 2600);
}

function setNavOpen(open) {
  document.body.classList.toggle("nav-open", open);
  const toggle = $("#nav-toggle");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function showPage(page) {
  if (!PAGE_META[page]) return;
  state.page = page;
  document.querySelectorAll(".view").forEach((view) => {
    const active = view.id === `view-${page}`;
    view.classList.toggle("active", active);
    view.hidden = !active;
  });
  document.querySelectorAll(".nav-link").forEach((button) => {
    const active = button.dataset.nav === page;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const [title, subtitle] = PAGE_META[page];
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = subtitle;
  document.title = `${title} · SmartHire AI`;
  setNavOpen(false);
}

function updateNavCounts() {
  $("#nav-job-count").textContent = String(jobs.length);
  $("#nav-candidate-count").textContent = String(candidates.length);
}

function renderDashboard() {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
  candidates.forEach((candidate) => {
    counts[candidate.status] += 1;
  });
  $("#count-jobs").textContent = String(jobs.length);
  $("#count-candidates").textContent = String(candidates.length);
  STAGES.forEach((stage) => {
    $(`#count-stage-${stage.toLowerCase()}`).textContent = String(counts[stage]);
  });

  const latestJobs = [...jobs].sort(byNewest).slice(0, 4);
  $("#recent-jobs").innerHTML = latestJobs.length
    ? latestJobs.map((job) => `
        <div class="recent-row">
          <strong>${escapeHtml(job.title)}</strong>
          <span>${escapeHtml(job.department)} · ${escapeHtml(job.experienceLevel)}</span>
        </div>
      `).join("")
    : `<p class="hint">No jobs saved yet.</p>`;

  const latestCandidates = [...candidates].sort(byNewest).slice(0, 4);
  $("#recent-candidates").innerHTML = latestCandidates.length
    ? latestCandidates.map((candidate) => `
        <div class="recent-row">
          <strong>${escapeHtml(candidate.name)}</strong>
          <span>${escapeHtml(candidate.status)} · ${escapeHtml(yearLabel(candidate.experience))}</span>
        </div>
      `).join("")
    : `<p class="hint">No candidates saved yet.</p>`;
}

function filteredJobs() {
  const query = $("#job-search").value.trim().toLowerCase();
  return [...jobs]
    .filter((job) => {
      if (!query) return true;
      const haystack = [job.title, job.department, job.description, job.experienceLevel, job.skills.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort(byNewest);
}

function jobCard(job) {
  const editing = job.id === state.editingJobId ? " is-editing" : "";
  return `
    <article class="item${editing}">
      <h3>${escapeHtml(job.title)}</h3>
      <p class="meta">
        <span>${escapeHtml(job.department)}</span>
        <span class="pill">${escapeHtml(job.experienceLevel)}</span>
        <span>${escapeHtml(formatDate(job.createdAt))}</span>
      </p>
      <p class="desc">${escapeHtml(job.description)}</p>
      ${chipsHtml(job.skills)}
      <div class="card-actions">
        <button type="button" class="btn btn-ghost btn-small" data-edit-job="${escapeHtml(job.id)}" aria-label="Edit ${escapeHtml(job.title)}">Edit</button>
        <button type="button" class="btn btn-danger btn-small" data-delete-job="${escapeHtml(job.id)}" aria-label="Delete ${escapeHtml(job.title)}">Delete</button>
      </div>
    </article>
  `;
}

function renderJobList() {
  const query = $("#job-search").value.trim();
  const list = filteredJobs();
  $("#job-count").textContent = query
    ? `Showing ${list.length} of ${jobs.length}`
    : `${jobs.length} job${jobs.length === 1 ? "" : "s"}`;
  if (!list.length) {
    const message = jobs.length
      ? "No jobs match that search."
      : "No jobs yet. Use the form to add a fictional role.";
    $("#job-list").innerHTML = `<div class="empty"><h3>No jobs to show</h3><p>${message}</p></div>`;
    return;
  }
  $("#job-list").innerHTML = list.map(jobCard).join("");
}

function filteredCandidates() {
  const query = $("#candidate-search").value.trim().toLowerCase();
  const status = $("#candidate-status-filter").value;
  return [...candidates]
    .filter((candidate) => {
      if (status !== "all" && candidate.status !== status) return false;
      if (!query) return true;
      const haystack = [candidate.name, candidate.education, candidate.status, String(candidate.experience), candidate.skills.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort(byNewest);
}

function candidateCard(candidate) {
  const editing = candidate.id === state.editingCandidateId ? " is-editing" : "";
  return `
    <article class="item${editing}">
      <h3>${escapeHtml(candidate.name)}</h3>
      <p class="meta">
        <span class="pill ${stageClass(candidate.status)}">${escapeHtml(candidate.status)}</span>
        <span>${escapeHtml(yearLabel(candidate.experience))}</span>
        <span>${escapeHtml(candidate.education)}</span>
      </p>
      ${chipsHtml(candidate.skills)}
      <div class="card-actions">
        <button type="button" class="btn btn-ghost btn-small" data-edit-candidate="${escapeHtml(candidate.id)}" aria-label="Edit ${escapeHtml(candidate.name)}">Edit</button>
        <button type="button" class="btn btn-danger btn-small" data-delete-candidate="${escapeHtml(candidate.id)}" aria-label="Delete ${escapeHtml(candidate.name)}">Delete</button>
      </div>
    </article>
  `;
}

function renderCandidateList() {
  const query = $("#candidate-search").value.trim();
  const status = $("#candidate-status-filter").value;
  const list = filteredCandidates();
  const filtered = query || status !== "all";
  $("#candidate-count").textContent = filtered
    ? `Showing ${list.length} of ${candidates.length}`
    : `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`;
  if (!list.length) {
    const message = candidates.length
      ? "No candidates match that search or filter."
      : "No candidates yet. Use the form to add a fictional profile.";
    $("#candidate-list").innerHTML = `<div class="empty"><h3>No candidates to show</h3><p>${message}</p></div>`;
    return;
  }
  $("#candidate-list").innerHTML = list.map(candidateCard).join("");
}

function personCard(candidate) {
  const id = escapeHtml(candidate.id);
  const options = STAGES.map((stage) => {
    const selected = stage === candidate.status ? " selected" : "";
    return `<option value="${stage}"${selected}>${stage}</option>`;
  }).join("");
  return `
    <article class="person">
      <strong>${escapeHtml(candidate.name)}</strong>
      <p>${escapeHtml(yearLabel(candidate.experience))} · ${escapeHtml(candidate.education)}</p>
      ${chipsHtml(candidate.skills)}
      <label class="sr-only" for="pipeline-${id}">Status for ${escapeHtml(candidate.name)}</label>
      <select id="pipeline-${id}" data-status-for="${id}">${options}</select>
    </article>
  `;
}

function renderPipeline() {
  $("#pipeline-board").innerHTML = STAGES.map((stage) => {
    const people = candidates
      .filter((candidate) => candidate.status === stage)
      .sort((a, b) => a.name.localeCompare(b.name));
    const cards = people.length
      ? people.map(personCard).join("")
      : `<p class="hint column-empty">No one in ${escapeHtml(stage)}</p>`;
    return `
      <section class="column" aria-label="${escapeHtml(stage)}">
        <div class="column-head">
          <span><i class="dot ${stageClass(stage)}"></i>${escapeHtml(stage)}</span>
          <span class="bubble">${people.length}</span>
        </div>
        ${cards}
      </section>
    `;
  }).join("");
}

function fillSelect(select, items, placeholder, labelFor) {
  const current = select.value;
  const options = [`<option value="">${escapeHtml(placeholder)}</option>`];
  items.forEach((item) => {
    options.push(`<option value="${escapeHtml(item.id)}">${escapeHtml(labelFor(item))}</option>`);
  });
  select.innerHTML = options.join("");
  select.value = items.some((item) => item.id === current) ? current : "";
}

function refreshPickers() {
  const jobOptions = [...jobs].sort((a, b) => a.title.localeCompare(b.title));
  const candidateOptions = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
  const jobLabel = (job) => `${job.title} · ${job.department}`;
  const candidateLabel = (candidate) => `${candidate.name} · ${candidate.status}`;
  fillSelect($("#match-job"), jobOptions, "Select a job", jobLabel);
  fillSelect($("#match-candidate"), candidateOptions, "Select a candidate", candidateLabel);
  fillSelect($("#insight-job"), jobOptions, "Select a job", jobLabel);
  fillSelect($("#insight-candidate"), candidateOptions, "Optional: select a candidate", candidateLabel);
}

// Listed-skill overlap only. Case-insensitive exact text. A person makes the hiring decision.
function compareSkills(job, candidate) {
  const candidateMap = new Map();
  candidate.skills.forEach((skill) => {
    candidateMap.set(normalizeSkill(skill), skill);
  });
  const matching = [];
  const missing = [];
  job.skills.forEach((skill) => {
    if (candidateMap.has(normalizeSkill(skill))) matching.push(skill);
    else missing.push(skill);
  });
  const requiredKeys = new Set(job.skills.map(normalizeSkill));
  const extras = candidate.skills.filter((skill) => !requiredKeys.has(normalizeSkill(skill)));
  const requiredCount = job.skills.length;
  const percent = requiredCount === 0 ? null : Math.round((matching.length / requiredCount) * 100);
  return { matching, missing, extras, percent, requiredCount };
}

function skillCountSentence(found, total) {
  const verb = found === 1 ? "is" : "are";
  const noun = total === 1 ? "skill" : "skills";
  return `${found} of ${total} required ${noun} ${verb} listed on the profile`;
}

function renderMatch() {
  const result = $("#match-result");
  const job = jobs.find((item) => item.id === $("#match-job").value);
  const candidate = candidates.find((item) => item.id === $("#match-candidate").value);
  if (!job || !candidate) {
    result.innerHTML = `
      <div class="empty">
        <h3>Choose both records</h3>
        <p>Select a job and a candidate. The percentage uses only the skills saved on those two records.</p>
      </div>
    `;
    return;
  }

  const comparison = compareSkills(job, candidate);
  let scoreBlock;
  if (comparison.percent === null) {
    scoreBlock = `
      <p class="match-score">—</p>
      <p class="match-math">This job has no required skills, so the percentage stays blank. Add skills on the Jobs page to run the formula.</p>
    `;
  } else {
    const exact = (comparison.matching.length / comparison.requiredCount) * 100;
    const exactText = Number.isInteger(exact) ? String(exact) : exact.toFixed(2);
    const rounding = Number.isInteger(exact)
      ? `${exactText}`
      : `${exactText}, rounded to the nearest whole number: ${comparison.percent}`;
    scoreBlock = `
      <p class="match-score">${comparison.percent}%</p>
      <p class="match-math">${skillCountSentence(comparison.matching.length, comparison.requiredCount)}. ${comparison.matching.length} / ${comparison.requiredCount} x 100 = ${rounding}.</p>
    `;
  }

  result.innerHTML = `
    <article class="panel">
      <p class="pair">${escapeHtml(job.title)} and ${escapeHtml(candidate.name)}</p>
      <p class="hint">Listed-skill overlap</p>
      ${scoreBlock}
      <p class="match-math">A person makes every hiring decision. This count checks saved skill text and leaves judgment to the reader.</p>
      <div class="match-block">
        <h3>Matching skills (${comparison.matching.length})</h3>
        ${chipsHtml(comparison.matching)}
      </div>
      <div class="match-block">
        <h3>Not confirmed on the profile (${comparison.missing.length})</h3>
        <p class="hint">These required skills were not found in the saved skill list.</p>
        ${chipsHtml(comparison.missing, "missing")}
      </div>
      <div class="match-block">
        <h3>Other skills on the profile (${comparison.extras.length})</h3>
        <p class="hint">These listed skills sit outside the job requirements, so they leave the percentage unchanged.</p>
        ${chipsHtml(comparison.extras, "extra")}
      </div>
    </article>
  `;
}

function experienceBandNote(job, candidate) {
  const band = LEVEL_BANDS[job.experienceLevel];
  if (!band) return null;
  const years = Number(candidate.experience);
  if (!Number.isFinite(years)) return null;
  if (years >= band.min && years <= band.max) return null;
  return `${job.title} is marked ${job.experienceLevel}. This prototype maps that label to ${band.label} only to suggest a question. ${candidate.name} lists ${yearLabel(years)}. Ask them to describe the scope of that experience. A person decides whether the experience fits the role.`;
}

function buildInsights(job, candidate) {
  const questions = [];
  questions.push(`The ${job.title} role is in ${job.department}. Based on the saved description, how would you spend your first 30 days?`);
  job.skills.forEach((skill) => {
    questions.push(`${job.title} lists ${skill} as a requirement. Describe a specific time you used it: your role, the constraints, and the outcome.`);
  });
  if (LEVEL_QUESTIONS[job.experienceLevel]) {
    questions.push(`This role is marked ${job.experienceLevel}. ${LEVEL_QUESTIONS[job.experienceLevel]}`);
  }

  const clarifications = [];
  if (job.description.trim().length < 80) {
    clarifications.push(`The description for ${job.title} is under 80 characters. Before the interview, clarify responsibilities, team size, and how success will be measured.`);
  }

  if (candidate) {
    const comparison = compareSkills(job, candidate);
    comparison.missing.forEach((skill) => {
      questions.push(`${candidate.name}'s profile does not list ${skill}, which ${job.title} requires. Ask whether they have hands-on experience and at what depth. A missing word means the skill was not saved on the profile.`);
      clarifications.push(`${skill} is required for ${job.title} and is absent from ${candidate.name}'s saved skills. Confirm it in conversation, or update the fictional profile if it belongs there.`);
    });
    const bandNote = experienceBandNote(job, candidate);
    if (bandNote) clarifications.push(bandNote);
    if (comparison.missing.length === 0 && !bandNote && job.description.trim().length >= 80) {
      clarifications.push(`No clarification flags for this pair under the current rules. ${candidate.name}'s profile lists every required skill, the description is at least 80 characters, and the listed years sit inside the ${job.experienceLevel} range.`);
    }
  } else if (clarifications.length === 0) {
    clarifications.push("No job-side clarification flags. Select a candidate to list required skills that are missing from a profile.");
  }

  return { questions, clarifications };
}

function renderInsights() {
  const result = $("#insight-result");
  const job = jobs.find((item) => item.id === $("#insight-job").value);
  const candidate = candidates.find((item) => item.id === $("#insight-candidate").value) || null;
  if (!job) {
    result.innerHTML = `
      <div class="empty">
        <h3>Choose a job</h3>
        <p>Questions are built from that job's saved title, description, skills, and experience level.</p>
      </div>
    `;
    return;
  }

  const insight = buildInsights(job, candidate);
  const questions = insight.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("");
  const clarifications = insight.clarifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const profile = candidate
    ? `<p><strong>${escapeHtml(candidate.name)}</strong> · ${escapeHtml(yearLabel(candidate.experience))} · ${escapeHtml(candidate.education)} · ${escapeHtml(candidate.status)}</p>${chipsHtml(candidate.skills)}`
    : `<p>No candidate selected. Skill-gap questions appear after you choose a profile.</p>`;

  result.innerHTML = `
    <div class="split">
      <section class="panel">
        <h2>Interview questions</h2>
        <ol class="question-list">${questions}</ol>
      </section>
      <section class="panel">
        <h2>Details to clarify</h2>
        <ul class="clarify-list">${clarifications}</ul>
      </section>
    </div>
    <section class="panel source">
      <h3>Saved text these prompts use</h3>
      <p><strong>${escapeHtml(job.title)}</strong> · ${escapeHtml(job.department)} · ${escapeHtml(job.experienceLevel)}</p>
      <p>${escapeHtml(job.description)}</p>
      ${chipsHtml(job.skills)}
      ${profile}
    </section>
  `;
}

function onDataChanged() {
  saveAll();
  updateNavCounts();
  renderDashboard();
  renderJobList();
  renderCandidateList();
  renderPipeline();
  refreshPickers();
  renderMatch();
  renderInsights();
}

function resetJobForm() {
  $("#job-form").reset();
  $("#job-form-error").textContent = "";
  state.editingJobId = null;
  $("#job-form-heading").textContent = "Add a job";
  $("#job-submit").textContent = "Save job";
  $("#job-cancel").hidden = true;
}

function resetCandidateForm() {
  $("#candidate-form").reset();
  $("#candidate-form-error").textContent = "";
  state.editingCandidateId = null;
  $("#candidate-form-heading").textContent = "Add a candidate";
  $("#candidate-submit").textContent = "Save candidate";
  $("#candidate-cancel").hidden = true;
}

function readJobForm() {
  const title = $("#job-title").value.trim();
  const department = $("#job-department").value.trim();
  const description = $("#job-description").value.trim();
  const skills = parseSkills($("#job-skills").value);
  const experienceLevel = $("#job-level").value;
  const error = $("#job-form-error");
  if (!title || !department || !description || !LEVELS.includes(experienceLevel)) {
    error.textContent = "Fill in title, department, description, and experience level.";
    return null;
  }
  if (!skills.length) {
    error.textContent = "Enter at least one required skill, separated by commas.";
    $("#job-skills").focus();
    return null;
  }
  error.textContent = "";
  return { title, department, description, skills, experienceLevel };
}

function readCandidateForm() {
  const name = $("#candidate-name").value.trim();
  const experience = $("#candidate-experience").valueAsNumber;
  const education = $("#candidate-education").value.trim();
  const skills = parseSkills($("#candidate-skills").value);
  const status = $("#candidate-status").value;
  const error = $("#candidate-form-error");
  if (!name || !education || !STAGES.includes(status)) {
    error.textContent = "Fill in name, education, and status.";
    return null;
  }
  if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
    error.textContent = "Enter experience as a whole number of years from 0 to 60.";
    $("#candidate-experience").focus();
    return null;
  }
  if (!skills.length) {
    error.textContent = "Enter at least one skill, separated by commas.";
    $("#candidate-skills").focus();
    return null;
  }
  error.textContent = "";
  return { name, experience, education, skills, status };
}

function startEditJob(id) {
  const job = jobs.find((item) => item.id === id);
  if (!job) return;
  $("#job-title").value = job.title;
  $("#job-department").value = job.department;
  $("#job-description").value = job.description;
  $("#job-skills").value = job.skills.join(", ");
  $("#job-level").value = job.experienceLevel;
  $("#job-form-error").textContent = "";
  state.editingJobId = job.id;
  $("#job-form-heading").textContent = "Edit job";
  $("#job-submit").textContent = "Save changes";
  $("#job-cancel").hidden = false;
  renderJobList();
  $("#job-form").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#job-title").focus();
}

function startEditCandidate(id) {
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) return;
  $("#candidate-name").value = candidate.name;
  $("#candidate-experience").value = String(candidate.experience);
  $("#candidate-education").value = candidate.education;
  $("#candidate-skills").value = candidate.skills.join(", ");
  $("#candidate-status").value = candidate.status;
  $("#candidate-form-error").textContent = "";
  state.editingCandidateId = candidate.id;
  $("#candidate-form-heading").textContent = "Edit candidate";
  $("#candidate-submit").textContent = "Save changes";
  $("#candidate-cancel").hidden = false;
  renderCandidateList();
  $("#candidate-form").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#candidate-name").focus();
}

function deleteJob(id) {
  const job = jobs.find((item) => item.id === id);
  if (!job) return;
  const confirmed = window.confirm(`Delete "${job.title}"? This removes it from this browser only.`);
  if (!confirmed) return;
  jobs = jobs.filter((item) => item.id !== id);
  if (state.editingJobId === id) resetJobForm();
  onDataChanged();
  toast("Job deleted");
}

function deleteCandidate(id) {
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) return;
  const confirmed = window.confirm(`Delete "${candidate.name}"? This removes the fictional profile from this browser only.`);
  if (!confirmed) return;
  candidates = candidates.filter((item) => item.id !== id);
  if (state.editingCandidateId === id) resetCandidateForm();
  onDataChanged();
  toast("Candidate deleted");
}

function bind() {
  document.addEventListener("click", (event) => {
    const editJobBtn = event.target.closest("[data-edit-job]");
    if (editJobBtn) {
      startEditJob(editJobBtn.dataset.editJob);
      return;
    }
    const deleteJobBtn = event.target.closest("[data-delete-job]");
    if (deleteJobBtn) {
      deleteJob(deleteJobBtn.dataset.deleteJob);
      return;
    }
    const editCandidateBtn = event.target.closest("[data-edit-candidate]");
    if (editCandidateBtn) {
      startEditCandidate(editCandidateBtn.dataset.editCandidate);
      return;
    }
    const deleteCandidateBtn = event.target.closest("[data-delete-candidate]");
    if (deleteCandidateBtn) {
      deleteCandidate(deleteCandidateBtn.dataset.deleteCandidate);
      return;
    }
    const nav = event.target.closest("[data-nav]");
    if (nav) showPage(nav.dataset.nav);
  });

  $("#nav-toggle").addEventListener("click", () => {
    setNavOpen(!document.body.classList.contains("nav-open"));
  });
  $("#nav-backdrop").addEventListener("click", () => setNavOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavOpen(false);
  });

  $("#job-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readJobForm();
    if (!data) return;
    if (state.editingJobId) {
      const index = jobs.findIndex((job) => job.id === state.editingJobId);
      if (index === -1) {
        jobs.push({ id: uid("job"), ...data, createdAt: new Date().toISOString() });
        toast("Job saved in this browser");
      } else {
        jobs[index] = { ...jobs[index], ...data };
        toast("Job updated");
      }
    } else {
      jobs.push({ id: uid("job"), ...data, createdAt: new Date().toISOString() });
      toast("Job saved in this browser");
    }
    resetJobForm();
    onDataChanged();
  });

  $("#candidate-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readCandidateForm();
    if (!data) return;
    if (state.editingCandidateId) {
      const index = candidates.findIndex((candidate) => candidate.id === state.editingCandidateId);
      if (index === -1) {
        candidates.push({ id: uid("cand"), ...data, createdAt: new Date().toISOString() });
        toast("Candidate saved in this browser");
      } else {
        candidates[index] = { ...candidates[index], ...data };
        toast("Candidate updated");
      }
    } else {
      candidates.push({ id: uid("cand"), ...data, createdAt: new Date().toISOString() });
      toast("Candidate saved in this browser");
    }
    resetCandidateForm();
    onDataChanged();
  });

  $("#job-cancel").addEventListener("click", () => {
    resetJobForm();
    renderJobList();
  });
  $("#candidate-cancel").addEventListener("click", () => {
    resetCandidateForm();
    renderCandidateList();
  });
  $("#job-search").addEventListener("input", renderJobList);
  $("#candidate-search").addEventListener("input", renderCandidateList);
  $("#candidate-status-filter").addEventListener("change", renderCandidateList);
  $("#match-job").addEventListener("change", renderMatch);
  $("#match-candidate").addEventListener("change", renderMatch);
  $("#insight-job").addEventListener("change", renderInsights);
  $("#insight-candidate").addEventListener("change", renderInsights);

  $("#pipeline-board").addEventListener("change", (event) => {
    const select = event.target.closest("[data-status-for]");
    if (!select) return;
    const candidate = candidates.find((item) => item.id === select.dataset.statusFor);
    if (!candidate || !STAGES.includes(select.value) || candidate.status === select.value) return;
    candidate.status = select.value;
    if (state.editingCandidateId === candidate.id) {
      $("#candidate-status").value = candidate.status;
    }
    onDataChanged();
    toast(`${candidate.name} moved to ${candidate.status}`);
    const next = document.querySelector(`[data-status-for="${CSS.escape(candidate.id)}"]`);
    if (next) next.focus();
  });

  $("#restore-sample").addEventListener("click", () => {
    const confirmed = window.confirm("Replace jobs and candidates in this browser with the fictional sample data?");
    if (!confirmed) return;
    const seed = cloneSeed();
    jobs = seed.jobs;
    candidates = seed.candidates;
    resetJobForm();
    resetCandidateForm();
    onDataChanged();
    toast("Fictional sample data restored");
  });
}

function init() {
  bind();
  load();
  onDataChanged();
  showPage("dashboard");
}

document.addEventListener("DOMContentLoaded", init);
