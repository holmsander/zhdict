console.log('JavaScript file loaded');

function setupToggleListeners() {
    const toggles = document.querySelectorAll('.option-group input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            updateDisplay();
            saveSettings();
        });
    });
}

function updateDisplay() { // Hämta data med nån form av identifier för varje word container
    console.log('Updating display');
    
    const toggles = {
        'toggle-traditional': '.traditional',
        'toggle-simplified': '.simplified',
        'toggle-global': '.global',
        'toggle-less-formal': '.less-formal',
        'toggle-literary': '.literary',
        'toggle-news': '.news',
        'toggle-tech': '.tech',
        'toggle-blog': '.blog',
        'toggle-new-hsk': '.new_hsk',
        'toggle-hsk': '.hsk'
        
    };
    const reelationToggles = {
        'toggle-self': '.self_relation',
        'toggle-close-relation': '.close_relation',
        'toggle-distant-relation': '.distant_relation'
    };

    for (const [toggleId, selector] of Object.entries(toggles)) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const container = el.closest('.word-container');
                if (container) {
                    const statRow = el.closest('.stat-row') || el;
                    statRow.style.display = toggle.checked ? '' : 'none';
                }
            });
        } else {
            console.warn(`Toggle element not found: ${toggleId}`);
        }
    }
    for (const [toggleId, selector] of Object.entries(reelationToggles)) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = toggle.checked ? '' : 'none';
            });
        }
    }

    /* Gör så att om en .word-container inter har något contnt så göms den, 
        men kan ej hända just nu pga pinyin ej togglable
    document.querySelectorAll('.word-container').forEach(container => {
        const hasVisibleContent = Array.from(container.querySelectorAll('.word-left *, .word-right *'))
            .some(el => el.offsetParent !== null && getComputedStyle(el).display !== 'none');
        container.style.display = hasVisibleContent ? '' : 'none';
    });*/
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsDiv = document.getElementById('results');
    const sortBySelect = document.getElementById('sortBy');
    const toggles = document.querySelectorAll('#toggles input[type="checkbox"]');
    const bulkSearchInput = document.getElementById('bulkSearchInput');
    const bulkSearchButton = document.getElementById('bulkSearchButton');

    loadSettings();
    setupToggleListeners();

    bulkSearchButton.addEventListener('click', performBulkSearch);
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    sortBySelect.addEventListener('change', () => {
        console.log('Sort option changed');
        sortResults();
        saveSettings();
    });

    async function performBulkSearch() {
        const searchTerms = bulkSearchInput.value.trim().split('\n').filter(term => term.trim() !== '');
        if (searchTerms.length === 0) return;

        try {
            const response = await fetch('/bulk-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ terms: searchTerms }),
            });
            const data = await response.json();
            displayResults(data);
            sortResults();
        } catch (error) {
            console.error('Error:', error);
            resultsDiv.innerHTML = '<p>An error occurred while searching. Please try again.</p>';
        }
    }

    function performSearch() {
        console.log('Performing search');
        const searchTerm = searchInput.value.trim();
        console.log('Search term:', searchTerm);
        if (!searchTerm) {
            console.log('Search term is empty, returning');
            return;
        }

        console.log('Sending fetch request');
        fetch(`/search?term=${encodeURIComponent(searchTerm)}`)
            .then(response => {
                console.log('Received response');
                return response.json();
            })
            .then(data => {
                console.log('Search results:', data);
                displayResults(data);
                sortResults();
            })
            .catch(error => {
                console.error('Error:', error);
                resultsDiv.innerHTML = '<p>An error occurred while searching. Please try again.</p>';
            });
    }
    
    function displayResults(results) {
        console.log('Displaying results');
        resultsDiv.innerHTML = results.map(word => {
            return `
            <div class="word-container ${word.relation_type}">
                <div class="word-info">
                    <div class="word-left">
                        <div class="word-characters">
                            <span class="simplified">${word.simplified || ''}</span>
                            <span class="traditional">${word.traditional || ''}</span>
                        </div>
                        <div class="pinyin">${word.pinyin || ''}</div>
                        <div class="meaning">${word.meaning || ''}</div>
                        <div class="hsk-levels">
                            ${word.new_hsk_level > 0 ? `<span class="new_hsk">New HSK ${word.new_hsk_level}</span>` : ''}
                            ${word.hsk_level > 0 ? `<span class="hsk">HSK ${word.hsk_level}</span>` : ''}
                        </div>
                    </div>
                    <div class="word-right">
                        ${['global', 'less-formal', 'literary', 'news', 'tech', 'blog'].map(type => {
                            const freq = word[`freq_${type === 'less-formal' ? 'weibo' : type}`];
                            const rank = word[`rank_${type === 'less-formal' ? 'weibo' : type}`];
                            if (freq <= 0) return '';
                            return `
                                <div class="stat-row ${type}">
                                    <span class="stat-label">${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}</span>
                                    <span class="stars" data-freq="${freq}" data-rank="${rank}"></span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `}).join('');
    
        updateStars();
        updateDisplay();
    }
    
    function updateStars() {
        console.log('Updating stars');
        document.querySelectorAll('.stars').forEach(starSpan => {
            const freq = parseInt(starSpan.dataset.freq);
            if (freq > 0) {
                starSpan.innerHTML = '★'.repeat(freq) + '☆'.repeat(6 - freq);
                starSpan.title = `Rank: ${starSpan.dataset.rank}`;
            } else {
                starSpan.parentElement.style.display = 'none';
            }
        });
    }

    function sortResults() {
        console.log('Sorting results');
        const sortBy = sortBySelect.value;
        const words = Array.from(resultsDiv.children);
        
        words.sort((a, b) => {
            const isNotFoundA = a.classList.contains('not-found');
            const isNotFoundB = b.classList.contains('not-found');
    
            if (isNotFoundA && isNotFoundB) return 0;
            if (isNotFoundA) return 1;
            if (isNotFoundB) return -1;
    
            const freqGlobalA = parseInt(a.querySelector('.global .stars')?.dataset.freq) || 0;
            const freqGlobalB = parseInt(b.querySelector('.global .stars')?.dataset.freq) || 0;
    
            if (freqGlobalA === 0 && freqGlobalB === 0) return 0;
            if (freqGlobalA === 0) return 1;
            if (freqGlobalB === 0) return -1;
    
            if (sortBy === 'new_hsk' || sortBy === 'hsk') {
                const getHSKLevel = (element, type) => {
                    const hskSpan = element.querySelector(`.${type}`);
                    return hskSpan ? parseInt(hskSpan.textContent.match(/\d+/) || '0') : 0;
                };
    
                const levelA = getHSKLevel(a, sortBy);
                const levelB = getHSKLevel(b, sortBy);
    
                if (levelA === levelB) {
                    return compareRanks(a, b, 'global');
                }
                return levelA - levelB;
            } else {
                return compareRanks(a, b, sortBy);
            }
        });
        
        words.forEach(word => resultsDiv.appendChild(word));
    }
    
    function compareRanks(elementA, elementB, type) {
        const rankA = parseInt(elementA.querySelector(`.${type} .stars`)?.dataset.rank) || -1;
        const rankB = parseInt(elementB.querySelector(`.${type} .stars`)?.dataset.rank) || -1;
        
        if (rankA === -1 && rankB === -1) return 0;
        if (rankA === -1) return 1;
        if (rankB === -1) return -1;
        return rankA - rankB;
    }

    function saveSettings() {
        console.log('Saving settings');
        const settings = {
            sortBy: sortBySelect.value,
            toggles: {}
        };
        toggles.forEach(toggle => {
            settings.toggles[toggle.id] = toggle.checked;
        });
        localStorage.setItem('chineseDictSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        console.log('Loading settings');
        const savedSettings = JSON.parse(localStorage.getItem('chineseDictSettings'));
        if (savedSettings) {
            console.log('Found saved settings:', savedSettings);
            sortBySelect.value = savedSettings.sortBy || 'global';
            toggles.forEach(toggle => {
                if (savedSettings.toggles && savedSettings.toggles[toggle.id] !== undefined) {
                    toggle.checked = savedSettings.toggles[toggle.id];
                } else {
                    toggle.checked = true;
                }
            });
            updateDisplay();
        } else {
            console.log('No saved settings found, using defaults');
            toggles.forEach(toggle => {
                toggle.checked = true;
            });
        }
    }
});