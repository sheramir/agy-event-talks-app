// State management
let allUpdates = [];
let filteredUpdates = [];
let activeType = 'all';
let searchQuery = '';

// DOM Elements
const feedGrid = document.getElementById('feed-grid');
const feedLoader = document.getElementById('feed-loader');
const emptyState = document.getElementById('empty-state');
const refreshButton = document.getElementById('refresh-button');
const refreshIcon = document.getElementById('refresh-icon');
const refreshSpinner = document.getElementById('refresh-spinner');
const searchInput = document.getElementById('search-input');
const filterPills = document.getElementById('filter-pills');
const cacheStatus = document.getElementById('cache-status');
const feedMeta = document.getElementById('feed-meta');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const exportCsvButton = document.getElementById('export-csv-button');

// Dialog Elements
const tweetDialog = document.getElementById('tweet-dialog');
const tweetTextarea = document.getElementById('tweet-textarea');
const dialogCloseBtn = document.getElementById('dialog-close-btn');
const composerCancelBtn = document.getElementById('composer-cancel-btn');
const composerTweetBtn = document.getElementById('composer-tweet-btn');
const charCount = document.getElementById('char-count');
const limitWarning = document.getElementById('limit-warning');
const composerRing = document.getElementById('composer-ring');
const previewBadge = document.getElementById('preview-badge');
const previewDate = document.getElementById('preview-date');

// Circle configuration for SVG progress ring
const ringRadius = 9;
const ringCircumference = 2 * Math.PI * ringRadius; // ~56.548
composerRing.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;

/* -----------------------------------------
   API Fetching & Refreshing
   ----------------------------------------- */

// Fetch feed data from Flask backend
async function fetchFeed(forceRefresh = false) {
  setLoadingState(true);
  try {
    const url = `/api/feed${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    allUpdates = data.updates || [];
    updateMetaInfo(data);
    renderFeed();
    updateCounts();
    
    if (forceRefresh) {
      showToast('Release notes successfully updated!', 'success');
    }
  } catch (error) {
    console.error('Failed to load feed:', error);
    showToast(`Failed to load feed: ${error.message}`, 'error');
    if (allUpdates.length === 0) {
      emptyState.removeAttribute('hidden');
    }
  } finally {
    setLoadingState(false);
  }
}

// Toggle UI Loading visual indicator
function setLoadingState(isLoading) {
  if (isLoading) {
    feedLoader.style.opacity = '1';
    feedLoader.style.pointerEvents = 'all';
    refreshIcon.setAttribute('hidden', 'true');
    refreshSpinner.removeAttribute('hidden');
    refreshButton.disabled = true;
  } else {
    feedLoader.style.opacity = '0';
    feedLoader.style.pointerEvents = 'none';
    refreshSpinner.setAttribute('hidden', 'true');
    refreshIcon.removeAttribute('hidden');
    refreshButton.disabled = false;
  }
}

// Render status and fetch details
function updateMetaInfo(data) {
  // Update cache indicator
  const timeString = new Date(data.last_fetched * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = new Date(data.last_fetched * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  if (data.source === 'cache') {
    cacheStatus.textContent = `Using cached data (Loaded ${timeString})`;
  } else if (data.source === 'network') {
    cacheStatus.textContent = `Synced with feed at ${timeString}`;
  } else if (data.source === 'cache_fallback') {
    cacheStatus.textContent = `Offline. Using cache (${timeString})`;
  }

  // Header meta text
  feedMeta.textContent = `Tracking ${allUpdates.length} historical release updates. Last checked: ${dateString} at ${timeString}.`;
}

/* -----------------------------------------
   Feed Rendering & Filtering
   ----------------------------------------- */

// Render list of updates
function renderFeed() {
  // Filter and search updates
  filteredUpdates = allUpdates.filter(update => {
    // Type Filter matching
    const matchesType = activeType === 'all' || update.type.toLowerCase() === activeType.toLowerCase();
    
    // Search Query matching
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      update.text.toLowerCase().includes(searchLower) || 
      update.date.toLowerCase().includes(searchLower) || 
      update.type.toLowerCase().includes(searchLower);
      
    return matchesType && matchesSearch;
  });

  // Clear existing items
  feedGrid.innerHTML = '';
  
  if (filteredUpdates.length === 0) {
    emptyState.removeAttribute('hidden');
    return;
  }
  
  emptyState.setAttribute('hidden', 'true');

  // Render cards
  filteredUpdates.forEach(update => {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = update.id;
    
    // Highlight query text if active
    let bodyHtml = update.html;
    if (searchQuery) {
      bodyHtml = highlightText(bodyHtml, searchQuery);
    }
    
    const badgeClass = getBadgeClass(update.type);
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-meta-left">
          <span class="badge ${badgeClass}">${update.type}</span>
          <span class="card-date">${update.date}</span>
        </div>
      </div>
      <div class="card-body">
        ${bodyHtml}
      </div>
      <div class="card-actions">
        <a href="${update.link}" target="_blank" class="btn-card-action" rel="noopener noreferrer" title="View in Google Cloud docs">
          <svg class="card-action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="currentColor"/>
          </svg>
          <span>Docs</span>
        </a>
        <button class="btn-card-action copy-action" data-id="${update.id}" title="Copy update to clipboard">
          <svg class="card-action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H18C19.1 23 20 22.1 20 21V7C20 5.9 19.1 5 18 5ZM18 21H8V7H18V21Z" fill="currentColor"/>
          </svg>
          <span>Copy</span>
        </button>
        <button class="btn-card-action tweet-action" data-id="${update.id}" title="Select and compose tweet">
          <svg class="card-action-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>Tweet</span>
        </button>
      </div>
    `;
    
    feedGrid.appendChild(card);
  });

  // Attach event listeners to Tweet buttons
  const tweetButtons = feedGrid.querySelectorAll('.tweet-action');
  tweetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const updateId = btn.getAttribute('data-id');
      const targetUpdate = allUpdates.find(u => u.id === updateId);
      if (targetUpdate) {
        openTweetComposer(targetUpdate);
      }
    });
  });

  // Attach event listeners to Copy buttons
  const copyButtons = feedGrid.querySelectorAll('.copy-action');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const updateId = btn.getAttribute('data-id');
      const targetUpdate = allUpdates.find(u => u.id === updateId);
      if (targetUpdate) {
        copyUpdateToClipboard(targetUpdate, btn);
      }
    });
  });
}

// Highlight matching words in the search
function highlightText(htmlContent, query) {
  // Regex to match search string while avoiding breaking HTML elements/attributes
  // Simple check for text inside tags
  try {
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match the query string unless it is part of an HTML tag
    const regex = new RegExp(`(${escapedQuery})(?=[^<>]*([<]|$))`, 'gi');
    return htmlContent.replace(regex, '<mark class="search-highlight">$1</mark>');
  } catch (e) {
    return htmlContent;
  }
}

// Get Badge CSS modifier class
function getBadgeClass(type) {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('feature')) return 'badge-feature';
  if (typeLower.includes('announcement')) return 'badge-announcement';
  if (typeLower.includes('breaking')) return 'badge-breaking';
  if (typeLower.includes('change')) return 'badge-change';
  if (typeLower.includes('issue')) return 'badge-issue';
  return 'badge-general';
}

// Update counts on filter pills dynamically
function updateCounts() {
  const counts = {
    all: allUpdates.length,
    feature: 0,
    announcement: 0,
    breaking: 0,
    change: 0,
    issue: 0
  };
  
  allUpdates.forEach(update => {
    const t = update.type.toLowerCase();
    if (t.includes('feature')) counts.feature++;
    else if (t.includes('announcement')) counts.announcement++;
    else if (t.includes('breaking')) counts.breaking++;
    else if (t.includes('change')) counts.change++;
    else if (t.includes('issue')) counts.issue++;
  });
  
  document.getElementById('count-all').textContent = counts.all;
  document.getElementById('count-feature').textContent = counts.feature;
  document.getElementById('count-announcement').textContent = counts.announcement;
  document.getElementById('count-breaking').textContent = counts.breaking;
  document.getElementById('count-change').textContent = counts.change;
  document.getElementById('count-issue').textContent = counts.issue;
}

/* -----------------------------------------
   Tweet Composer Dialog Management
   ----------------------------------------- */

// Open Tweet Composer Dialog
function openTweetComposer(update) {
  // Create Badge styling
  previewBadge.textContent = update.type;
  previewBadge.className = `preview-badge ${getBadgeClass(update.type)}`;
  previewDate.textContent = update.date;

  // Formulate default tweet text
  // Clean description and keep it succinct
  let desc = update.text;
  
  // Prefill content structure:
  // 📢 BigQuery (Type) Update: [Text]
  // Read details: [Link]
  // #GoogleCloud #BigQuery
  const titlePrefix = `📢 BigQuery Update (${update.date}):\n\n`;
  const hashtags = `\n\n#GoogleCloud #BigQuery`;
  const linkText = `\n\nRead more: ${update.link}`;
  
  // Calculate max length of description to fit within Twitter's 280-char limit
  // Note: Twitter URLs count as 23 characters
  const metadataLength = calculateTweetLength(titlePrefix + linkText + hashtags);
  const maxDescLength = 280 - metadataLength;
  
  if (desc.length > maxDescLength) {
    desc = desc.substring(0, maxDescLength - 3) + '...';
  }
  
  const initialTweet = `${titlePrefix}${desc}${linkText}${hashtags}`;
  tweetTextarea.value = initialTweet;
  
  // Update character count
  updateCharCounter();

  // Show modal using native Dialog element
  tweetDialog.showModal();
}

// Custom Tweet length estimator (URLs are wrapped and count as 23 chars)
function calculateTweetLength(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urlReplaced = text.replace(urlRegex, '12345678901234567890123'); // 23 char t.co URL
  return urlReplaced.length;
}

// Live update characters limit counter and ring UI
function updateCharCounter() {
  const currentLength = calculateTweetLength(tweetTextarea.value);
  const remaining = 280 - currentLength;
  
  charCount.textContent = remaining;

  // Calculate percentage for progress ring
  const percentage = Math.min((currentLength / 280) * 100, 100);
  const dashOffset = ringCircumference - (percentage / 100 * ringCircumference);
  
  composerRing.style.strokeDashoffset = dashOffset;
  
  // Stylize state based on limits
  if (remaining < 0) {
    charCount.style.color = 'var(--color-breaking)';
    composerRing.style.stroke = 'var(--color-breaking)';
    limitWarning.removeAttribute('hidden');
    composerTweetBtn.disabled = true;
  } else if (remaining <= 20) {
    charCount.style.color = 'var(--color-announcement)';
    composerRing.style.stroke = 'var(--color-announcement)';
    limitWarning.setAttribute('hidden', 'true');
    composerTweetBtn.disabled = false;
  } else {
    charCount.style.color = 'var(--text-muted)';
    composerRing.style.stroke = 'var(--primary-accent)';
    limitWarning.setAttribute('hidden', 'true');
    composerTweetBtn.disabled = false;
  }
}

// Close Tweet Modal
function closeTweetComposer() {
  tweetDialog.close();
}

// Dispatch Tweet Web Intent URL
function shareOnTwitter() {
  const text = tweetTextarea.value;
  const encodedText = encodeURIComponent(text);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
  closeTweetComposer();
  showToast('Opening X / Twitter sharing window...', 'info');
}

/* -----------------------------------------
   Toast Notification Popovers
   ----------------------------------------- */

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('popover', 'manual');
  
  let iconSVG = '';
  if (type === 'success') {
    iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/></svg>`;
  } else if (type === 'error') {
    iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/></svg>`;
  } else {
    iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 11H11V7H13V11ZM13 15H11V13H13V15Z" fill="currentColor"/></svg>`;
  }
  
  toast.innerHTML = `
    ${iconSVG}
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Close toast">&times;</button>
  `;
  
  container.appendChild(toast);
  
  // Show popover (Native API)
  toast.showPopover();
  
  // Close events
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.hidePopover();
    toast.remove();
  });
  
  // Auto close timer
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.hidePopover();
      toast.remove();
    }
  }, 4000);
}

/* -----------------------------------------
   Event Listeners Setup
   ----------------------------------------- */

// Refresh button event
refreshButton.addEventListener('click', () => {
  fetchFeed(true);
});

// Search input key events
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderFeed();
});

// Filters event listener
filterPills.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  
  // Deactivate all pills, activate this one
  filterPills.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
  pill.classList.add('active');
  
  activeType = pill.getAttribute('data-type');
  renderFeed();
});

// Clear filters button (empty state)
clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  filterPills.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
  filterPills.querySelector('[data-type="all"]').classList.add('active');
  activeType = 'all';
  renderFeed();
});

// Copy specific update contents to user clipboard
async function copyUpdateToClipboard(update, btnElement) {
  const textToCopy = `📢 BigQuery Update (${update.date}) [${update.type}]:\n\n${update.text}\n\nRead more details: ${update.link}`;
  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast('Update details copied to clipboard!', 'success');
    
    // Visual button state success indicator
    const label = btnElement.querySelector('span');
    const originalText = label.textContent;
    label.textContent = 'Copied!';
    btnElement.style.borderColor = 'var(--color-feature)';
    btnElement.style.color = 'var(--color-feature)';
    
    setTimeout(() => {
      label.textContent = originalText;
      btnElement.style.borderColor = '';
      btnElement.style.color = '';
    }, 1500);
  } catch (err) {
    console.error('Copy failed:', err);
    showToast('Failed to copy text. Please try manually.', 'error');
  }
}

// Export active filtered list of release notes to CSV file
function exportToCsv() {
  if (filteredUpdates.length === 0) {
    showToast('No release notes available to export.', 'error');
    return;
  }
  
  // Formulate rows (handling double quotes escaping)
  const csvHeaders = ['Date', 'Type', 'Description', 'Link'];
  const csvRows = [
    csvHeaders.map(header => `"${header}"`).join(','),
    ...filteredUpdates.map(u => {
      const escapedDate = u.date.replace(/"/g, '""');
      const escapedType = u.type.replace(/"/g, '""');
      const escapedText = u.text.replace(/"/g, '""');
      const escapedLink = u.link.replace(/"/g, '""');
      return `"${escapedDate}","${escapedType}","${escapedText}","${escapedLink}"`;
    })
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  
  const downloadLink = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  
  downloadLink.setAttribute('href', downloadUrl);
  downloadLink.setAttribute('download', `bigquery_release_notes_${timestamp}.csv`);
  downloadLink.style.visibility = 'hidden';
  
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  showToast(`Exported ${filteredUpdates.length} release notes successfully!`, 'success');
}

// Dialog close actions
dialogCloseBtn.addEventListener('click', closeTweetComposer);
composerCancelBtn.addEventListener('click', closeTweetComposer);
composerTweetBtn.addEventListener('click', shareOnTwitter);
tweetTextarea.addEventListener('input', updateCharCounter);

// Bind export CSV button
exportCsvButton.addEventListener('click', exportToCsv);

// Close dialog if clicking backdrop
tweetDialog.addEventListener('click', (e) => {
  if (e.target === tweetDialog) {
    closeTweetComposer();
  }
});

// Initialize app on load
window.addEventListener('DOMContentLoaded', () => {
  fetchFeed();
});
