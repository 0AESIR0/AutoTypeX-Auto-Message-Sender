let selectedWindowId = null;
let isRunning = false;
let countdown = 20;
let countdownInterval = null;

const windowSelect = document.getElementById('window-select');
const refreshBtn = document.getElementById('refresh-btn');
const messageInput = document.getElementById('message-input');
const charCount = document.getElementById('char-count');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const timerDisplay = document.getElementById('timer-display');
const timerElement = document.getElementById('timer');

async function loadWindows() {
  try {
    const previousValue = windowSelect.value;
    windowSelect.disabled = true;
    windowSelect.innerHTML = '<option value="">Yükleniyor...</option>';

    const windows = await window.electronAPI.getWindows();

    if (!windows || windows.length === 0) {
      windowSelect.innerHTML = '<option value="">Aktif pencere bulunamadı</option>';
      windowSelect.disabled = true;
      updateButtonStates();
      return;
    }

    windowSelect.innerHTML = '<option value="">Pencere seç...</option>';
    windows.forEach(win => {
      const option = document.createElement('option');
      option.value = win.id;
      option.textContent = win.title;
      windowSelect.appendChild(option);
    });

    const stillExists = windows.find(win => String(win.id) === previousValue);
    if (stillExists) {
      windowSelect.value = String(stillExists.id);
    }

    windowSelect.disabled = false;
    updateButtonStates();
  } catch (error) {
    setStatus('error', 'Pencereler yüklenemedi');
  }
}

function updateCharCount() {
  const count = messageInput.value.length;
  charCount.textContent = count;
  updateButtonStates();
}

function updateButtonStates() {
  const hasWindow = windowSelect.value !== '';
  const hasMessage = messageInput.value.trim().length > 0;
  
  startBtn.disabled = !hasWindow || !hasMessage || isRunning;
  stopBtn.disabled = !isRunning;
}

function setStatus(type, text) {
  statusIndicator.className = `status-indicator ${type}`;
  statusText.textContent = text;
}

function startCountdown() {
  countdown = 20;
  timerElement.textContent = countdown;
  timerDisplay.style.display = 'block';
  
  countdownInterval = setInterval(() => {
    countdown--;
    timerElement.textContent = countdown;
    
    if (countdown <= 0) {
      countdown = 17;
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  timerDisplay.style.display = 'none';
}

async function startBot() {
  const windowId = parseInt(windowSelect.value);
  const message = messageInput.value.trim();
  
  if (!windowId || !message) {
    setStatus('error', 'Pencere veya mesaj eksik');
    return;
  }
  
  const result = await window.electronAPI.startBot({ windowId, message });
  
  if (result.success) {
    isRunning = true;
    selectedWindowId = windowId;
    setStatus('running', 'Bot çalışıyor 🚀');
    updateButtonStates();
    startCountdown();
    
    windowSelect.disabled = true;
    messageInput.disabled = true;
  } else {
    setStatus('error', result.error || 'Başlatılamadı');
  }
}

async function stopBot() {
  const result = await window.electronAPI.stopBot();
  
  if (result.success) {
    isRunning = false;
    selectedWindowId = null;
    setStatus('idle', 'Durduruldu');
    updateButtonStates();
    stopCountdown();
    
    windowSelect.disabled = false;
    messageInput.disabled = false;
  } else {
    setStatus('error', result.error || 'Durdurulamadı');
  }
}

refreshBtn.addEventListener('click', loadWindows);
windowSelect.addEventListener('change', updateButtonStates);
messageInput.addEventListener('input', updateCharCount);
startBtn.addEventListener('click', startBot);
stopBtn.addEventListener('click', stopBot);

window.electronAPI.onBotError((error) => {
  setStatus('error', `Hata: ${error}`);
});

loadWindows();
