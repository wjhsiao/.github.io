// --- START OF FILE script.js ---
// script.js (完整版 - v9.4 - 加入全領域雷達圖)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing script v9.4 (All-Areas Radar Chart)...");

    // --- DOM Element References ---
    const questionnaireContainer = document.getElementById('questionnaire');
    const calculateButton = document.getElementById('calculate-button');
    const resultsContainer = document.getElementById('results');
    const overallScoreContainer = document.getElementById('overall-score');
    const areaDetailsContainer = document.getElementById('area-details');
    const nonCompliantItemsContainer = document.getElementById('non-compliant-items');
    const saveButton = document.getElementById('save-button');
    const exportCsvButton = document.getElementById('export-csv-button');
    const clearButton = document.getElementById('clear-button');
    const overallChartCanvas = document.getElementById('overall-chart');
    const notificationArea = document.getElementById('notification-area');
    const loadingIndicator = document.getElementById('loading-indicator');
    const calculateButtonText = calculateButton ? calculateButton.querySelector('.button-text') : null;
    const progressIndicator = document.getElementById('progress-indicator');
    const overallProgressBar = document.getElementById('overall-progress-bar');
    const overallProgressText = document.getElementById('overall-progress-text');
    const areaProgressList = document.getElementById('area-progress-list');
    const lastSavedTimeElement = document.getElementById('last-saved-time');
    const importCsvButton = document.getElementById('import-csv-button');
    const importCsvInput = document.getElementById('import-csv-input');
    const unsavedIndicator = document.getElementById('unsaved-changes-indicator');
    const questionSearchInput = document.getElementById('question-search-input');
    const toggleSidebarButton = document.getElementById('toggle-sidebar-button');
    const expandAllButton = document.getElementById('expand-all-button');
    const collapseAllButton = document.getElementById('collapse-all-button');
    const bodyElement = document.body;
    // 新增: 雷達圖 Canvas 引用 (雖然 displayResults 裡面也會 getElementById，但放這裡也無妨)
    const radarChartCanvas = document.getElementById('all-areas-radar-chart');

    // --- Constants and State Variables ---
    const STORAGE_KEY = 'assessmentAnswers';
    const STORAGE_TIMESTAMP_KEY = 'assessmentAnswers_timestamp';
    let riskAreas = {};
    let currentAnswers = {};
    let chartInstances = {}; // *** 這個物件現在會包含圓餅圖和雷達圖的實例 ***
    let notificationTimeout = null;
    let totalQuestions = 0;
    let hasUnsavedChanges = false;
    let orderedAreaNames = [];
    let searchTerm = '';
    const AREA_ITEMS_CONTAINER_CLASS = 'area-items-container';

    // --- Chart Colors & Labels ---
    const chartColors = { compliant: 'rgba(40, 167, 69, 0.8)', nonCompliant: 'rgba(220, 53, 69, 0.8)', notApplicable: 'rgba(108, 117, 125, 0.8)', };
    const chartLabels = ['符合', '未符合', '不適用'];

    // --- Initial Checks ---
    if (!questionnaireContainer) console.error("CRITICAL ERROR: #questionnaire not found!");
    if (typeof assessmentData === 'undefined') {
        console.error("CRITICAL ERROR: assessmentData missing.");
        if(questionnaireContainer) questionnaireContainer.innerHTML = '<p style="color: red;">錯誤：無法載入問卷題目數據 (assessmentData.js)。</p>';
        return;
    }
    if (typeof assessmentData !== 'undefined' && Array.isArray(assessmentData)) {
        const seenAreas = new Set();
        assessmentData.forEach(item => { if (item && item.area && !seenAreas.has(item.area)) { orderedAreaNames.push(item.area); seenAreas.add(item.area); } });
        console.log("Calculated ordered area names:", orderedAreaNames);
        totalQuestions = assessmentData.length;
    } else {
        console.error("CRITICAL ERROR: assessmentData is missing or invalid, cannot determine area order.");
        if(questionnaireContainer) questionnaireContainer.innerHTML = '<p style="color: red;">錯誤：無法確定領域順序，問卷數據缺失或無效。</p>';
        return;
    }
    if (typeof Chart === 'undefined') console.error("CRITICAL ERROR: Chart.js library missing.");
    if (!radarChartCanvas) console.warn("Warning: Radar chart canvas #all-areas-radar-chart not found!"); // 新增檢查
    // ... (其他元素檢查) ...
    if (!notificationArea) console.warn("Warning: #notification-area not found.");
    if (!loadingIndicator) console.warn("Warning: #loading-indicator not found.");
    if (!calculateButtonText) console.warn("Warning: Calculate button text span not found.");
    if (!progressIndicator) console.warn("Warning: #progress-indicator not found.");
    if (!lastSavedTimeElement) console.warn("Warning: #last-saved-time span not found.");
    if (!importCsvButton || !importCsvInput) console.error("ERROR: Import CSV elements not found!");
    if (!unsavedIndicator) console.warn("Warning: #unsaved-changes-indicator span not found.");
    if (!questionSearchInput) console.warn("Warning: #question-search-input not found.");
    if (!toggleSidebarButton) console.warn("Warning: #toggle-sidebar-button not found.");
    if (!expandAllButton || !collapseAllButton) console.warn("Warning: Expand/Collapse all buttons not found.");


    // --- Loading/Notification Controls ---
    function showLoading() { if (loadingIndicator) loadingIndicator.style.display = 'inline-block'; if (calculateButtonText) calculateButtonText.textContent = '計算中...'; if (calculateButton) calculateButton.disabled = true; }
    function hideLoading() { if (loadingIndicator) loadingIndicator.style.display = 'none'; if (calculateButtonText) calculateButtonText.textContent = '計算分數與檢視結果'; if (calculateButton) calculateButton.disabled = false; }
    function showNotification(message, type = 'info', duration = 3500) { if (!notificationArea) { console.warn("Notify fallback:", message); alert(message); return; } if (notificationTimeout) clearTimeout(notificationTimeout); notificationArea.textContent = message; notificationArea.className = 'visible'; notificationArea.classList.add(type); if (duration > 0) { notificationTimeout = setTimeout(() => { notificationArea.className = ''; notificationTimeout = null; }, duration); } }

    // --- Update unsaved changes indicator ---
    function updateUnsavedIndicator() { if (unsavedIndicator) { unsavedIndicator.style.display = hasUnsavedChanges ? 'inline' : 'none'; } }

    // --- Update progress indicator ---
    function updateProgressIndicator() {
        if (!progressIndicator || typeof assessmentData === 'undefined' || !assessmentData) return;
        let answeredCount = 0;
        const areaCounts = {};
        orderedAreaNames.forEach(areaName => { areaCounts[areaName] = { total: 0, answered: 0 }; });
        assessmentData.forEach(item => { if (item && item.area && areaCounts.hasOwnProperty(item.area)) { areaCounts[item.area].total++; } });
        assessmentData.forEach(item => { if (!item || !item.id) return; const answer = currentAnswers[item.id]; if (answer && answer !== '未回答') { answeredCount++; if (item.area && areaCounts.hasOwnProperty(item.area)) { areaCounts[item.area].answered++; } } });
        const overallPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
        if (overallProgressBar) overallProgressBar.value = overallPercentage;
        if (overallProgressText) overallProgressText.textContent = `${answeredCount} / ${totalQuestions}`;
        if (areaProgressList) {
            areaProgressList.innerHTML = '';
            const areaNamesForProgress = orderedAreaNames;
            areaNamesForProgress.forEach(areaName => {
                 const count = areaCounts[areaName];
                 if (!count) return;
                 const areaPercentage = count.total > 0 ? ((count.answered / count.total) * 100).toFixed(0) : 0;
                 const li = document.createElement('li');
                 li.innerHTML = `<span class="area-name" title="${areaName}">${areaName}</span><span class="area-progress-value">${count.answered}/${count.total} (${areaPercentage}%)</span>`;
                 areaProgressList.appendChild(li);
             });
        }
    }

    // --- Load/Save/Clear Answers ---
    function loadAnswers() {
        console.log("Loading answers...");
        const savedAnswers = localStorage.getItem(STORAGE_KEY);
        if (savedAnswers) { try { currentAnswers = JSON.parse(savedAnswers) || {}; } catch (e) { console.error('Error parsing saved answers:', e); currentAnswers = {}; localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_TIMESTAMP_KEY); } } else { currentAnswers = {}; }
        const savedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
        if (savedTimestamp && lastSavedTimeElement) { try { const timestamp = parseInt(savedTimestamp, 10); if (!isNaN(timestamp)) { lastSavedTimeElement.textContent = new Date(timestamp).toLocaleTimeString('zh-TW', { hour12: false }); } else { lastSavedTimeElement.textContent = '時間記錄無效'; } } catch (e) { console.error('Error parsing saved timestamp:', e); lastSavedTimeElement.textContent = '讀取錯誤'; } } else if (lastSavedTimeElement) { lastSavedTimeElement.textContent = '尚未暫存'; }
        hasUnsavedChanges = false; updateUnsavedIndicator();
    }
    function saveAnswers() {
        console.log('Saving answers...');
        assessmentData.forEach(item => { if (!item || !item.id) return; const r = document.querySelector(`input[name="q${item.id}"]:checked`); if (r) { currentAnswers[item.id] = r.value; } else { delete currentAnswers[item.id]; } });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnswers)); const now = new Date(); const saveTimestamp = now.getTime(); localStorage.setItem(STORAGE_TIMESTAMP_KEY, saveTimestamp); hasUnsavedChanges = false; updateUnsavedIndicator(); showNotification('答案已成功暫存！', 'success'); if (lastSavedTimeElement) { lastSavedTimeElement.textContent = now.toLocaleTimeString('zh-TW', { hour12: false }); } } catch (e) { console.error('Failed to save answers:', e); showNotification('錯誤：無法暫存答案 (可能是儲存空間已滿)。', 'error', 5000); }
    }
    function clearAnswers() {
        console.log('Clearing answers...');
        if (confirm('確定要清除所有已填寫和已保存的答案嗎？此操作無法復原。')) {
            localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_TIMESTAMP_KEY); currentAnswers = {}; document.querySelectorAll('#questionnaire input[type="radio"]').forEach(radio => { radio.checked = false; }); document.querySelectorAll('.assessment-item').forEach(item => { item.classList.remove('item-non-compliant', 'item-needs-answer-flash', 'hidden-by-search'); item.style.borderLeft = ''; }); document.querySelectorAll('.risk-area').forEach(area => { area.classList.remove('hidden-by-search', 'collapsed'); const title = area.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'true'); }); if(questionSearchInput) questionSearchInput.value = ''; searchTerm = ''; hasUnsavedChanges = false; updateUnsavedIndicator(); if (lastSavedTimeElement) { lastSavedTimeElement.textContent = '尚未暫存'; } destroyAllCharts(); if (resultsContainer) resultsContainer.style.display = 'none'; showNotification('已清除所有暫存答案。', 'info'); updateProgressIndicator();
        }
    }

    // --- Render Questionnaire & Collapse/Expand/Search/Sidebar Logic ---
    function renderQuestionnaire() {
        console.log("Rendering questionnaire with collapse structure...");
        if (!questionnaireContainer || typeof assessmentData === 'undefined' || !Array.isArray(assessmentData)) return;
        riskAreas = {};
        assessmentData.forEach(item => { if (!item || !item.id || !item.area || !item.item) return; if (!riskAreas[item.area]) riskAreas[item.area] = []; riskAreas[item.area].push(item); });
        questionnaireContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        let itemsRendered = 0;
        const areaNamesToRender = orderedAreaNames;
        areaNamesToRender.forEach(areaName => {
            if (!riskAreas[areaName]) return;
            const areaDiv = document.createElement('div');
            areaDiv.classList.add('risk-area'); areaDiv.dataset.areaName = areaName;
            const areaTitle = document.createElement('h2');
            areaTitle.textContent = areaName; areaTitle.setAttribute('role', 'button'); areaTitle.setAttribute('tabindex', '0'); areaTitle.setAttribute('aria-expanded', 'true'); areaDiv.appendChild(areaTitle);
            const itemsContainer = document.createElement('div');
            itemsContainer.classList.add(AREA_ITEMS_CONTAINER_CLASS);
            riskAreas[areaName].forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('assessment-item'); itemDiv.dataset.itemId = item.id; itemDiv.id = `item-container-${item.id}`; itemDiv.dataset.searchText = `${item.id} ${item.item} ${areaName}`.toLowerCase();
                const itemText = document.createElement('p'); itemText.textContent = `${item.id}. ${item.item}`; itemDiv.appendChild(itemText);
                const options = ['符合', '未符合', '不適用'];
                options.forEach(option => {
                    const label = document.createElement('label'); const radio = document.createElement('input'); radio.type = 'radio'; radio.name = `q${item.id}`; radio.value = option; if (currentAnswers[item.id] === option) { radio.checked = true; } label.appendChild(radio); label.appendChild(document.createTextNode(` ${option}`)); itemDiv.appendChild(label);
                });
                itemsContainer.appendChild(itemDiv); itemsRendered++;
            });
            areaDiv.appendChild(itemsContainer); fragment.appendChild(areaDiv);
            areaTitle.addEventListener('click', toggleAreaCollapse); areaTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAreaCollapse(e); } });
        });
        questionnaireContainer.appendChild(fragment);
        console.log(`Questionnaire rendered: ${itemsRendered} items, ${areaNamesToRender.length} areas.`);
        if(itemsRendered === 0 && assessmentData.length > 0) questionnaireContainer.innerHTML = '<p style="color: orange;">警告：問卷題目數據有效，但未能成功渲染。</p>';
        else if (itemsRendered === 0) questionnaireContainer.innerHTML = '<p style="color: red;">錯誤：問卷題目數據為空或無效。</p>';
        updateProgressIndicator(); applySearchFilter();
    }
    function toggleAreaCollapse(event) { const areaTitle = event.currentTarget; const areaDiv = areaTitle.closest('.risk-area'); if (!areaDiv) return; const isCollapsed = areaDiv.classList.toggle('collapsed'); areaTitle.setAttribute('aria-expanded', !isCollapsed); }
    function expandAllAreas() { document.querySelectorAll('#questionnaire .risk-area').forEach(areaDiv => { areaDiv.classList.remove('collapsed'); const title = areaDiv.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'true'); }); console.log("All areas expanded."); }
    function collapseAllAreas() { document.querySelectorAll('#questionnaire .risk-area').forEach(areaDiv => { areaDiv.classList.add('collapsed'); const title = areaDiv.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'false'); }); console.log("All areas collapsed."); }
    function applySearchFilter() {
        if (!questionSearchInput) return;
        searchTerm = questionSearchInput.value.trim().toLowerCase();
        const allAreaDivs = questionnaireContainer.querySelectorAll('.risk-area');
        allAreaDivs.forEach(areaDiv => {
            const areaName = (areaDiv.dataset.areaName || '').toLowerCase();
            const allItemDivs = areaDiv.querySelectorAll('.assessment-item');
            let areaHasVisibleItem = false;
            allItemDivs.forEach(itemDiv => { const itemSearchText = itemDiv.dataset.searchText || ''; const isMatch = searchTerm === '' || itemSearchText.includes(searchTerm); itemDiv.classList.toggle('hidden-by-search', !isMatch); if (isMatch) areaHasVisibleItem = true; });
            const areaIsVisible = searchTerm === '' || areaName.includes(searchTerm) || areaHasVisibleItem;
            areaDiv.classList.toggle('hidden-by-search', !areaIsVisible);
            if (areaIsVisible && searchTerm !== '' && !areaName.includes(searchTerm) && areaHasVisibleItem) { if (areaDiv.classList.contains('collapsed')) { areaDiv.classList.remove('collapsed'); const title = areaDiv.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'true'); } }
        });
    }
    function toggleSidebar() { if (!bodyElement || !toggleSidebarButton) return; const isVisible = bodyElement.classList.toggle('sidebar-visible'); const icon = toggleSidebarButton.querySelector('i'); if (icon) { icon.classList.toggle('fa-angles-right', isVisible); icon.classList.toggle('fa-angles-left', !isVisible); } console.log(`Sidebar toggled: ${isVisible ? 'Visible' : 'Hidden'}`); }

    // --- Calculation Logic ---
    function calculateScoresAndCounts() {
        console.log('Calculating scores and counts...');
        let overallCounts = { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 };
        let areaStats = {};
        let nonCompliantList = [];
        let allAnswered = true;
        let firstUnansweredItemId = null;
        orderedAreaNames.forEach(areaName => { const totalItemsInArea = riskAreas[areaName] ? riskAreas[areaName].length : 0; areaStats[areaName] = { compliant: 0, nonCompliant: 0, notApplicable: 0, totalItems: totalItemsInArea, score: 0, applicableItems: 0, unanswered: 0 }; });
        document.querySelectorAll('.assessment-item').forEach(itemEl => itemEl.style.borderLeft = '');
        assessmentData.forEach(item => { if (!item || !item.id) return; const selectedRadio = document.querySelector(`input[name="q${item.id}"]:checked`); const itemElement = document.getElementById(`item-container-${item.id}`); if (selectedRadio) { currentAnswers[item.id] = selectedRadio.value; } else { delete currentAnswers[item.id]; allAnswered = false; if (itemElement && !itemElement.classList.contains('hidden-by-search')) itemElement.style.borderLeft = '3px solid red'; if (firstUnansweredItemId === null && (!itemElement || !itemElement.classList.contains('hidden-by-search'))) { firstUnansweredItemId = item.id; } if (item.area && areaStats[item.area]) { areaStats[item.area].unanswered++; } } });
        if (!allAnswered) { showNotification('請回答所有問題後再計算分數！標示紅框的問題尚未回答。', 'error', 5000); if (firstUnansweredItemId !== null) { const firstUnansweredElement = document.getElementById(`item-container-${firstUnansweredItemId}`); if (firstUnansweredElement) { firstUnansweredElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => { firstUnansweredElement.classList.add('item-needs-answer-flash'); setTimeout(() => { firstUnansweredElement.classList.remove('item-needs-answer-flash'); }, 1500); }, 300); } } if (resultsContainer) resultsContainer.style.display = 'none'; destroyAllCharts(); return null; }
        assessmentData.forEach(item => { if (!item || !item.id || !item.area) return; const value = currentAnswers[item.id]; const areaName = item.area; if (!areaStats[areaName]) return; if (value) { switch (value) { case '符合': overallCounts.compliant++; areaStats[areaName].compliant++; break; case '未符合': overallCounts.nonCompliant++; areaStats[areaName].nonCompliant++; nonCompliantList.push({ id: item.id, item: item.item, area: areaName }); break; case '不適用': overallCounts.notApplicable++; areaStats[areaName].notApplicable++; break; } } else { overallCounts.unanswered++; } });
        let overallApplicableCount = overallCounts.compliant + overallCounts.nonCompliant; let overallScore = overallApplicableCount === 0 ? 0 : (overallCounts.compliant / overallApplicableCount) * 100;
        for (const areaName in areaStats) { const stats = areaStats[areaName]; stats.applicableItems = stats.compliant + stats.nonCompliant; stats.score = stats.applicableItems === 0 ? 0 : (stats.compliant / stats.applicableItems) * 100; }
        console.log("Calculation complete."); return { overallScore, overallCounts, overallApplicableCount, areaStats, nonCompliantList };
    }

    // --- Charting Logic ---
    function destroyAllCharts() {
        let destroyedCount = 0;
        const chartIdsToDestroy = Object.keys(chartInstances); // Get all current chart IDs
        console.log("Attempting to destroy charts with IDs:", chartIdsToDestroy);
        chartIdsToDestroy.forEach(chartId => {
            if (chartInstances[chartId] && typeof chartInstances[chartId].destroy === 'function') {
                try {
                    console.log(`Destroying chart: ${chartId}`);
                    chartInstances[chartId].destroy();
                    destroyedCount++;
                } catch (e) { console.error(`Error destroying chart ${chartId}:`, e); }
            }
            delete chartInstances[chartId]; // Remove from record regardless of success
        });
        if (destroyedCount > 0) console.log(`Destroyed ${destroyedCount} charts.`);
        else console.log("No active chart instances found to destroy.");
    }
    function renderPieChart(canvasId, chartTitle, data, labels, colors) {
        const canvas = document.getElementById(canvasId); if (!canvas) { console.error(`[Render] Pie Canvas ID "${canvasId}" NOT FOUND.`); return; }
        const ctx = canvas.getContext('2d'); if (!ctx) { console.error(`[Render] Failed get 2D context for "${canvasId}".`); return; }
        const chartContainer = canvas.parentElement;
        // No need to explicitly destroy here, destroyAllCharts handles it before renderPieChart is called in displayResults
        try {
             if (typeof Chart === 'undefined') throw new Error("Chart.js is not loaded");
             // Store the new instance
             chartInstances[canvasId] = new Chart(ctx, {
                 type: 'pie',
                 data: { labels: labels, datasets: [{ label: chartTitle, data: data, backgroundColor: colors, hoverOffset: 4, borderColor: '#fff', borderWidth: 1 }] },
                 options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { padding: 15 } }, title: { display: true, text: chartTitle, padding: { top: 10, bottom: 10 }, font: { size: 14 } }, tooltip: { callbacks: { label: function(context) { let label = context.label || ''; if (label) label += ': '; if (context.parsed !== null && context.parsed >= 0) { const total = context.dataset.data.reduce((a, b) => a + b, 0); const perc = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%'; label += `${context.parsed} (${perc})`; } return label; }}} }, onClick: (event, elements) => { if (elements.length > 0) { const clickedElementIndex = elements[0].index; const nonCompliantLabelIndex = chartLabels.indexOf('未符合'); if (clickedElementIndex === nonCompliantLabelIndex && nonCompliantLabelIndex !== -1) { const nonCompliantSection = document.getElementById('non-compliant-items'); if (nonCompliantSection) { nonCompliantSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); nonCompliantSection.style.transition = 'background-color 0.2s ease-in-out'; nonCompliantSection.style.backgroundColor = 'rgba(255, 193, 7, 0.15)'; setTimeout(() => { nonCompliantSection.style.backgroundColor = ''; nonCompliantSection.style.transition = ''; }, 1000); } } } } }
             });
             if(chartContainer) chartContainer.style.minHeight = ''; // Clear error min-height
        } catch (error) {
             console.error(`[Render] FATAL ERROR creating pie chart for ${canvasId}:`, error);
             showNotification(`繪製圖表 "${chartTitle}" 時發生錯誤。`, 'error', 5000);
             // Display error on canvas
             ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#dc3545'; ctx.font = '14px sans-serif'; ctx.fillText('圖表錯誤', canvas.width / 2, canvas.height / 2 > 10 ? canvas.height / 2 : 30); ctx.restore();
             if (chartContainer) chartContainer.style.minHeight = '50px'; // Set min-height for error
        }
    }

    // --- Display Results (Including Radar Chart) ---
    function displayResults(calculatedData) {
        console.log("Displaying results including all-areas radar chart (v9.4)...");
        if (!resultsContainer || !overallScoreContainer || !areaDetailsContainer || !nonCompliantItemsContainer) { console.error("Cannot display: results containers missing."); hideLoading(); return; }

        // --- Clear previous state ---
        document.querySelectorAll('.assessment-item').forEach(itemEl => itemEl.classList.remove('item-non-compliant', 'item-needs-answer-flash'));
        overallScoreContainer.innerHTML = `整體準備度分數: <strong>${calculatedData.overallScore.toFixed(1)}%</strong> (${calculatedData.overallCounts.compliant} 符合 / ${calculatedData.overallApplicableCount} 項適用)`;
        areaDetailsContainer.innerHTML = '';
        destroyAllCharts(); // Destroy ALL previous charts first

        // --- Render Overall Pie Chart ---
        if (overallChartCanvas) {
            renderPieChart('overall-chart', '整體符合性分佈', [calculatedData.overallCounts.compliant, calculatedData.overallCounts.nonCompliant, calculatedData.overallCounts.notApplicable], chartLabels, [chartColors.compliant, chartColors.nonCompliant, chartColors.notApplicable]);
        } else { console.error("Overall chart canvas missing!"); }

        // --- Render All-Areas Radar Chart ---
        const radarCanvasId = 'all-areas-radar-chart';
        const radarCanvas = document.getElementById(radarCanvasId); // Get canvas element
        const allAreaLabels = orderedAreaNames;
        const allAreaScores = [];
        console.log(`Preparing radar chart with ${allAreaLabels.length} areas.`);

        allAreaLabels.forEach(name => {
            if (calculatedData.areaStats[name] !== undefined) {
                allAreaScores.push(calculatedData.areaStats[name].score.toFixed(1));
            } else {
                console.warn(`Area "${name}" not found in calculated data for radar chart.`);
                allAreaScores.push(0); // Assign 0 if score is missing
            }
        });

        if (radarCanvas && allAreaLabels.length > 0) {
            try {
                if (typeof Chart === 'undefined') throw new Error("Chart.js is not loaded");
                const radarCtx = radarCanvas.getContext('2d');
                // Create and store the radar chart instance
                chartInstances[radarCanvasId] = new Chart(radarCtx, {
                    type: 'radar',
                    data: {
                        labels: allAreaLabels,
                        datasets: [{
                            label: '各領域合規分數 (%)',
                            data: allAreaScores,
                            fill: true,
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderColor: 'rgb(255, 99, 132)',
                            pointBackgroundColor: 'rgb(255, 99, 132)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgb(255, 99, 132)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        elements: { line: { borderWidth: 2 } },
                        scales: {
                            r: {
                                angleLines: { display: true },
                                suggestedMin: 0,
                                suggestedMax: 100,
                                ticks: { stepSize: 20 },
                                pointLabels: { font: { size: 10 } } // Smaller font for labels
                            }
                        },
                        plugins: {
                            legend: { display: false }, // Hide legend for single dataset
                            title: { display: true, text: '整體領域合規程度雷達圖' },
                            tooltip: { callbacks: { label: context => `${context.dataset.label || ''}: ${context.parsed.r !== null ? context.parsed.r + '%' : 'N/A'}` } }
                        }
                    }
                });
                const radarContainer = radarCanvas.parentElement;
                if(radarContainer) radarContainer.style.minHeight = ''; // Clear error min-height
            } catch(error) {
                console.error(`[Render] FATAL ERROR creating radar chart for ${radarCanvasId}:`, error);
                showNotification('繪製整體領域雷達圖時發生錯誤。', 'error', 5000);
                const radarCtx = radarCanvas.getContext('2d');
                if (radarCtx) { // Check if context exists before drawing error
                    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height); radarCtx.save(); radarCtx.textAlign = 'center'; radarCtx.fillStyle = '#dc3545'; radarCtx.font = '14px sans-serif'; radarCtx.fillText('雷達圖錯誤', radarCanvas.width / 2, radarCanvas.height / 2 > 10 ? canvas.height / 2 : 30); radarCtx.restore();
                }
                const radarContainer = radarCanvas.parentElement;
                if (radarContainer) radarContainer.style.minHeight = '50px';
            }
        } else if (!radarCanvas) {
            console.error(`Radar chart canvas #${radarCanvasId} not found!`);
        } else { // Canvas exists, but no data
            console.warn("No valid area scores found to render radar chart.");
             const radarCtx = radarCanvas.getContext('2d');
             if (radarCtx) { // Check if context exists
                 radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height); radarCtx.save(); radarCtx.textAlign = 'center'; radarCtx.fillStyle = '#6c757d'; radarCtx.font = '14px sans-serif'; radarCtx.fillText('無領域數據', radarCanvas.width / 2, radarCanvas.height / 2 > 10 ? canvas.height / 2 : 30); radarCtx.restore();
             }
             const radarContainer = radarCanvas.parentElement;
             if (radarContainer) radarContainer.style.minHeight = '50px';
        }
        // --- End of Radar Chart Rendering ---

        // --- Render Individual Area Pie Charts ---
        const areaFragment = document.createDocumentFragment();
        const areaChartRenderQueue = [];
        let areaIndex = 0;
        const areaNamesForResults = orderedAreaNames; // Use the ordered list

        areaNamesForResults.forEach(areaName => {
            const stats = calculatedData.areaStats[areaName];
            const areaDiv = document.createElement('div'); areaDiv.classList.add('area-result-item');
            if (!stats) {
                console.warn(`Stats not found for area "${areaName}" during pie chart prep.`);
                areaDiv.innerHTML = `<p class="area-score-text"><strong>${areaName}:</strong> 資料錯誤</p>`;
            } else {
                const scoreP = document.createElement('p'); scoreP.classList.add('area-score-text'); scoreP.innerHTML = `<strong>${areaName}:</strong> ${stats.score.toFixed(1)}% (${stats.compliant} 符合 / ${stats.applicableItems > 0 ? stats.applicableItems : '無'} 項適用)`; areaDiv.appendChild(scoreP);
                const chartContainer = document.createElement('div'); chartContainer.classList.add('chart-container'); const areaCanvasId = `area-chart-${areaIndex++}`; const areaCanvas = document.createElement('canvas'); areaCanvas.id = areaCanvasId; chartContainer.appendChild(areaCanvas); areaDiv.appendChild(chartContainer);
                areaChartRenderQueue.push({ canvasId: areaCanvasId, title: `${areaName} 分佈`, data: [stats.compliant, stats.nonCompliant, stats.notApplicable], labels: chartLabels, colors: [chartColors.compliant, chartColors.nonCompliant, chartColors.notApplicable] });
            }
            areaFragment.appendChild(areaDiv);
        });
        areaDetailsContainer.appendChild(areaFragment);

        // --- Async Rendering for Area Pies & Non-Compliant List ---
        setTimeout(() => {
            requestAnimationFrame(() => {
                console.log("Executing rAF delayed area pie chart rendering...");
                areaChartRenderQueue.forEach(chartInfo => {
                    renderPieChart(chartInfo.canvasId, chartInfo.title, chartInfo.data, chartInfo.labels, chartInfo.colors); // Call the pie chart renderer
                });
                console.log("Finished rAF delayed area pie chart rendering.");

                // Highlight and List Non-Compliant Items (logic remains the same)
                console.log("Highlighting non-compliant items...");
                const nonCompliant = calculatedData.nonCompliantList;
                nonCompliant.forEach(item => { const el = document.getElementById(`item-container-${item.id}`); if (el) el.classList.add('item-non-compliant'); });
                nonCompliantItemsContainer.innerHTML = ''; const nonCompliantTitle = document.createElement('h4'); const nonCompliantByArea = new Map(); nonCompliant.forEach(item => { if (!nonCompliantByArea.has(item.area)) nonCompliantByArea.set(item.area, []); nonCompliantByArea.get(item.area).push(item); }); const areasWithNonCompliant = orderedAreaNames.filter(areaName => nonCompliantByArea.has(areaName)); let filterHtml = ''; if (nonCompliant.length > 0 && areasWithNonCompliant.length > 0) { filterHtml = `<div class="filter-controls"><label for="filter-noncompliant-area">篩選領域:</label><select id="filter-noncompliant-area"><option value="all">顯示所有領域 (${nonCompliant.length})</option>${areasWithNonCompliant.map(area => `<option value="${area}">${area} (${nonCompliantByArea.get(area).length})</option>`).join('')}</select></div>`; } nonCompliantItemsContainer.insertAdjacentHTML('beforeend', filterHtml); const filterSelect = nonCompliantItemsContainer.querySelector('#filter-noncompliant-area');
                if (nonCompliant.length > 0) {
                    nonCompliantTitle.textContent = `共 ${nonCompliant.length} 項未符合 (點擊可跳轉)：`; const list = document.createElement('ul'); list.id = 'non-compliant-list-ul'; areasWithNonCompliant.forEach(areaName => { nonCompliantByArea.get(areaName).forEach(item => { const li = document.createElement('li'); li.dataset.area = item.area; const link = document.createElement('a'); link.href = `#item-container-${item.id}`; link.innerHTML = `<strong>[${item.area}]</strong> #${item.id}: ${item.item}`; link.addEventListener('click', (e) => { e.preventDefault(); const targetElement = document.getElementById(`item-container-${item.id}`); if(targetElement) { targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); targetElement.style.transition = 'background-color 0.1s ease-in-out'; targetElement.style.backgroundColor = 'rgba(255, 193, 7, 0.3)'; setTimeout(() => { targetElement.style.backgroundColor = ''; targetElement.style.transition = ''; if(calculatedData.nonCompliantList.some(nc => nc.id === item.id)) { targetElement.classList.add('item-non-compliant'); } }, 700); } }); li.appendChild(link); list.appendChild(li); }); }); nonCompliantItemsContainer.appendChild(nonCompliantTitle); nonCompliantItemsContainer.appendChild(list); if (filterSelect) { filterSelect.addEventListener('change', () => { const selectedArea = filterSelect.value; const allListItems = list.querySelectorAll('li'); let visibleCount = 0; allListItems.forEach(li => { const isVisible = selectedArea === 'all' || li.dataset.area === selectedArea; li.style.display = isVisible ? '' : 'none'; if (isVisible) visibleCount++; }); nonCompliantTitle.textContent = selectedArea === 'all' ? `共 ${nonCompliant.length} 項未符合 (點擊可跳轉)：` : `領域 "${selectedArea}" 有 ${visibleCount} 項未符合 (點擊可跳轉)：`; }); }
                } else { nonCompliantTitle.textContent = '待改進項目：'; nonCompliantItemsContainer.appendChild(nonCompliantTitle); nonCompliantItemsContainer.appendChild(document.createTextNode('恭喜！所有適用項目均符合要求。')); const filterControls = nonCompliantItemsContainer.querySelector('.filter-controls'); if (filterControls) filterControls.style.display = 'none'; }

                hideLoading(); // Hide loading indicator
                resultsContainer.style.display = 'block'; // Show results container
                console.log("Results display fully updated.");

                // Scroll to results after a short delay
                setTimeout(() => { resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            });
        }, 100); // Delay for DOM updates
    }

    // --- Export/Import Logic ---
    function calculateSummaryForExport() {
        console.log("Calculating summary for export..."); let summary = { overallScore: 0, areaScores: {}, totalCompliant: 0, totalNonCompliant: 0, totalNotApplicable: 0, totalApplicable: 0, totalItems: assessmentData.length, overallCounts: { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 }, areaCounts: {} }; orderedAreaNames.forEach(areaName => { summary.areaCounts[areaName] = { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 }; summary.areaScores[areaName] = 0; });
        assessmentData.forEach(item => { if (!item || !item.id || !item.area) return; const value = currentAnswers[item.id]; const areaName = item.area; if (!summary.areaCounts.hasOwnProperty(areaName)) { summary.areaCounts[areaName] = { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 }; summary.areaScores[areaName] = 0; } if (value) { switch(value) { case '符合': summary.overallCounts.compliant++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].compliant++; break; case '未符合': summary.overallCounts.nonCompliant++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].nonCompliant++; break; case '不適用': summary.overallCounts.notApplicable++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].notApplicable++; break; } } else { summary.overallCounts.unanswered++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].unanswered++; } });
        summary.totalApplicable = summary.overallCounts.compliant + summary.overallCounts.nonCompliant; summary.totalCompliant = summary.overallCounts.compliant; summary.totalNonCompliant = summary.overallCounts.nonCompliant; summary.totalNotApplicable = summary.overallCounts.notApplicable; summary.overallScore = summary.totalApplicable === 0 ? 0 : (summary.totalCompliant / summary.totalApplicable * 100);
        orderedAreaNames.forEach(areaName => { if (summary.areaCounts[areaName]) { const stats = summary.areaCounts[areaName]; const applicableItems = stats.compliant + stats.nonCompliant; summary.areaScores[areaName] = applicableItems === 0 ? 0 : (stats.compliant / applicableItems * 100); } else { summary.areaScores[areaName] = 0; } });
        return summary;
    }
    function exportData() {
        console.log('Exporting data as CSV...'); assessmentData.forEach(item => { if (!item || !item.id) return; const r = document.querySelector(`input[name="q${item.id}"]:checked`); if (r) { currentAnswers[item.id] = r.value; } else { delete currentAnswers[item.id]; } }); const anyChecked = Object.keys(currentAnswers).length > 0; if (!anyChecked) { showNotification('沒有可導出的答案。請先填寫問卷。', 'warning'); return; }
        const summary = calculateSummaryForExport(); const exportObject = { assessmentDate: new Date().toISOString(), answers: [], summary: summary }; assessmentData.forEach(item => { if (!item || !item.id) return; exportObject.answers.push({ id: item.id, area: item.area || 'N/A', item: item.item || 'N/A', answer: currentAnswers[item.id] || '未回答' }); });
        let csvContent = "\uFEFF"; csvContent += `評估日期:,${exportObject.assessmentDate}\n`; csvContent += `整體準備度分數:,${exportObject.summary.overallScore.toFixed(1)}%\n`; csvContent += `總符合數:,${exportObject.summary.totalCompliant}\n`; csvContent += `總未符合數:,${exportObject.summary.totalNonCompliant}\n`; csvContent += `總不適用數:,${exportObject.summary.totalNotApplicable}\n`; csvContent += `總適用數:,${exportObject.summary.totalApplicable}\n`; csvContent += `總未回答數:,${exportObject.summary.overallCounts.unanswered}\n`; csvContent += `總題數:,${exportObject.summary.totalItems}\n`;
        csvContent += `\n風險領域摘要:\n`; csvContent += `風險領域,分數(%),符合,未符合,不適用,未回答\n`; const areaNamesForExport = orderedAreaNames;
        areaNamesForExport.forEach(area => { const score = exportObject.summary.areaScores[area]; const areaCounts = exportObject.summary.areaCounts[area]; const escapedAreaName = `"${(area || '').replace(/"/g, '""')}"`; if (score === undefined || !areaCounts) { csvContent += `${escapedAreaName},N/A,0,0,0,0\n`; } else { csvContent += `${escapedAreaName},${score.toFixed(1)}%,${areaCounts.compliant},${areaCounts.nonCompliant},${areaCounts.notApplicable},${areaCounts.unanswered}\n`; } });
        csvContent += `\n詳細評估結果:\n`; csvContent += 'ID,風險領域,評估細項,評估結果\n'; exportObject.answers.forEach(row => { const escapedArea = `"${(row.area || '').replace(/"/g, '""')}"`; const escapedItem = `"${(row.item || '').replace(/"/g, '""')}"`; const escapedAnswer = `"${(row.answer || '').replace(/"/g, '""')}"`; csvContent += `${row.id},${escapedArea},${escapedItem},${escapedAnswer}\n`; });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); const filename = `個資評估結果_${timestamp}.csv`; const mimeType = 'text/csv;charset=utf-8;'; const blob = new Blob([csvContent], { type: mimeType });
        if (window.navigator && window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(blob, filename); } else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); showNotification('結果已匯出為 CSV 檔案。', 'success'); }, 100); }
    }
    function parseAndApplyImportedCsv(file) {
        const reader = new FileReader(); reader.onload = (e) => { const text = e.target.result; const importedAnswers = {}; let foundDataSection = false; let parseError = false; let itemsFound = 0; const validAnswers = ['符合', '未符合', '不適用', '未回答']; try { const lines = text.split(/[\r\n]+/); for (const line of lines) { const trimmedLine = line.trim(); if (!trimmedLine) continue; if (trimmedLine.toLowerCase().startsWith('id,風險領域,評估細項,評估結果')) { foundDataSection = true; continue; } if (foundDataSection) { const parts = trimmedLine.split(','); if (parts.length >= 4) { const idStr = parts[0].trim(); let answerStr = parts[parts.length - 1].trim(); if (answerStr.startsWith('"') && answerStr.endsWith('"')) { answerStr = answerStr.substring(1, answerStr.length - 1); } answerStr = answerStr.replace(/""/g, '"'); const id = parseInt(idStr, 10); if (!isNaN(id) && validAnswers.includes(answerStr)) { if (assessmentData.some(item => item && item.id === id)) { importedAnswers[id] = (answerStr === '未回答') ? null : answerStr; itemsFound++; } } } } } if (!foundDataSection) { showNotification('錯誤：CSV 檔案中找不到 "ID,風險領域,評估細項,評估結果" 標頭行。', 'error', 6000); parseError = true; } else if (itemsFound === 0) { showNotification('警告：未找到有效的評估項目答案。', 'warning', 5000); } } catch (error) { console.error("Error parsing CSV:", error); showNotification('解析 CSV 檔案時發生錯誤。', 'error', 5000); parseError = true; } if (!parseError) { console.log(`CSV Parsed. Found ${itemsFound} valid items.`); currentAnswers = {}; document.querySelectorAll('#questionnaire input[type="radio"]').forEach(radio => { radio.checked = false; }); document.querySelectorAll('.assessment-item').forEach(itemEl => { itemEl.classList.remove('item-non-compliant', 'item-needs-answer-flash', 'hidden-by-search'); itemEl.style.borderLeft = ''; }); document.querySelectorAll('.risk-area').forEach(areaEl => { areaEl.classList.remove('hidden-by-search', 'collapsed'); const title = areaEl.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'true');}); if (resultsContainer) resultsContainer.style.display = 'none'; destroyAllCharts(); for (const idStr in importedAnswers) { const id = parseInt(idStr, 10); const answer = importedAnswers[id]; if (answer) { currentAnswers[id] = answer; const radioToCheck = document.querySelector(`input[name="q${id}"][value="${answer}"]`); if (radioToCheck) radioToCheck.checked = true; } else { delete currentAnswers[id]; } } updateProgressIndicator(); hasUnsavedChanges = false; updateUnsavedIndicator(); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_TIMESTAMP_KEY); if (lastSavedTimeElement) lastSavedTimeElement.textContent = '來自匯入'; if (itemsFound > 0) { showNotification(`成功從 ${file.name} 匯入 ${itemsFound} 個項目的答案。`, 'success'); } applySearchFilter(); } importCsvInput.value = ''; }; reader.onerror = (e) => { showNotification(`讀取檔案 "${file.name}" 時發生錯誤。`, 'error'); importCsvInput.value = ''; }; reader.readAsText(file, 'UTF-8');
    }

    // --- Event Listeners ---
    console.log("Setting up event listeners...");
    if (calculateButton) { calculateButton.addEventListener('click', () => { showLoading(); setTimeout(() => { const calculatedData = calculateScoresAndCounts(); if (calculatedData) { displayResults(calculatedData); } else { hideLoading(); } }, 10); }); }
    if (saveButton) saveButton.addEventListener('click', saveAnswers);
    if (exportCsvButton) exportCsvButton.addEventListener('click', exportData);
    if (clearButton) clearButton.addEventListener('click', clearAnswers);
    if (importCsvButton && importCsvInput) { importCsvButton.addEventListener('click', () => importCsvInput.click()); importCsvInput.addEventListener('change', (event) => { const file = event.target.files[0]; if (file) { if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) { if (hasUnsavedChanges && !confirm('您有未儲存的變更，匯入將覆蓋目前答案。確定繼續？')) { importCsvInput.value = ''; return; } if (confirm(`確定從檔案 "${file.name}" 匯入？這將覆蓋目前所有答案。`)) { parseAndApplyImportedCsv(file); } else { importCsvInput.value = ''; } } else { showNotification('請選擇一個 CSV 檔案 (.csv)', 'error'); importCsvInput.value = ''; } } }); }
    if (questionSearchInput) questionSearchInput.addEventListener('input', applySearchFilter);
    if (toggleSidebarButton) toggleSidebarButton.addEventListener('click', toggleSidebar);
    if (expandAllButton) expandAllButton.addEventListener('click', expandAllAreas);
    if (collapseAllButton) collapseAllButton.addEventListener('click', collapseAllAreas);
    if (questionnaireContainer) { questionnaireContainer.addEventListener('change', (event) => { if (event.target.type === 'radio' && event.target.name.startsWith('q')) { const questionIdStr = event.target.name.substring(1); const questionId = parseInt(questionIdStr, 10); if (!isNaN(questionId)) { const previousValue = currentAnswers[questionId]; const newValue = event.target.value; currentAnswers[questionId] = newValue; if (previousValue !== newValue) { hasUnsavedChanges = true; updateUnsavedIndicator(); } updateProgressIndicator(); const itemElement = document.getElementById(`item-container-${questionId}`); if(itemElement) { itemElement.style.borderLeft = ''; itemElement.classList.remove('item-needs-answer-flash'); } } } }); }
    window.addEventListener('beforeunload', (event) => { if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; return ''; } });

    console.log("Event listeners attached.");

    // --- Initialization ---
    console.log('Starting initialization...');
    loadAnswers();
    renderQuestionnaire();
    console.log('Initialization complete.');

}); // End of DOMContentLoaded listener

// --- END OF FILE script.js ---