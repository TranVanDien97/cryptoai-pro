const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/\r\n/g, '\n');

const target = `document.addEventListener('DOMContentLoaded', () => {
  // Close chart modal event`;

const replacement = `document.addEventListener('DOMContentLoaded', () => {
  // Setup Virtual Bot switch
  const togBot = document.getElementById('togVirtualBot');
  if(togBot) {
    const savedBotEnabled = localStorage.getItem('virtual_bot_enabled') === 'true';
    togBot.checked = savedBotEnabled;
    if (typeof botState !== 'undefined') {
      botState.enabled = savedBotEnabled;
    }
    
    togBot.addEventListener('change', (e) => {
      if (typeof botState !== 'undefined') {
        botState.enabled = e.target.checked;
      }
      localStorage.setItem('virtual_bot_enabled', e.target.checked ? 'true' : 'false');
      if (typeof saveBotState === 'function') {
        saveBotState();
      }
      toast(e.target.checked ? '🤖 Da bat Bot Giao Dich AI!' : '🤖 Da tat Bot.', e.target.checked ? 'success' : 'info');
    });
  }

  const btnClearHistory = document.getElementById('btnClearBotHistory');
  if(btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      if (typeof clearBotHistory === 'function') clearBotHistory();
    });
  }

  const btnBacktest = document.getElementById('btnRunBacktest');
  if(btnBacktest) {
    btnBacktest.addEventListener('click', () => {
      const title = document.getElementById('chartModalTitle').textContent;
      const symbol = title.replace('Biểu đồ kỹ thuật: ', '').split('/')[0];
      if (typeof window.runStrategyBacktest === 'function') {
        window.runStrategyBacktest(symbol);
      }
    });
  }
  
  if (typeof loadBotState === 'function') {
    loadBotState();
  }

  // Close chart modal event`;

if (d.includes(target)) {
  d = d.replace(target, () => replacement);
  console.log('Successfully injected Bot DOMContentLoaded hooks');
} else {
  console.log('Error: DOMContentLoaded target not found!');
}

fs.writeFileSync(p, d, 'utf8');
