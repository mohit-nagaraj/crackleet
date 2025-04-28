// Elements
const tabs = document.querySelectorAll('.tab');
const screens = document.querySelectorAll('#welcomeScreen, #analysisScreen, #settingsScreen');
const statusText = document.getElementById('statusText');
const mouseStatusText = document.getElementById('mouseStatusText');
const currentModel = document.getElementById('currentModel');
const screenshotPreview = document.getElementById('screenshotPreview');
const screenshotActions = document.getElementById('screenshotActions');
const loadingAnalysis = document.getElementById('loadingAnalysis');
const analysisResults = document.getElementById('analysisResults');
const explanationText = document.getElementById('explanationText');
const codeBlock = document.getElementById('codeBlock');
const complexityInfo = document.getElementById('complexityInfo');
const interactionToggle = document.getElementById('interactionToggle');

// Form elements
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const languageSelect = document.getElementById('languageSelect');
const themeSelect = document.getElementById('themeSelect');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsSaved = document.getElementById('settingsSaved');

// Action buttons
const captureScreenshotBtn = document.getElementById('captureScreenshotBtn');
const analyzeScreenshotBtn = document.getElementById('analyzeScreenshotBtn');
const discardScreenshotBtn = document.getElementById('discardScreenshotBtn');
console.log('discardScreenshotBtn element:', discardScreenshotBtn);

// Current state
let settings = {
  apiKey: '',
  model: 'gemini-1.5-pro',
  language: 'javascript',
  theme: 'vs-dark'
};

let currentScreenshotPath = null;

// Load settings from the file system on startup
async function loadSetting() {
  try {
    const fileSettings = await window.electronAPI.loadSettings();
    settings = {
      apiKey: fileSettings.apiKey || '',
      model: fileSettings.model || 'gemini-1.5-pro',
      language: fileSettings.language || 'javascript',
      theme: fileSettings.theme || 'vs-dark'
    };

    // Update the UI with the loaded settings
    apiKeyInput.value = settings.apiKey;
    modelSelect.value = settings.model;
    languageSelect.value = settings.language;
    themeSelect.value = settings.theme;
    currentModel.textContent = settings.model;

    console.log('Settings loaded successfully:', settings);
  } catch (error) {
    console.error('Failed to load settings from the file system:', error);

    // Use default settings if loading fails
    settings = {
      apiKey: '',
      model: 'gemini-1.5-pro',
      language: 'javascript',
      theme: 'vs-dark'
    };

    // Update the UI with default settings
    apiKeyInput.value = settings.apiKey;
    modelSelect.value = settings.model;
    languageSelect.value = settings.language;
    themeSelect.value = settings.theme;
    currentModel.textContent = settings.model;
  }
}

// Save settings to the file system
async function saveSetting() {
  settings = {
    apiKey: apiKeyInput.value,
    model: modelSelect.value,
    language: languageSelect.value,
    theme: themeSelect.value
  };

  try {
    const saved = await window.electronAPI.saveSettings(settings);
    if (saved) {
      console.log('Settings saved successfully:', settings);
      settingsSaved.style.display = 'block';
      currentModel.textContent = settings.model;
      setTimeout(() => {
        settingsSaved.style.display = 'none';
      }, 2000);
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    console.error('Failed to save settings:', error.message);
    alert(error.message);
  }
}

// Load settings on startup
document.addEventListener('DOMContentLoaded', () => {
  loadSetting();
});

// Save settings when the "Save Settings" button is clicked
saveSettingsBtn.addEventListener('click', saveSetting);

// Mouse interaction state
let mouseInteractionEnabled = false;

// Function to enable mouse interaction
function enableMouseInteraction() {
  if (!mouseInteractionEnabled) {
    window.electronAPI.toggleMouseEvents(false);
    mouseInteractionEnabled = true;
    document.body.classList.add('interaction-enabled');
    if (mouseStatusText) mouseStatusText.textContent = 'Enabled';
    interactionToggle.classList.add('mouse-active');
  }
}

// Function to disable mouse interaction
function disableMouseInteraction() {
  if (mouseInteractionEnabled) {
    // Don't disable if we're focused on an input
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.tagName === 'TEXTAREA') {
      return;
    }

    window.electronAPI.toggleMouseEvents(true);
    mouseInteractionEnabled = false;
    document.body.classList.remove('interaction-enabled');
    if (mouseStatusText) mouseStatusText.textContent = 'Disabled';
    interactionToggle.classList.remove('mouse-active');
  }
}

const debouncedDisableMouseInteraction = debounce(disableMouseInteraction, 200);

// Function to toggle mouse interaction
function toggleMouseInteraction() {
  if (mouseInteractionEnabled) {
    disableMouseInteraction();
  } else {
    enableMouseInteraction();
  }
}

// Add mouse toggle button functionality
interactionToggle.addEventListener('click', (e) => {
  e.preventDefault();
  toggleMouseInteraction();
});

// Add global keyboard shortcut for toggling mouse interaction
document.addEventListener('keydown', (e) => {
  // Ctrl+Alt+M
  if (e.ctrlKey && e.altKey && e.key === 'm') {
    toggleMouseInteraction();
  }
});

// Add global keyboard shortcut for toggling mouse interaction
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+M
  if (e.ctrlKey && e.shiftKey && e.key === 'm') {
    toggleMouseInteraction();
  }
});

// Auto-enable mouse interaction when hovering over interactive elements
const interactiveElements = document.querySelectorAll('.interactive');
interactiveElements.forEach(element => {
  element.addEventListener('mouseenter', () => {
    enableMouseInteraction();
  });
});

// Handle focus events for form elements
const formElements = document.querySelectorAll('input, select, textarea');
formElements.forEach(element => {
  element.addEventListener('focus', () => {
    enableMouseInteraction();
  });

  element.addEventListener('blur', () => {
    // Don't disable immediately to allow clicking other elements
    // This will be handled by the document click handler
  });
});

// Disable mouse interaction when clicking outside interactive elements
document.addEventListener('click', (e) => {
  let target = e.target;
  let isInteractiveElement = false;

  // Check if the click was on or inside an interactive element
  while (target && target !== document) {
    if (target.classList && (
      target.classList.contains('interactive') ||
      target.id === 'interactionToggle' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON'
    )) {
      isInteractiveElement = true;
      break;
    }
    target = target.parentNode;
  }

  // If clicked outside interactive elements, disable mouse interaction
  if (!isInteractiveElement) {
    debouncedDisableMouseInteraction();
  }
});

// Tab navigation
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const targetScreen = tab.getAttribute('data-screen');
    screens.forEach(screen => {
      if (screen.id === targetScreen) {
        screen.style.display = 'block';
      } else {
        screen.style.display = 'none';
      }
    });

    // Hide analysis results when not on analysis screen
    if (targetScreen !== 'analysisScreen') {
      analysisResults.classList.add('hidden');
    } else if (currentScreenshotPath && codeBlock.textContent) {
      // Only show analysis results on analysis screen if we have results
      analysisResults.classList.remove('hidden');
    }
  });
});

// Listen for visibility change events from the main process
window.electronAPI.onVisibilityChange((visible) => {
  statusText.textContent = visible ? 'Visible' : 'Hidden';
});

// Handle screenshot capture
window.electronAPI.onScreenshotCaptured(async (imagePath) => {
  currentScreenshotPath = imagePath;

  try {
    // Convert the image file to data URL for display
    const dataUrl = await window.electronAPI.readImageAsDataURL(imagePath);
    screenshotPreview.src = dataUrl;
    screenshotPreview.style.display = 'block';
    screenshotActions.style.display = 'flex';

    // Switch to the analysis tab
    tabs.forEach(t => t.classList.remove('active'));
    tabs[1].classList.add('active');
    screens.forEach(screen => screen.style.display = 'none');
    document.getElementById('analysisScreen').style.display = 'block';

  } catch (error) {
    console.error('Failed to load screenshot:', error);
    alert(error.message || 'Failed to load screenshot');
  }
});

captureScreenshotBtn.addEventListener('click', async () => {
  // Temporarily disable mouse events during the screenshot process
  const wasEnabled = mouseInteractionEnabled;
  disableMouseInteraction();
  await window.electronAPI.captureScreenshot();
  // Restore mouse interaction state if it was enabled before
  if (wasEnabled) {
    setTimeout(enableMouseInteraction, 500);
  }
});

analyzeScreenshotBtn.addEventListener('click', async () => {
  console.log('Analyze button clicked - starting analysis.');
  if (!currentScreenshotPath) {
    alert('No screenshot to analyze');
    return;
  }

  const apiKey = settings.apiKey;
  if (!apiKey) {
    alert('Please set your API key in the Settings tab');
    return;
  }

  // Show loading state
  loadingAnalysis.classList.remove('hidden');
  analysisResults.classList.add('hidden');

  try {
    // Get language from settings object
    const language = settings.language;
    const model = settings.model;

    // Construct prompt based on preferred language
    const prompt = `Preferred language: ${language}`;

    // Call the LLM API
    const result = await window.electronAPI.analyzeWithLLM(
      apiKey,
      model,
      currentScreenshotPath,
      prompt
    );

    // Display results
    explanationText.innerHTML = marked.parse(result.explanation);
    codeBlock.textContent = result.code;
    codeBlock.className = language;
    complexityInfo.textContent = result.complexity || "Time and Space Complexity not specified";

    // Apply syntax highlighting
    hljs.highlightElement(codeBlock);

    // Show results
    loadingAnalysis.classList.add('hidden');
    analysisResults.classList.remove('hidden');

  } catch (error) {
    console.error('Analysis failed:', error);
    alert(`Failed to analyze image: ${error.message || 'Unknown error'}`);
    loadingAnalysis.classList.add('hidden');
  }
});

console.log('Attempting to attach listener to discardScreenshotBtn');
discardScreenshotBtn.addEventListener('click', () => {
  console.log('Discard button clicked - resetting state.');

  // Reset the screenshot
  currentScreenshotPath = null;
  screenshotPreview.src = '';
  screenshotPreview.style.display = 'none';
  screenshotActions.style.display = 'none';
  analysisResults.classList.add('hidden');

  // Switch back to the welcome screen
  tabs.forEach(t => t.classList.remove('active'));
  tabs[0].classList.add('active'); // Make the Home tab active
  screens.forEach(screen => screen.style.display = 'none');
  document.getElementById('welcomeScreen').style.display = 'block';
});

// Initialize with mouse events disabled by default
window.electronAPI.toggleMouseEvents(true);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Briefly enable mouse interaction at startup to allow first interaction
  setTimeout(() => {
    enableMouseInteraction();
    setTimeout(disableMouseInteraction, 1000);
  }, 500);
});

// Debounce function
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}