/* ===========================
   script.js — Quiz logic (updated)
   Fixed order (no random), 30 questions
   Important: renderQuestions uses DOM API and textContent to avoid HTML parsing
   =========================== */

const TOTAL_TIME = 1800; // 30 minutes
const STORAGE_KEY = 'webdev_quiz_last_score_v2';
let timeRemaining = TOTAL_TIME;
let timerInterval = null;
let quizStarted = false;
let quizSubmitted = false;
let userAnswers = {}; // key: question index (0-29) => selected option index
let currentFilter = 'all';

/* DOM refs */
const startBtn = document.getElementById('startBtn');
const themeToggle = document.getElementById('themeToggle');
const preStart = document.getElementById('preStart');
const quizArea = document.getElementById('quizArea');
const timerWrap = document.getElementById('timerWrap');
const timerEl = document.getElementById('timer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressBarWrap = document.getElementById('progressBarWrap');
const tabsWrap = document.getElementById('tabs');
const questionsContainer = document.getElementById('questionsContainer');
const quizForm = document.getElementById('quizForm');
const resultContainer = document.getElementById('resultContainer');
const scoreDisplay = document.getElementById('scoreDisplay');
const resultMessage = document.getElementById('resultMessage');
const htmlScoreEl = document.getElementById('htmlScore');
const cssScoreEl = document.getElementById('cssScore');
const jsScoreEl = document.getElementById('jsScore');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const clearScoreBtn = document.getElementById('clearScoreBtn');
const lastSavedEl = document.getElementById('lastSaved');

/* WebAudio basic beeps */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
function beep(freq=440, dur=0.06, type='sine'){
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.stop(audioCtx.currentTime + dur + 0.02);
}

/* Quiz data: fixed order (30 questions) */
const quizData = [
  /* 1-10 HTML */
  { question: "What does HTML stand for?", options: ["Hyper Text Markup Language","High Tech Modern Language","Home Tool Markup Language","Hyperlinks and Text Markup Language"], correct: 0, category: "html" },
  { question: "Which HTML tag is used to define an internal style sheet?", options: ["<css>","<script>","<style>","<link>"], correct: 2, category: "html" },
  { question: "Which HTML element is used to specify a footer for a document?", options: ["<bottom>","<footer>","<section>","<end>"], correct: 1, category: "html" },
  { question: "What is the correct HTML for creating a hyperlink?", options: ["<a url='http://example.com'>","<a href='http://example.com'>","<link src='http://example.com'>","<hyperlink url='http://example.com'>"], correct: 1, category: "html" },
  { question: "Which HTML attribute specifies an alternate text for an image?", options: ["title","src","alt","longdesc"], correct: 2, category: "html" },
  { question: "What is the correct HTML for making a checkbox?", options: ["<input type='check'>","<checkbox>","<input type='checkbox'>","<check>"], correct: 2, category: "html" },
  { question: "Which HTML element defines the title of a document?", options: ["<meta>","<title>","<head>","<header>"], correct: 1, category: "html" },
  { question: "What is the correct HTML for inserting an image?", options: ["<img src='image.jpg'>","<image src='image.jpg'>","<picture src='image.jpg'>","<img href='image.jpg'>"], correct: 0, category: "html" },
  { question: "Which HTML element is used to create an unordered list?", options: ["<ol>","<ul>","<list>","<li>"], correct: 1, category: "html" },
  { question: "What does the <br> tag do in HTML?", options: ["Creates a bold text","Inserts a line break","Creates a border","Defines a paragraph"], correct: 1, category: "html" },

  /* 11-20 CSS */
  { question: "What does CSS stand for?", options: ["Creative Style Sheets","Cascading Style Sheets","Computer Style Sheets","Colorful Style Sheets"], correct: 1, category: "css" },
  { question: "Which CSS property is used to change the text color?", options: ["text-color","font-color","color","text-style"], correct: 2, category: "css" },
  { question: "How do you select an element with id 'header' in CSS?", options: [".header","#header","*header","header"], correct: 1, category: "css" },
  { question: "Which CSS property controls the text size?", options: ["text-size","font-style","text-style","font-size"], correct: 3, category: "css" },
  { question: "How do you make text bold in CSS?", options: ["font-weight: bold;","text-style: bold;","font: bold;","text-weight: bold;"], correct: 0, category: "css" },
  { question: "Which CSS property is used to change the background color?", options: ["bgcolor","color","background-color","bg-color"], correct: 2, category: "css" },
  { question: "What is the correct CSS syntax to make all <p> elements italic?", options: ["p {font-style: italic;}","p {text-style: italic;}","<p style='italic'>","p {font: italic;}"], correct: 0, category: "css" },
  { question: "How do you display a border around an element?", options: ["border-style","border","outline","line"], correct: 1, category: "css" },
  { question: "Which CSS property is used to create space between the element's border and content?", options: ["margin","spacing","padding","border-spacing"], correct: 2, category: "css" },
  { question: "What is the default value of the position property in CSS?", options: ["relative","fixed","absolute","static"], correct: 3, category: "css" },

  /* 21-30 JavaScript */
  { question: "What is the correct syntax for referring to an external script?", options: ["<script href='xxx.js'>","<script name='xxx.js'>","<script src='xxx.js'>","<script file='xxx.js'>"], correct: 2, category: "js" },
  { question: "How do you write 'Hello World' in an alert box?", options: ["msgBox('Hello World');","alert('Hello World');","msg('Hello World');","alertBox('Hello World');"], correct: 1, category: "js" },
  { question: "How do you declare a JavaScript variable using modern syntax?", options: ["variable x;","v x;","let x;","var: x;"], correct: 2, category: "js" },
  { question: "Which operator is used to assign a value to a variable?", options: ["*","-","=","x"], correct: 2, category: "js" },
  { question: "What will typeof null return?", options: ["null","undefined","object","number"], correct: 2, category: "js" },
  { question: "Which method is used to parse a string to an integer?", options: ["parseInt()","parseInteger()","int()","Integer()"], correct: 0, category: "js" },
  { question: "How do you round the number 7.25 to the nearest integer?", options: ["Math.rnd(7.25)","Math.round(7.25)","round(7.25)","rnd(7.25)"], correct: 1, category: "js" },
  { question: "Which event occurs when the user clicks on an HTML element?", options: ["onchange","onclick","onmouseclick","onmouseover"], correct: 1, category: "js" },
  { question: "How do you create a function in JavaScript?", options: ["function = myFunction()","function:myFunction()","function myFunction()","create myFunction()"], correct: 2, category: "js" },
  { question: "How do you call a function named 'myFunction'?", options: ["call myFunction()","myFunction()","call function myFunction()","execute myFunction()"], correct: 1, category: "js" }
];

/* Helper: format time MM:SS */
function formatTime(s){
  const m = Math.floor(s/60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

/* Render all questions in fixed order using DOM API (safe textContent) */
function renderQuestions(){
  questionsContainer.innerHTML = '';
  quizData.forEach((q, index) => {
    // card
    const card = document.createElement('div');
    card.className = `question-card ${q.category}-card`;
    card.dataset.index = index;

    // header
    const header = document.createElement('div');
    header.className = 'question-header';
    const qnum = document.createElement('div');
    qnum.className = 'question-number';
    qnum.textContent = `Question ${index + 1}`;
    const badge = document.createElement('div');
    badge.className = `category-badge ${q.category}`;
    badge.textContent = q.category.toUpperCase();
    header.appendChild(qnum);
    header.appendChild(badge);

    // question text
    const qText = document.createElement('div');
    qText.className = 'question-text';
    qText.textContent = q.question;

    // options container
    const optsDiv = document.createElement('div');
    optsDiv.className = 'options';

    q.options.forEach((opt, optIndex) => {
      const optWrapper = document.createElement('div');
      optWrapper.className = 'option';
      optWrapper.dataset.question = index;
      optWrapper.dataset.option = optIndex;
      optWrapper.tabIndex = 0;
      optWrapper.setAttribute('role', 'button');
      optWrapper.setAttribute('aria-pressed', 'false');

      // radio input
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `q${index}`;
      radio.id = `q${index}_opt${optIndex}`;
      radio.value = optIndex;
      // ensure default appearance and visibility
      radio.style.width = '18px';
      radio.style.height = '18px';

      // label — use textContent so < and > show as text
      const label = document.createElement('label');
      label.htmlFor = radio.id;
      label.textContent = opt; // SAFE: no HTML parsing

      optWrapper.appendChild(radio);
      optWrapper.appendChild(label);
      optsDiv.appendChild(optWrapper);
    });

    // assemble
    card.appendChild(header);
    card.appendChild(qText);
    card.appendChild(optsDiv);
    questionsContainer.appendChild(card);
  });

  // Add event listeners for option click & keyboard
  document.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', onOptionClick);
    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        opt.click();
      }
    });
  });
}

/* Option click handler */
function onOptionClick(e){
  if (quizSubmitted) return; // no changes after submit
  const optEl = e.currentTarget;
  const qIndex = Number(optEl.dataset.question);
  const optIndex = Number(optEl.dataset.option);

  // mark radio
  const radio = optEl.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;

  // remove selected for that question
  document.querySelectorAll(`.option[data-question="${qIndex}"]`).forEach(o => {
    o.classList.remove('selected');
    o.setAttribute('aria-pressed','false');
  });

  optEl.classList.add('selected');
  optEl.setAttribute('aria-pressed','true');

  userAnswers[qIndex] = optIndex;
  updateProgress();

  // sound
  beep(880, 0.04, 'sine');
}

/* Progress update */
function updateProgress(){
  const answered = Object.keys(userAnswers).length;
  const total = quizData.length;
  const pct = Math.round((answered / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${answered}/${total} Questions Answered`;
}

/* Timer control */
function startTimer(){
  if (timerInterval) clearInterval(timerInterval);
  timerEl.textContent = formatTime(timeRemaining);
  timerInterval = setInterval(() => {
    timeRemaining--;
    timerEl.textContent = formatTime(timeRemaining);
    if (timeRemaining <= 300) timerEl.classList.add('warning');
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      if (!quizSubmitted) {
        alert('⏰ Time is up! Submitting quiz...');
        submitQuiz(true);
      }
    }
  }, 1000);
}

/* Calculate score */
function calculateScore(){
  let totalCorrect = 0, htmlCorrect = 0, cssCorrect = 0, jsCorrect = 0;
  quizData.forEach((q, idx) => {
    const user = userAnswers[idx];
    if (typeof user !== 'undefined' && user === q.correct) {
      totalCorrect++;
      if (q.category === 'html') htmlCorrect++;
      if (q.category === 'css') cssCorrect++;
      if (q.category === 'js') jsCorrect++;
    }
  });
  return { total: totalCorrect, html: htmlCorrect, css: cssCorrect, js: jsCorrect };
}

/* Show results: highlight correct/incorrect and disable further changes */
function showResults(){
  quizSubmitted = true;
  if (timerInterval) clearInterval(timerInterval);

  // color and disable options
  quizData.forEach((q, idx) => {
    document.querySelectorAll(`.option[data-question="${idx}"]`).forEach(optEl => {
      const oIndex = Number(optEl.dataset.option);
      optEl.classList.add('disabled');
      // correct
      if (oIndex === q.correct) {
        optEl.classList.add('correct');
      }
      // user selected wrong
      if (userAnswers[idx] === oIndex && oIndex !== q.correct) {
        optEl.classList.add('incorrect');
      }
      // keep selected visible
      if (userAnswers[idx] === oIndex) {
        optEl.classList.add('selected');
      }
    });
  });

  // compute and show summary
  const scores = calculateScore();
  const total = scores.total;
  const percent = Math.round((total / quizData.length) * 100);

  let message = '';
  if (percent >= 90) message = "🏆 Outstanding! You're a web development expert!";
  else if (percent >= 75) message = "🌟 Excellent work! Great knowledge!";
  else if (percent >= 60) message = "👍 Good job! Keep learning!";
  else if (percent >= 50) message = "📚 Not bad! Practice more!";
  else message = "💪 Keep studying and try again!";

  scoreDisplay.textContent = `${total}/${quizData.length}`;
  resultMessage.textContent = message;
  htmlScoreEl.textContent = `${scores.html}/${quizData.filter(q=>q.category==='html').length}`;
  cssScoreEl.textContent = `${scores.css}/${quizData.filter(q=>q.category==='css').length}`;
  jsScoreEl.textContent = `${scores.js}/${quizData.filter(q=>q.category==='js').length}`;

  // hide quiz area and show result container
  quizArea.style.display = 'none';
  resultContainer.classList.add('show');
  resultContainer.setAttribute('aria-hidden', 'false');

  // save last score to localStorage
  const saved = {
    total,
    percent,
    time: new Date().toISOString(),
    html: scores.html,
    css: scores.css,
    js: scores.js
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

  // sound celebration
  if (percent >= 75) beep(1200, 0.12, 'sawtooth');
  else beep(440, 0.10, 'sine');
}

/* Submit handler */
function submitQuiz(force=false){
  if (!force && Object.keys(userAnswers).length < quizData.length) {
    const unanswered = quizData.length - Object.keys(userAnswers).length;
    const ok = confirm(`⚠️ You have ${unanswered} unanswered questions. Submit anyway?`);
    if (!ok) return;
  }
  showResults();
}

/* Tabs: filter questions */
function setupTabs(){
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.category;
      document.querySelectorAll('.question-card').forEach(card => {
        const cat = card.className.includes('html-card') ? 'html' :
                    card.className.includes('css-card') ? 'css' :
                    card.className.includes('js-card') ? 'js' : 'all';
        if (currentFilter === 'all' || currentFilter === cat) card.style.display = 'block';
        else card.style.display = 'none';
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      beep(660, 0.03);
    });
  });
}

/* Start quiz */
function startQuiz(){
  if (quizStarted) return;
  // resume audio ctx if suspended
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  quizStarted = true;
  quizSubmitted = false;
  userAnswers = {};
  timeRemaining = TOTAL_TIME;
  timerEl.textContent = formatTime(timeRemaining);
  renderQuestions();
  setupTabs();
  updateProgress();
  preStart.style.display = 'none';
  quizArea.style.display = 'block';
  quizArea.setAttribute('aria-hidden','false');
  resultContainer.classList.remove('show');
  resultContainer.setAttribute('aria-hidden','true');
  startTimer();
  beep(1100, 0.08, 'triangle');

  // focus first question smoothly
  setTimeout(()=> {
    const first = document.querySelector('.question-card');
    if (first) first.scrollIntoView({behavior: 'smooth', block:'start'});
  }, 250);
}

/* Try again: reset to initial state */
tryAgainBtn.addEventListener('click', () => {
  quizStarted = false;
  quizSubmitted = false;
  userAnswers = {};
  timeRemaining = TOTAL_TIME;
  if (timerInterval) clearInterval(timerInterval);
  questionsContainer.innerHTML = '';
  progressFill.style.width = '0%';
  progressText.textContent = `0/${quizData.length} Questions Answered`;
  preStart.style.display = 'block';
  quizArea.style.display = 'none';
  resultContainer.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  beep(600, 0.06);
});

/* Clear saved score */
clearScoreBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  lastSavedEl.textContent = '';
  alert('Saved score removed.');
});

/* Theme toggle (persist) */
function initTheme(){
  const saved = localStorage.getItem('quiz_theme_v2');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    themeToggle.textContent = '☀️ Light';
  } else {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙 Dark';
  }
}
themeToggle.addEventListener('click', () => {
  if (document.body.classList.contains('light')) {
    document.body.classList.remove('light'); document.body.classList.add('dark');
    themeToggle.textContent = '☀️ Light';
    localStorage.setItem('quiz_theme_v2', 'dark');
  } else {
    document.body.classList.remove('dark'); document.body.classList.add('light');
    themeToggle.textContent = '🌙 Dark';
    localStorage.setItem('quiz_theme_v2', 'light');
  }
});

/* Show saved score if present */
function showSavedScore(){
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return;
  try {
    const obj = JSON.parse(s);
    lastSavedEl.textContent = `Last saved: ${obj.total}/${quizData.length} (${obj.percent}%) — ${new Date(obj.time).toLocaleString()}`;
  } catch(e) {}
}

/* Form submit */
quizForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitQuiz(false);
});

/* Start button */
startBtn.addEventListener('click', startQuiz);

/* Initialize UI */
(function init(){
  // hide quiz area until start
  quizArea.style.display = 'none';
  resultContainer.classList.remove('show');
  renderQuestions(); // render initially so you can see layout (quizArea stays hidden)
  setupTabs();
  initTheme();
  showSavedScore();
})();
