const words = ['Meetings', 'Agenda', 'Notes', 'Tasks', 'Reminders', 'Alarms'];
const descriptions = ['Keep your meetings in view.', 'Give your day a clear agenda.', 'Save ideas, links and things worth keeping.', 'Bring your next steps together.', 'Keep your goals close with reminders.', 'Set alarms for the moments that matter.'];
const story = document.querySelector('.brand-story');
const buttons = [...document.querySelectorAll('[data-step]')];
const detail = document.querySelector('#story-detail');
const letter = document.querySelector('.story-letter');
const replay = document.querySelector('#replay');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let timer = null;
let current = 0;
let completed = false;
function showStep(index) {
  current = index;
  buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  detail.textContent = descriptions[index];
  letter.textContent = words[index][0];
  story.classList.remove('is-changing');
  void story.offsetWidth;
  story.classList.add('is-changing');
}
function stop() {
  clearInterval(timer);
  timer = null;
  replay.innerHTML = 'Replay <span aria-hidden="true">↻</span>';
  replay.setAttribute('aria-label', 'Replay logo introduction');
}
function play() {
  stop();
  completed = false;
  showStep(0);
  replay.innerHTML = 'Pause <span aria-hidden="true">Ⅱ</span>';
  replay.setAttribute('aria-label', 'Pause logo introduction');
  timer = setInterval(() => {
    if (current === words.length - 1) {
      stop();
      completed = true;
      detail.textContent = 'Six essentials. One connected diary.';
      return;
    }
    showStep(current + 1);
  }, 1900);
}
buttons.forEach((button, index) => button.addEventListener('click', () => { stop(); showStep(index); }));
replay.addEventListener('click', () => timer ? stop() : play());
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
if (reducedMotion.matches) { stop(); detail.textContent = 'Meetings, Agenda, Notes, Tasks, Reminders, Alarms.'; }
else play();

const dialog = document.querySelector('#image-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogTitle = document.querySelector('#dialog-title');
const original = document.querySelector('#original-image');
document.querySelectorAll('.image-open').forEach(button => button.addEventListener('click', () => {
  dialogImage.src = button.dataset.image;
  dialogImage.alt = button.querySelector('img').alt;
  dialogTitle.textContent = button.dataset.title;
  original.href = button.dataset.image;
  dialog.showModal();
}));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
