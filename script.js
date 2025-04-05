// --- START OF FILE script.js ---
// script.js (完整版 - v9.7 - 加入"顯示全部"選項)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing script v9.7 (Show All Option)..."); // 版本更新

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
    const radarChartCanvas = document.getElementById('all-areas-radar-chart');
    const paginationControls = document.getElementById('pagination-controls');
    const prevAreaButton = document.getElementById('prev-area-button');
    const nextAreaButton = document.getElementById('next-area-button');
    const currentAreaInfo = document.getElementById('current-area-info');
    const areaSelect = document.getElementById('area-select');

    // --- Constants and State Variables ---
    const STORAGE_KEY = 'assessmentAnswers';
    const STORAGE_TIMESTAMP_KEY = 'assessmentAnswers_timestamp';
    let riskAreas = {};
    let currentAnswers = {};
    let chartInstances = {};
    let notificationTimeout = null;
    let totalQuestions = 0;
    let hasUnsavedChanges = false;
    let orderedAreaNames = [];
    let searchTerm = '';
    const AREA_ITEMS_CONTAINER_CLASS = 'area-items-container';
    const SHOW_ALL_VALUE = 'all'; // 用於標識"顯示全部"選項的值
    let currentGuidancePopup = null;
    let PLACEHOLDER_GUIDANCE = "此處需要由具備相關專業知識的人員（如法務、資安顧問、內部稽核等）根據最新法規、標準及組織內部情況補充具體說明或指引。";
    // --- Pagination & View State ---
    let currentAreaIndex = 0;
    let isPaginated = true; // 預設啟用分頁
    let isShowingAll = false; // 新增：追蹤是否處於"顯示全部"模式
    // --- END State ---


    // --- Chart Colors & Labels ---
    const chartColors = { compliant: 'rgba(40, 167, 69, 0.8)', nonCompliant: 'rgba(220, 53, 69, 0.8)', notApplicable: 'rgba(108, 117, 125, 0.8)', };
    const chartLabels = ['符合', '未符合', '不適用'];

    // --- Initial Checks ---
    // (保持不變)
    if (!questionnaireContainer) console.error("CRITICAL ERROR: #questionnaire not found!");
    if (typeof window.PLACEHOLDER_GUIDANCE !== 'undefined') { PLACEHOLDER_GUIDANCE = window.PLACEHOLDER_GUIDANCE; }
    if (typeof assessmentData === 'undefined') { console.error("CRITICAL ERROR: assessmentData missing."); if(questionnaireContainer) questionnaireContainer.innerHTML = '<p style="color: red;">錯誤：無法載入問卷題目數據 (assessmentData.js)。</p>'; return; }
    if (typeof assessmentData !== 'undefined' && Array.isArray(assessmentData)) { const seenAreas = new Set(); assessmentData.forEach(item => { if (item && item.area && !seenAreas.has(item.area)) { orderedAreaNames.push(item.area); seenAreas.add(item.area); } }); console.log("Calculated ordered area names:", orderedAreaNames); totalQuestions = assessmentData.length; } else { console.error("CRITICAL ERROR: assessmentData is missing or invalid, cannot determine area order."); if(questionnaireContainer) questionnaireContainer.innerHTML = '<p style="color: red;">錯誤：無法確定領域順序，問卷數據缺失或無效。</p>'; return; }
    if (typeof Chart === 'undefined') console.error("CRITICAL ERROR: Chart.js library missing.");
    if (!radarChartCanvas) console.warn("Warning: Radar chart canvas #all-areas-radar-chart not found!");
    if (!bodyElement) console.error("CRITICAL ERROR: body element not found!");
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
    if (!paginationControls || !prevAreaButton || !nextAreaButton || !currentAreaInfo || !areaSelect) { console.error("ERROR: Pagination elements not found!"); }


    // --- Loading/Notification Controls --- (保持不變)
    function showLoading() { if (loadingIndicator) loadingIndicator.style.display = 'inline-block'; if (calculateButtonText) calculateButtonText.textContent = '計算中...'; if (calculateButton) calculateButton.disabled = true; }
    function hideLoading() { if (loadingIndicator) loadingIndicator.style.display = 'none'; if (calculateButtonText) calculateButtonText.textContent = '計算分數與檢視結果'; if (calculateButton) calculateButton.disabled = false; }
    function showNotification(message, type = 'info', duration = 3500) { if (!notificationArea) { console.warn("Notify fallback:", message); alert(message); return; } if (notificationTimeout) clearTimeout(notificationTimeout); notificationArea.textContent = message; notificationArea.className = 'visible'; notificationArea.classList.add(type); if (duration > 0) { notificationTimeout = setTimeout(() => { notificationArea.className = ''; notificationTimeout = null; }, duration); } }

    // --- Update unsaved changes indicator --- (保持不變)
    function updateUnsavedIndicator() { if (unsavedIndicator) { unsavedIndicator.style.display = hasUnsavedChanges ? 'inline' : 'none'; } }

    // --- Update progress indicator --- (保持不變)
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

    // --- Load/Save/Clear Answers --- (保持不變, clearAnswers 稍作調整)
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
        assessmentData.forEach(item => { if (!item || !item.id) return; const r = document.querySelector(`input[name="q${item.id}"]:checked`); if (r) { currentAnswers[item.id] = r.value; } else { /* Keep potential existing answer in currentAnswers if radio not found (e.g., during import/clear) delete currentAnswers[item.id]; */ } });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnswers)); const now = new Date(); const saveTimestamp = now.getTime(); localStorage.setItem(STORAGE_TIMESTAMP_KEY, saveTimestamp); hasUnsavedChanges = false; updateUnsavedIndicator(); showNotification('答案已成功暫存！', 'success'); if (lastSavedTimeElement) { lastSavedTimeElement.textContent = now.toLocaleTimeString('zh-TW', { hour12: false }); } } catch (e) { console.error('Failed to save answers:', e); showNotification('錯誤：無法暫存答案 (可能是儲存空間已滿)。', 'error', 5000); }
    }
    function clearAnswers() {
        console.log('Clearing answers...');
        if (confirm('確定要清除所有已填寫和已保存的答案嗎？此操作無法復原。')) {
            localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_TIMESTAMP_KEY); currentAnswers = {}; document.querySelectorAll('#questionnaire input[type="radio"]').forEach(radio => { radio.checked = false; }); document.querySelectorAll('.assessment-item').forEach(item => { item.classList.remove('item-non-compliant', 'item-needs-answer-flash', 'hidden-by-search'); item.style.borderLeft = ''; }); document.querySelectorAll('.risk-area').forEach(area => { area.classList.remove('hidden-by-search', 'collapsed', 'visible-area'); area.style.display = 'none'; area.style.opacity = '0'; const title = area.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'false'); }); if(questionSearchInput) questionSearchInput.value = ''; searchTerm = ''; hasUnsavedChanges = false; updateUnsavedIndicator(); if (lastSavedTimeElement) { lastSavedTimeElement.textContent = '尚未暫存'; } destroyAllCharts(); removeGuidancePopup(); if (resultsContainer) resultsContainer.style.display = 'none'; showNotification('已清除所有暫存答案。', 'info'); updateProgressIndicator();
            // --- MODIFIED: Reset pagination to first page and ensure paginated view ---
            isShowingAll = false; // 確保不是顯示全部模式
            currentAreaIndex = 0;
            updatePaginationDisplay(); // 顯示第一個分頁
            // --- END MODIFIED ---
        }
    }

    // --- 說明彈出框的處理函數 --- (保持不變)
    function removeGuidancePopup() {
        if (currentGuidancePopup) {
            currentGuidancePopup.style.opacity = '0';
             setTimeout(() => {
                if (currentGuidancePopup && currentGuidancePopup.parentNode === document.body) {
                    try { document.body.removeChild(currentGuidancePopup); } catch (e) { /* Ignore */ }
                }
                currentGuidancePopup = null;
                document.removeEventListener('click', handleDocumentClickForPopup, true);
            }, 200);
        }
    }
    function showGuidancePopup(event) {
        const icon = event.currentTarget;
        const guidanceText = icon.dataset.guidance;
        event.stopPropagation();
        if (!icon.id) { const itemId = icon.closest('.assessment-item')?.dataset.itemId; icon.id = `help-icon-${itemId || Math.random().toString(36).substring(2, 9)}`; }
        if (currentGuidancePopup && currentGuidancePopup.dataset.sourceIcon === icon.id) { removeGuidancePopup(); return; }
        if (currentGuidancePopup) { try { document.body.removeChild(currentGuidancePopup); } catch(e) {} currentGuidancePopup = null; document.removeEventListener('click', handleDocumentClickForPopup, true); }

        if (guidanceText && guidanceText !== PLACEHOLDER_GUIDANCE) {
            currentGuidancePopup = document.createElement('div');
            currentGuidancePopup.classList.add('guidance-popup');
            currentGuidancePopup.textContent = guidanceText;
            currentGuidancePopup.dataset.sourceIcon = icon.id;
            document.body.appendChild(currentGuidancePopup);
            const iconRect = icon.getBoundingClientRect();
            const popupRect = currentGuidancePopup.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            const spacing = 8;
            let top = iconRect.bottom + scrollY + spacing;
            let left = iconRect.left + scrollX + (iconRect.width / 2) - (popupRect.width / 2);
            const winWidth = window.innerWidth || document.documentElement.clientWidth;
            const winHeight = window.innerHeight || document.documentElement.clientHeight;
            if (top + popupRect.height > winHeight + scrollY) { top = iconRect.top + scrollY - popupRect.height - spacing; if (top < scrollY) top = scrollY + spacing; }
            if (left < scrollX) left = scrollX + spacing;
            if (left + popupRect.width > winWidth + scrollX) left = winWidth + scrollX - popupRect.width - spacing;
            if (left < scrollX) left = scrollX + spacing;
            currentGuidancePopup.style.top = `${top}px`;
            currentGuidancePopup.style.left = `${left}px`;
            requestAnimationFrame(() => { if (currentGuidancePopup) { currentGuidancePopup.style.opacity = '1'; currentGuidancePopup.style.pointerEvents = 'auto'; } });
            setTimeout(() => { document.removeEventListener('click', handleDocumentClickForPopup, true); document.addEventListener('click', handleDocumentClickForPopup, true); }, 0);
        } else if (guidanceText === PLACEHOLDER_GUIDANCE) { console.log(`Help icon clicked for item ${icon.closest('.assessment-item')?.dataset.itemId}, but guidance is a placeholder.`); showNotification("此問題的詳細說明待補充。", "info", 2000); }
    }
    function handleDocumentClickForPopup(event) {
        if (!currentGuidancePopup) return;
        const targetIsIcon = event.target.closest('.help-icon');
        const targetIsPopup = currentGuidancePopup.contains(event.target);
        const sourceIconId = currentGuidancePopup.dataset.sourceIcon;
        const targetIconId = targetIsIcon ? targetIsIcon.id : null;
        if (targetIsPopup || (targetIsIcon && targetIconId === sourceIconId)) { return; }
        removeGuidancePopup();
    }

    // --- MODIFIED: 分頁與顯示全部邏輯 ---
    function updatePaginationDisplay() {
        if (!paginationControls || !prevAreaButton || !nextAreaButton || !currentAreaInfo || !areaSelect) {
            console.error("Pagination elements missing, cannot update display.");
            return;
        }

        removeGuidancePopup(); // 切換視圖時關閉彈出框

        if (isShowingAll) {
            // --- 顯示全部模式 ---
            console.log("Updating display for: Show All");
            isPaginated = false;
            bodyElement.classList.add('show-all-view');
            bodyElement.classList.remove('paginated-view');
            paginationControls.style.display = 'flex'; // 保持控件容器可見，但隱藏按鈕

            // 顯示所有區域
            document.querySelectorAll('#questionnaire .risk-area').forEach(areaDiv => {
                areaDiv.style.display = 'block';
                areaDiv.classList.remove('visible-area'); // 移除單頁標記
                 // 使用 requestAnimationFrame 確保 display 生效後再改透明度
                 requestAnimationFrame(() => { areaDiv.style.opacity = '1'; });
                 // 保留各自的折疊狀態，不強制展開
                 // const title = areaDiv.querySelector('h2');
                 // if(title) title.setAttribute('aria-expanded', !areaDiv.classList.contains('collapsed'));
            });

            // 更新控件狀態
            currentAreaInfo.textContent = `目前顯示：全部領域 (${orderedAreaNames.length})`;
            prevAreaButton.style.display = 'none'; // 隱藏按鈕
            nextAreaButton.style.display = 'none'; // 隱藏按鈕
            if (areaSelect.value !== SHOW_ALL_VALUE) {
                areaSelect.value = SHOW_ALL_VALUE;
            }
             // 確保 expand/collapse all 按鈕文字正確
             if(expandAllButton) expandAllButton.title = "展開所有領域";
             if(collapseAllButton) collapseAllButton.title = "收合所有領域";


        } else {
            // --- 分頁模式 ---
            console.log(`Updating display for: Area ${currentAreaIndex} - ${orderedAreaNames[currentAreaIndex]}`);
            isPaginated = true;
            bodyElement.classList.remove('show-all-view');
            bodyElement.classList.add('paginated-view');
            paginationControls.style.display = 'flex'; // 顯示控件

            // 隱藏所有區域，然後顯示當前區域
            document.querySelectorAll('#questionnaire .risk-area').forEach(areaDiv => {
                areaDiv.classList.remove('visible-area');
                areaDiv.style.display = 'none';
                areaDiv.style.opacity = '0';
            });

            const currentAreaName = orderedAreaNames[currentAreaIndex];
            const currentAreaDiv = document.querySelector(`.risk-area[data-area-name="${CSS.escape(currentAreaName)}"]`);

            if (currentAreaDiv) {
                setTimeout(() => {
                    currentAreaDiv.style.display = 'block';
                    requestAnimationFrame(() => {
                        currentAreaDiv.classList.add('visible-area');
                        currentAreaDiv.style.opacity = '1';
                    });
                }, 50);
                currentAreaDiv.classList.remove('collapsed'); // 預設展開
                const title = currentAreaDiv.querySelector('h2');
                if(title) title.setAttribute('aria-expanded', 'true');
            } else {
                console.error(`Area div not found for: ${currentAreaName}`);
            }

            // 更新控件狀態
            currentAreaInfo.textContent = `目前顯示：${currentAreaName} (${currentAreaIndex + 1} / ${orderedAreaNames.length})`;
            prevAreaButton.style.display = ''; // 顯示按鈕
            nextAreaButton.style.display = ''; // 顯示按鈕
            prevAreaButton.disabled = currentAreaIndex === 0;
            nextAreaButton.disabled = currentAreaIndex === orderedAreaNames.length - 1;
            if (areaSelect.value !== currentAreaName) {
                areaSelect.value = currentAreaName;
            }
             // 更新 expand/collapse all 按鈕文字
             if(expandAllButton) expandAllButton.title = "展開目前領域";
             if(collapseAllButton) collapseAllButton.title = "收合目前領域";
        }
        // 重新應用搜尋（因為顯示的項目可能改變）
        applySearchFilter();
    }

    function goToArea(areaIndexOrName) {
        let targetIndex = -1;
        if (typeof areaIndexOrName === 'number') {
            targetIndex = areaIndexOrName;
        } else if (typeof areaIndexOrName === 'string') {
            targetIndex = orderedAreaNames.indexOf(areaIndexOrName);
        }

        if (targetIndex >= 0 && targetIndex < orderedAreaNames.length) {
            isShowingAll = false; // 切換到特定區域意味著退出"顯示全部"模式
            currentAreaIndex = targetIndex;
            updatePaginationDisplay(); // 更新顯示為分頁模式
        } else {
            console.warn("Invalid area index or name provided to goToArea:", areaIndexOrName);
        }
    }
    // --- END MODIFIED ---

    // --- Render Questionnaire & Collapse/Expand/Search/Sidebar Logic ---
    function renderQuestionnaire() {
        console.log("Rendering questionnaire with 'Show All' support..."); // 更新日誌
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
                const itemTextContainer = document.createElement('div');
                itemTextContainer.classList.add('item-text-container');
                const itemText = document.createElement('p');
                itemText.textContent = `${item.id}. ${item.item}`;
                itemTextContainer.appendChild(itemText);
                if (item.guidance && item.guidance.trim() !== "") {
                    const helpIcon = document.createElement('span');
                    helpIcon.classList.add('help-icon');
                    helpIcon.id = `help-icon-${item.id}-${Math.random().toString(36).substring(2, 9)}`;
                    helpIcon.setAttribute('role', 'button'); helpIcon.setAttribute('aria-label', '查看說明'); helpIcon.tabIndex = 0;
                    helpIcon.innerHTML = '<i class="fas fa-question-circle" aria-hidden="true"></i>';
                    helpIcon.dataset.guidance = item.guidance;
                    helpIcon.addEventListener('click', showGuidancePopup);
                    helpIcon.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showGuidancePopup(e); } });
                    if (item.guidance === PLACEHOLDER_GUIDANCE) { helpIcon.style.opacity = '0.6'; helpIcon.title = "說明待補充"; helpIcon.setAttribute('aria-label', '查看說明 (待補充)'); } else { helpIcon.title = "點擊查看說明"; }
                    itemTextContainer.appendChild(helpIcon);
                }
                itemDiv.appendChild(itemTextContainer);
                const options = ['符合', '未符合', '不適用'];
                const optionsDiv = document.createElement('div');
                optionsDiv.classList.add('item-options');
                options.forEach(option => {
                    const label = document.createElement('label'); const radio = document.createElement('input'); radio.type = 'radio'; radio.name = `q${item.id}`; radio.value = option; if (currentAnswers[item.id] === option) { radio.checked = true; } label.appendChild(radio); label.appendChild(document.createTextNode(` ${option}`));
                    optionsDiv.appendChild(label);
                });
                itemDiv.appendChild(optionsDiv);
                itemsContainer.appendChild(itemDiv); itemsRendered++;
            });
            areaDiv.appendChild(itemsContainer); fragment.appendChild(areaDiv);
            areaTitle.addEventListener('click', toggleAreaCollapse); areaTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAreaCollapse(e); } });
        });
        questionnaireContainer.appendChild(fragment);
        console.log(`Questionnaire rendered: ${itemsRendered} items, ${areaNamesToRender.length} areas.`);
        if(itemsRendered === 0 && assessmentData.length > 0) questionnaireContainer.innerHTML = '<p style="color: orange;">警告：問卷題目數據有效，但未能成功渲染。</p>';
        else if (itemsRendered === 0) questionnaireContainer.innerHTML = '<p style="color: red;">錯誤：問卷題目數據為空或無效。</p>';

        // --- MODIFIED: Populate Area Select Dropdown with "Show All" ---
         if (areaSelect) {
              areaSelect.innerHTML = ''; // Clear previous options
              // Add "Show All" option first
              const showAllOption = document.createElement('option');
              showAllOption.value = SHOW_ALL_VALUE;
              showAllOption.textContent = '顯示全部領域';
              areaSelect.appendChild(showAllOption);
              // Add individual area options
              orderedAreaNames.forEach((name, index) => {
                   const option = document.createElement('option');
                   option.value = name;
                   option.textContent = `${index + 1}. ${name}`;
                   areaSelect.appendChild(option);
              });
              // Set initial selection (default to first area, not "Show All")
               if (orderedAreaNames.length > 0) {
                   areaSelect.value = isShowingAll ? SHOW_ALL_VALUE : orderedAreaNames[currentAreaIndex];
               } else {
                    areaSelect.value = SHOW_ALL_VALUE; // Fallback if no areas
               }
         }
         // --- END MODIFIED ---

        updateProgressIndicator();
        // --- MODIFIED: Initialize display based on state ---
        updatePaginationDisplay(); // Initialize view (either first page or show all)
        // --- END MODIFIED ---
    }
    function toggleAreaCollapse(event) {
        removeGuidancePopup();
        const areaTitle = event.currentTarget;
        const areaDiv = areaTitle.closest('.risk-area');
        if (!areaDiv) return;
        const isCollapsed = areaDiv.classList.toggle('collapsed');
        areaTitle.setAttribute('aria-expanded', !isCollapsed);
    }
    // --- MODIFIED: Expand/Collapse All based on view mode ---
    function expandAllAreas() {
        removeGuidancePopup();
        const areasToToggle = isShowingAll
            ? document.querySelectorAll('#questionnaire .risk-area') // Show All Mode: target all
            : document.querySelectorAll('#questionnaire .risk-area.visible-area'); // Paginated Mode: target visible

        areasToToggle.forEach(areaDiv => {
            areaDiv.classList.remove('collapsed');
            const title = areaDiv.querySelector('h2');
            if (title) title.setAttribute('aria-expanded', 'true');
        });
        console.log(isShowingAll ? "All areas expanded." : "Current area expanded.");
    }
    function collapseAllAreas() {
        removeGuidancePopup();
        const areasToToggle = isShowingAll
            ? document.querySelectorAll('#questionnaire .risk-area') // Show All Mode: target all
            : document.querySelectorAll('#questionnaire .risk-area.visible-area'); // Paginated Mode: target visible

        areasToToggle.forEach(areaDiv => {
            areaDiv.classList.add('collapsed');
            const title = areaDiv.querySelector('h2');
            if (title) title.setAttribute('aria-expanded', 'false');
        });
         console.log(isShowingAll ? "All areas collapsed." : "Current area collapsed.");
    }
    // --- END MODIFIED ---

    // --- MODIFIED: Search filter aware of "Show All" ---
    function applySearchFilter() {
        if (!questionSearchInput) return;
        searchTerm = questionSearchInput.value.trim().toLowerCase();
        const allAreaDivs = questionnaireContainer.querySelectorAll('.risk-area');
        let areasContainingMatches = new Set(); // Track areas with matching items

        allAreaDivs.forEach(areaDiv => {
            const areaName = (areaDiv.dataset.areaName || '').toLowerCase();
            const allItemDivs = areaDiv.querySelectorAll('.assessment-item');
            let areaHasVisibleItem = false; // Used for immediate feedback within the area
            let areaHasAnyMatch = false; // Check if any item matched

            allItemDivs.forEach(itemDiv => {
                const itemSearchText = itemDiv.dataset.searchText || '';
                const isMatch = searchTerm === '' || itemSearchText.includes(searchTerm);
                // Toggle visibility *only if not in show-all view* OR if search term exists
                // In show-all view with empty search, all items should be visible regardless of this class
                itemDiv.classList.toggle('hidden-by-search', !isMatch && (searchTerm !== '' || !isShowingAll));
                if (isMatch) {
                     areaHasVisibleItem = true;
                     areaHasAnyMatch = true;
                }
                // Popup closing logic remains the same
                const helpIcon = itemDiv.querySelector('.help-icon');
                if (!isMatch && currentGuidancePopup && helpIcon && currentGuidancePopup.dataset.sourceIcon === helpIcon.id) { removeGuidancePopup(); }
            });

            const areaNameMatches = searchTerm === '' || areaName.includes(searchTerm);

            if (areaNameMatches || areaHasAnyMatch) {
                 areasContainingMatches.add(areaDiv.dataset.areaName);
            }

            // Show/hide the "no matches" message within an area
            const isCurrentVisibleArea = areaDiv.classList.contains('visible-area') || isShowingAll; // Check if area is visible
             const noMatchesMessageId = `no-matches-${areaDiv.dataset.areaName.replace(/\W+/g, '-')}`;
             let noMatchesDiv = areaDiv.querySelector(`#${noMatchesMessageId}`);

             if (isCurrentVisibleArea && searchTerm !== '' && !areaHasVisibleItem && !areaNameMatches) {
                 if (!noMatchesDiv) {
                     noMatchesDiv = document.createElement('p');
                     noMatchesDiv.id = noMatchesMessageId;
                     noMatchesDiv.textContent = '此領域中無符合搜尋條件的項目。';
                     noMatchesDiv.style.padding = 'var(--space-md)'; noMatchesDiv.style.textAlign = 'center'; noMatchesDiv.style.color = 'var(--color-text-muted)';
                     const itemsContainer = areaDiv.querySelector(`.${AREA_ITEMS_CONTAINER_CLASS}`);
                     if (itemsContainer) { itemsContainer.prepend(noMatchesDiv); } else { areaDiv.appendChild(noMatchesDiv); }
                 }
                 noMatchesDiv.style.display = 'block';
             } else if (noMatchesDiv) {
                 noMatchesDiv.style.display = 'none';
             }

             // In "Show All" mode, also hide entire areas that have no matches at all
             if (isShowingAll) {
                 const areaShouldBeVisible = searchTerm === '' || areaNameMatches || areaHasAnyMatch;
                 areaDiv.style.display = areaShouldBeVisible ? 'block' : 'none';
                 // Ensure opacity is correct when shown/hidden in show-all mode
                  areaDiv.style.opacity = areaShouldBeVisible ? '1' : '0';
             }
        });

        // Update the Area Select dropdown options
        if (areaSelect) {
            const currentSelectedValue = areaSelect.value;
            areaSelect.innerHTML = ''; // Clear existing options

            // Add "Show All" option first
            const showAllOption = document.createElement('option');
            showAllOption.value = SHOW_ALL_VALUE;
            showAllOption.textContent = '顯示全部領域';
            areaSelect.appendChild(showAllOption);

            let foundCurrentInFiltered = (currentSelectedValue === SHOW_ALL_VALUE); // Check if "Show All" was selected

            orderedAreaNames.forEach((name, index) => {
                if (searchTerm === '' || areasContainingMatches.has(name)) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = `${index + 1}. ${name}`;
                    areaSelect.appendChild(option);
                    if (name === currentSelectedValue) {
                        foundCurrentInFiltered = true;
                    }
                }
            });

            // Restore selection or select the most appropriate option
            if (foundCurrentInFiltered) {
                areaSelect.value = currentSelectedValue;
            } else if (areaSelect.options.length > 1) { // More than just "Show All"
                 // If specific area was selected but filtered out, default to "Show All"
                 areaSelect.value = SHOW_ALL_VALUE;
                 // Optionally, trigger the change to Show All view if not already there
                 if (!isShowingAll) {
                     isShowingAll = true;
                     // Need to update display based on this change, but avoid infinite loops
                     // Let the user manually select "Show All" or navigate if needed.
                     // Or trigger updatePaginationDisplay after a small delay:
                     // setTimeout(() => updatePaginationDisplay(), 0);
                      console.log("Search filtered out current area, defaulting dropdown to 'Show All'.");
                 }
            } else {
                 // Only "Show All" is left, select it
                 areaSelect.value = SHOW_ALL_VALUE;
            }
        }
    }
    // --- END MODIFIED ---

    function toggleSidebar() { // (保持不變)
       removeGuidancePopup();
       if (!bodyElement || !toggleSidebarButton) return;
       const isVisible = bodyElement.classList.toggle('sidebar-visible');
       const iconLeft = toggleSidebarButton.querySelector('i.fa-angles-left');
       const iconRight = toggleSidebarButton.querySelector('i.fa-angles-right');
       if(iconLeft && iconRight){ iconLeft.style.display = isVisible ? 'inline-block' : 'none'; iconRight.style.display = !isVisible ? 'inline-block' : 'none'; }
       console.log(`Sidebar toggled: ${isVisible ? 'Visible' : 'Hidden'}`);
    }


    // --- Calculation Logic ---
    // --- MODIFIED: Calculation error handling aware of view mode ---
    function calculateScoresAndCounts() {
        removeGuidancePopup();
        console.log('Calculating scores and counts...');
        let overallCounts = { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 };
        let areaStats = {};
        let nonCompliantList = [];
        let allAnswered = true;
        let firstUnansweredItemId = null;
        let firstUnansweredAreaIndex = -1;

        orderedAreaNames.forEach((areaName, index) => { const totalItemsInArea = (riskAreas[areaName] || []).length; areaStats[areaName] = { compliant: 0, nonCompliant: 0, notApplicable: 0, totalItems: totalItemsInArea, score: 0, applicableItems: 0, unanswered: 0, index: index }; });
        document.querySelectorAll('.assessment-item').forEach(itemEl => { itemEl.style.borderLeft = ''; itemEl.classList.remove('item-needs-answer-flash')});

        assessmentData.forEach(item => {
            if (!item || !item.id) return;
            const selectedRadio = document.querySelector(`input[name="q${item.id}"]:checked`);
            const itemElement = document.getElementById(`item-container-${item.id}`);
            const itemArea = item.area;

            if (selectedRadio) {
                currentAnswers[item.id] = selectedRadio.value;
            } else {
                delete currentAnswers[item.id];
                allAnswered = false;
                if (itemArea && areaStats[itemArea]) areaStats[itemArea].unanswered++;

                // Only mark/track if the item is potentially visible (not hidden by search *unless* in show-all mode)
                 const isPotentiallyVisible = !itemElement?.classList.contains('hidden-by-search') || isShowingAll;

                 if (itemElement && isPotentiallyVisible) {
                     // Apply red border regardless of visibility if unanswered
                     itemElement.style.borderLeft = '3px solid red';
                     if (firstUnansweredItemId === null) {
                         firstUnansweredItemId = item.id;
                         if (itemArea && areaStats[itemArea] !== undefined) {
                             firstUnansweredAreaIndex = areaStats[itemArea].index;
                         }
                     }
                 }
            }
        });

        if (!allAnswered) {
             showNotification('請回答所有問題後再計算分數！標示紅框的問題尚未回答。', 'error', 5000);
             if (firstUnansweredItemId !== null) {
                  const firstUnansweredElement = document.getElementById(`item-container-${firstUnansweredItemId}`);
                  if (firstUnansweredElement) {
                       // If paginated and not on the correct page, navigate first
                       if (!isShowingAll && firstUnansweredAreaIndex !== -1 && currentAreaIndex !== firstUnansweredAreaIndex) {
                            goToArea(firstUnansweredAreaIndex);
                            setTimeout(() => { // Delay scroll/flash until after page transition
                                 firstUnansweredElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 firstUnansweredElement.classList.add('item-needs-answer-flash');
                                 setTimeout(() => { firstUnansweredElement.classList.remove('item-needs-answer-flash'); }, 1500);
                            }, 150);
                       } else {
                            // Already on correct page or showing all, just scroll/flash
                            firstUnansweredElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            firstUnansweredElement.classList.add('item-needs-answer-flash');
                            setTimeout(() => { firstUnansweredElement.classList.remove('item-needs-answer-flash'); }, 1500);
                       }
                  }
             }
             if (resultsContainer) resultsContainer.style.display = 'none';
             destroyAllCharts();
             hideLoading();
             return null;
        }

        // Continue calculation if all answered...
        assessmentData.forEach(item => {
             if (!item || !item.id || !item.area) return;
             const value = currentAnswers[item.id];
             const areaName = item.area;
             if (!areaStats[areaName]) { console.warn(`Area ${areaName} not found in areaStats for item ${item.id}`); return; };
             if (value) {
                 switch (value) {
                     case '符合': overallCounts.compliant++; areaStats[areaName].compliant++; break;
                     case '未符合': overallCounts.nonCompliant++; areaStats[areaName].nonCompliant++; nonCompliantList.push({ id: item.id, item: item.item, area: areaName }); break;
                     case '不適用': overallCounts.notApplicable++; areaStats[areaName].notApplicable++; break;
                 }
             } else { console.warn(`Item ${item.id} has no answer despite allAnswered being true?`); overallCounts.unanswered++; if (areaStats[areaName]) areaStats[areaName].unanswered++; }
         });

        let overallApplicableCount = overallCounts.compliant + overallCounts.nonCompliant; let overallScore = overallApplicableCount === 0 ? 0 : (overallCounts.compliant / overallApplicableCount) * 100;
        for (const areaName in areaStats) { const stats = areaStats[areaName]; stats.applicableItems = stats.compliant + stats.nonCompliant; stats.score = stats.applicableItems === 0 ? 0 : (stats.compliant / stats.applicableItems) * 100; }
        console.log("Calculation complete."); return { overallScore, overallCounts, overallApplicableCount, areaStats, nonCompliantList };
    }
    // --- END MODIFIED ---


    // --- Charting Logic --- (保持不變)
    function destroyAllCharts() {
        removeGuidancePopup();
        let destroyedCount = 0;
        const chartIdsToDestroy = Object.keys(chartInstances);
        console.log("Attempting to destroy charts with IDs:", chartIdsToDestroy);
        chartIdsToDestroy.forEach(chartId => {
            if (chartInstances[chartId] && typeof chartInstances[chartId].destroy === 'function') {
                try { console.log(`Destroying chart: ${chartId}`); chartInstances[chartId].destroy(); destroyedCount++; } catch (e) { console.error(`Error destroying chart ${chartId}:`, e); }
            }
            delete chartInstances[chartId];
        });
        if (destroyedCount > 0) console.log(`Destroyed ${destroyedCount} charts.`); else console.log("No active chart instances found to destroy.");
    }
    function renderPieChart(canvasId, chartTitle, data, labels, colors) {
        const canvas = document.getElementById(canvasId); if (!canvas) { console.error(`[Render] Pie Canvas ID "${canvasId}" NOT FOUND.`); return; }
        const ctx = canvas.getContext('2d'); if (!ctx) { console.error(`[Render] Failed get 2D context for "${canvasId}".`); return; }
        const chartContainer = canvas.parentElement;
        try {
             if (typeof Chart === 'undefined') throw new Error("Chart.js is not loaded");
             if (chartInstances[canvasId] && typeof chartInstances[canvasId].destroy === 'function') { try { chartInstances[canvasId].destroy(); } catch(e) { console.warn(`Minor error destroying previous chart ${canvasId}:`, e)} }
             chartInstances[canvasId] = new Chart(ctx, {
                 type: 'pie',
                 data: { labels: labels, datasets: [{ label: chartTitle, data: data, backgroundColor: colors, hoverOffset: 4, borderColor: '#fff', borderWidth: 1 }] },
                 options: {
                     responsive: true, maintainAspectRatio: false,
                     plugins: {
                         legend: { display: true, position: 'bottom', labels: { padding: 15 } },
                         title: { display: true, text: chartTitle, padding: { top: 10, bottom: 10 }, font: { size: 14 } },
                         tooltip: { callbacks: { label: function(context) { let label = context.label || ''; if (label) label += ': '; if (context.parsed !== null && context.parsed >= 0) { const total = context.dataset.data.reduce((a, b) => a + b, 0); const perc = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%'; label += `${context.parsed} (${perc})`; } return label; } } }
                     },
                     onClick: (event, elements) => {
                         if (elements.length > 0) {
                             removeGuidancePopup();
                             const clickedElementIndex = elements[0].index;
                             const nonCompliantLabelIndex = chartLabels.indexOf('未符合');
                             if (clickedElementIndex === nonCompliantLabelIndex && nonCompliantLabelIndex !== -1) {
                                 const nonCompliantSection = document.getElementById('non-compliant-items');
                                 if (nonCompliantSection) {
                                     nonCompliantSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                     nonCompliantSection.style.transition = 'background-color 0.2s ease-in-out'; nonCompliantSection.style.backgroundColor = 'rgba(255, 193, 7, 0.15)'; setTimeout(() => { nonCompliantSection.style.backgroundColor = ''; nonCompliantSection.style.transition = ''; }, 1000);
                                 }
                             }
                         }
                     }
                 }
             });
             if(chartContainer) chartContainer.style.minHeight = '';
        } catch (error) {
             console.error(`[Render] FATAL ERROR creating pie chart for ${canvasId}:`, error); showNotification(`繪製圖表 "${chartTitle}" 時發生錯誤。`, 'error', 5000);
             ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#dc3545'; ctx.font = '14px sans-serif'; ctx.fillText('圖表錯誤', canvas.width / 2, canvas.height / 2 > 10 ? canvas.height / 2 : 30); ctx.restore();
             if (chartContainer) chartContainer.style.minHeight = '50px';
        }
    }

    // --- Display Results (Including Radar Chart) ---
    // --- MODIFIED: Result link click handler aware of view mode ---
     function displayResults(calculatedData) {
        removeGuidancePopup();
        console.log("Displaying results (Show All aware)...");
        if (!resultsContainer || !overallScoreContainer || !areaDetailsContainer || !nonCompliantItemsContainer) { console.error("Cannot display: results containers missing."); hideLoading(); return; }

        document.querySelectorAll('.assessment-item').forEach(itemEl => itemEl.classList.remove('item-non-compliant', 'item-needs-answer-flash'));
        overallScoreContainer.innerHTML = `整體準備度分數: <strong>${calculatedData.overallScore.toFixed(1)}%</strong> (${calculatedData.overallCounts.compliant} 符合 / ${calculatedData.overallApplicableCount} 項適用)`;
        areaDetailsContainer.innerHTML = '';
        destroyAllCharts();

        if (overallChartCanvas) { renderPieChart('overall-chart', '整體符合性分佈', [calculatedData.overallCounts.compliant, calculatedData.overallCounts.nonCompliant, calculatedData.overallCounts.notApplicable], chartLabels, [chartColors.compliant, chartColors.nonCompliant, chartColors.notApplicable]); }
        else { console.error("Overall chart canvas missing!"); }

        const radarCanvasId = 'all-areas-radar-chart';
        const radarCanvas = document.getElementById(radarCanvasId);
        const allAreaLabels = orderedAreaNames;
        const allAreaScores = [];
        allAreaLabels.forEach(name => { if (calculatedData.areaStats[name] !== undefined) { allAreaScores.push(calculatedData.areaStats[name].score.toFixed(1)); } else { console.warn(`Area "${name}" not found in calculated data for radar chart.`); allAreaScores.push(0); } });

        if (radarCanvas && allAreaLabels.length > 0) {
            try {
                if (typeof Chart === 'undefined') throw new Error("Chart.js is not loaded");
                const radarCtx = radarCanvas.getContext('2d');
                 if (chartInstances[radarCanvasId] && typeof chartInstances[radarCanvasId].destroy === 'function') { try { chartInstances[radarCanvasId].destroy(); } catch(e) { console.warn(`Minor error destroying previous radar chart ${radarCanvasId}:`, e)} }
                chartInstances[radarCanvasId] = new Chart(radarCtx, {
                    type: 'radar',
                    data: { labels: allAreaLabels, datasets: [{ label: '各領域合規分數 (%)', data: allAreaScores, fill: true, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgb(54, 162, 235)', pointBackgroundColor: 'rgb(54, 162, 235)', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgb(54, 162, 235)' }] },
                    options: { responsive: true, maintainAspectRatio: false, elements: { line: { borderWidth: 2 } }, scales: { r: { angleLines: { display: true }, suggestedMin: 0, suggestedMax: 100, ticks: { stepSize: 20, backdropColor: 'rgba(255, 255, 255, 0.75)' }, pointLabels: { font: { size: 10 }, callback: function(label) { if (label.length > 10) { return label.substring(0, 8) + '...'; } return label; } } } }, plugins: { legend: { display: false }, title: { display: true, text: '整體領域合規程度雷達圖', font: { size: 16 } }, tooltip: { callbacks: { label: context => `${context.dataset.label || ''}: ${context.parsed.r !== null ? context.parsed.r + '%' : 'N/A'}` } } } }
                });
                const radarContainer = radarCanvas.parentElement; if(radarContainer) radarContainer.style.minHeight = '';
            } catch(error) { console.error(`[Render] FATAL ERROR creating radar chart for ${radarCanvasId}:`, error); showNotification('繪製整體領域雷達圖時發生錯誤。', 'error', 5000); const radarCtx = radarCanvas.getContext('2d'); if (radarCtx) { radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height); radarCtx.save(); radarCtx.textAlign = 'center'; radarCtx.fillStyle = '#dc3545'; radarCtx.font = '14px sans-serif'; radarCtx.fillText('雷達圖錯誤', radarCanvas.width / 2, radarCanvas.height / 2 > 10 ? radarCanvas.height / 2 : 30); radarCtx.restore(); } const radarContainer = radarCanvas.parentElement; if (radarContainer) radarContainer.style.minHeight = '50px'; }
        } else if (!radarCanvas) { console.error(`Radar chart canvas #${radarCanvasId} not found!`); }
        else { console.warn("No valid area scores found."); const radarCtx = radarCanvas.getContext('2d'); if (radarCtx) { radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height); radarCtx.save(); radarCtx.textAlign = 'center'; radarCtx.fillStyle = '#6c757d'; radarCtx.font = '14px sans-serif'; radarCtx.fillText('無領域數據', radarCanvas.width / 2, radarCanvas.height / 2 > 10 ? radarCanvas.height / 2 : 30); radarCtx.restore(); } const radarContainer = radarCanvas.parentElement; if (radarContainer) radarContainer.style.minHeight = '50px'; }

        const areaFragment = document.createDocumentFragment();
        const areaChartRenderQueue = [];
        let areaIndex = 0;
        const areaNamesForResults = orderedAreaNames;
        areaNamesForResults.forEach(areaName => {
            const stats = calculatedData.areaStats[areaName];
            const areaDiv = document.createElement('div'); areaDiv.classList.add('area-result-item');
            if (!stats) { console.warn(`Stats not found for area "${areaName}" during pie chart prep.`); areaDiv.innerHTML = `<p class="area-score-text"><strong>${areaName}:</strong> 資料錯誤</p>`; }
            else { const scoreP = document.createElement('p'); scoreP.classList.add('area-score-text'); scoreP.innerHTML = `<strong>${areaName}:</strong> ${stats.score.toFixed(1)}% (${stats.compliant} 符合 / ${stats.applicableItems > 0 ? stats.applicableItems : '無'} 項適用)`; areaDiv.appendChild(scoreP); const chartContainer = document.createElement('div'); chartContainer.classList.add('chart-container'); const areaCanvasId = `area-chart-${areaIndex++}`; const areaCanvas = document.createElement('canvas'); areaCanvas.id = areaCanvasId; chartContainer.appendChild(areaCanvas); areaDiv.appendChild(chartContainer); areaChartRenderQueue.push({ canvasId: areaCanvasId, title: `${areaName} 分佈`, data: [stats.compliant, stats.nonCompliant, stats.notApplicable], labels: chartLabels, colors: [chartColors.compliant, chartColors.nonCompliant, chartColors.notApplicable] }); }
            areaFragment.appendChild(areaDiv);
        });
        areaDetailsContainer.appendChild(areaFragment);

        setTimeout(() => {
            requestAnimationFrame(() => {
                areaChartRenderQueue.forEach(chartInfo => { renderPieChart(chartInfo.canvasId, chartInfo.title, chartInfo.data, chartInfo.labels, chartInfo.colors); });

                const nonCompliant = calculatedData.nonCompliantList;
                nonCompliant.forEach(item => { const el = document.getElementById(`item-container-${item.id}`); if (el) el.classList.add('item-non-compliant'); });
                nonCompliantItemsContainer.innerHTML = '';
                const nonCompliantTitle = document.createElement('h4');
                const nonCompliantByArea = new Map();
                nonCompliant.forEach(item => { if (!nonCompliantByArea.has(item.area)) nonCompliantByArea.set(item.area, []); nonCompliantByArea.get(item.area).push(item); });
                const areasWithNonCompliant = orderedAreaNames.filter(areaName => nonCompliantByArea.has(areaName));
                let filterHtml = '';
                if (nonCompliant.length > 0 && areasWithNonCompliant.length > 0) { filterHtml = `<div class="filter-controls"><label for="filter-noncompliant-area">篩選領域:</label><select id="filter-noncompliant-area"><option value="all">顯示所有領域 (${nonCompliant.length})</option>${areasWithNonCompliant.map(area => `<option value="${area}">${area} (${nonCompliantByArea.get(area).length})</option>`).join('')}</select></div>`; }
                nonCompliantItemsContainer.insertAdjacentHTML('beforeend', filterHtml);
                const filterSelect = nonCompliantItemsContainer.querySelector('#filter-noncompliant-area');
                 const listContainer = document.createElement('div'); listContainer.id = 'non-compliant-list-container';

                if (nonCompliant.length > 0) {
                    nonCompliantTitle.textContent = `共 ${nonCompliant.length} 項未符合 (點擊可跳轉)：`;
                    const list = document.createElement('ul'); list.id = 'non-compliant-list-ul';
                    areasWithNonCompliant.forEach(areaName => {
                        nonCompliantByArea.get(areaName).forEach(item => {
                            const li = document.createElement('li'); li.dataset.area = item.area;
                            const link = document.createElement('a');
                            link.dataset.itemId = item.id; link.dataset.itemArea = item.area;
                            link.innerHTML = `<strong>[${item.area}]</strong> #${item.id}: ${item.item}`;

                            // *** MODIFIED CLICK HANDLER aware of view mode ***
                            link.addEventListener('click', (e) => {
                                 e.preventDefault(); removeGuidancePopup();
                                 const targetItemId = e.currentTarget.dataset.itemId;
                                 const targetItemArea = e.currentTarget.dataset.itemArea;
                                 const targetElement = document.getElementById(`item-container-${targetItemId}`);

                                 if (targetElement && targetItemArea) {
                                     const targetAreaIndex = orderedAreaNames.indexOf(targetItemArea);
                                     if (targetAreaIndex !== -1) {
                                          // If paginated and not on the correct page, navigate first
                                          if (!isShowingAll && currentAreaIndex !== targetAreaIndex) {
                                               goToArea(targetAreaIndex);
                                               setTimeout(() => { // Delay scroll/flash
                                                    const elementToScroll = document.getElementById(`item-container-${targetItemId}`);
                                                    if (elementToScroll) {
                                                         elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                         elementToScroll.classList.add('highlight-flash');
                                                         setTimeout(() => { elementToScroll.classList.remove('highlight-flash'); }, 700);
                                                    }
                                               }, 150);
                                          } else {
                                               // Already on correct page or showing all, just scroll/flash
                                               targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                               targetElement.classList.add('highlight-flash');
                                               setTimeout(() => { targetElement.classList.remove('highlight-flash'); }, 700);
                                          }
                                     } else { console.error("Could not find index for area:", targetItemArea); targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                                } else { console.error("Target element or area not found for link click."); }
                            });
                            li.appendChild(link); list.appendChild(li);
                        });
                    });
                     listContainer.appendChild(nonCompliantTitle); listContainer.appendChild(list);
                    if (filterSelect) {
                        filterSelect.addEventListener('change', () => { removeGuidancePopup(); const selectedArea = filterSelect.value; const allListItems = list.querySelectorAll('li'); let visibleCount = 0; allListItems.forEach(li => { const isVisible = selectedArea === 'all' || li.dataset.area === selectedArea; li.style.display = isVisible ? '' : 'none'; if (isVisible) visibleCount++; }); nonCompliantTitle.textContent = selectedArea === 'all' ? `共 ${nonCompliant.length} 項未符合 (點擊可跳轉)：` : `領域 "${selectedArea}" 有 ${visibleCount} 項未符合 (點擊可跳轉)：`; });
                    }
                } else {
                    nonCompliantTitle.textContent = '待改進項目：'; const congratsText = document.createElement('p'); congratsText.textContent = '恭喜！所有適用項目均符合要求。'; congratsText.style.marginTop = '10px'; listContainer.appendChild(nonCompliantTitle); listContainer.appendChild(congratsText);
                    if (filterSelect) filterSelect.parentElement.style.display = 'none';
                }
                 nonCompliantItemsContainer.appendChild(listContainer);

                hideLoading();
                resultsContainer.style.display = 'block';
                console.log("Results display fully updated.");
                setTimeout(() => { resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            });
        }, 100);
    }
    // --- END MODIFIED ---

    // --- Export/Import Logic --- (保持不變)
    function calculateSummaryForExport() {
        removeGuidancePopup();
        console.log("Calculating summary for export...");
        let summary = { overallScore: 0, areaScores: {}, totalCompliant: 0, totalNonCompliant: 0, totalNotApplicable: 0, totalApplicable: 0, totalItems: assessmentData.length, overallCounts: { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 }, areaCounts: {} };
        orderedAreaNames.forEach(areaName => { summary.areaCounts[areaName] = { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 }; summary.areaScores[areaName] = 0; });
        assessmentData.forEach(item => { if (!item || !item.id || !item.area) return; const value = currentAnswers[item.id]; const areaName = item.area; if (!summary.areaCounts.hasOwnProperty(areaName)) { console.warn(`Area ${areaName} not found for item ${item.id} during export summary calc.`); summary.areaCounts[areaName] = { compliant: 0, nonCompliant: 0, notApplicable: 0, unanswered: 0 }; summary.areaScores[areaName] = 0; } if (value) { switch(value) { case '符合': summary.overallCounts.compliant++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].compliant++; break; case '未符合': summary.overallCounts.nonCompliant++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].nonCompliant++; break; case '不適用': summary.overallCounts.notApplicable++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].notApplicable++; break; } } else { summary.overallCounts.unanswered++; if(summary.areaCounts[areaName]) summary.areaCounts[areaName].unanswered++; } });
        summary.totalApplicable = summary.overallCounts.compliant + summary.overallCounts.nonCompliant; summary.totalCompliant = summary.overallCounts.compliant; summary.totalNonCompliant = summary.overallCounts.nonCompliant; summary.totalNotApplicable = summary.overallCounts.notApplicable; summary.overallScore = summary.totalApplicable === 0 ? 0 : (summary.totalCompliant / summary.totalApplicable * 100);
        orderedAreaNames.forEach(areaName => { if (summary.areaCounts[areaName]) { const stats = summary.areaCounts[areaName]; const applicableItems = stats.compliant + stats.nonCompliant; summary.areaScores[areaName] = applicableItems === 0 ? 0 : (stats.compliant / applicableItems * 100); } else { summary.areaScores[areaName] = 0; } });
        return summary;
    }
    function exportData() {
        removeGuidancePopup();
        console.log('Exporting data as CSV...');
        assessmentData.forEach(item => { if (!item || !item.id) return; const r = document.querySelector(`input[name="q${item.id}"]:checked`); if (r) { currentAnswers[item.id] = r.value; } else { delete currentAnswers[item.id]; } });
        const anyAnswered = Object.keys(currentAnswers).length > 0;
        if (!anyAnswered) { const anyCheckedRadio = questionnaireContainer.querySelector('input[type="radio"]:checked'); if (!anyCheckedRadio) { showNotification('沒有可導出的答案。請先填寫問卷。', 'warning'); return; } console.log("Populating currentAnswers from checked radios before export..."); assessmentData.forEach(item => { if (!item || !item.id) return; const r = document.querySelector(`input[name="q${item.id}"]:checked`); if (r) { currentAnswers[item.id] = r.value; } else { delete currentAnswers[item.id]; } }); if (Object.keys(currentAnswers).length === 0) { showNotification('無法讀取已填寫的答案進行匯出。', 'error'); return; } }

        const summary = calculateSummaryForExport();
        let answersForExport = [];
        assessmentData.forEach(item => { if (!item || !item.id) return; answersForExport.push({ id: item.id, area: item.area || 'N/A', item: item.item || 'N/A', answer: currentAnswers[item.id] || '未回答', }); });

        let csvContent = "\uFEFF"; // BOM
        csvContent += `評估日期:,${new Date().toISOString()}\n`;
        csvContent += `整體準備度分數:,${summary.overallScore.toFixed(1)}%\n`;
        csvContent += `總符合數:,${summary.totalCompliant}\n`;
        csvContent += `總未符合數:,${summary.totalNonCompliant}\n`;
        csvContent += `總不適用數:,${summary.totalNotApplicable}\n`;
        csvContent += `總適用數:,${summary.totalApplicable}\n`;
        let unansweredCount = 0; assessmentData.forEach(item => { if (!item || !item.id) return; if (!currentAnswers.hasOwnProperty(item.id)) { unansweredCount++; } });
        csvContent += `總未回答數:,${unansweredCount}\n`;
        csvContent += `總題數:,${totalQuestions}\n`;
        csvContent += `\n風險領域摘要:\n`;
        csvContent += `"風險領域","分數(%)","符合","未符合","不適用","未回答"\n`;
        const areaNamesForExport = orderedAreaNames;
        areaNamesForExport.forEach(area => {
             const score = summary.areaScores[area];
             const areaCounts = summary.areaCounts[area];
             const itemsInArea = (riskAreas[area] || []).length;
             let areaUnanswered = 0; if (riskAreas[area]) { riskAreas[area].forEach(item => { if(!currentAnswers.hasOwnProperty(item.id)) { areaUnanswered++; } }); } else { areaUnanswered = itemsInArea; }
             const escapedAreaName = `"${(area || '').replace(/"/g, '""')}"`;
             if (score === undefined || !areaCounts) { csvContent += `${escapedAreaName},N/A,0,0,0,${itemsInArea}\n`; }
             else { const calculatedUnanswered = itemsInArea - (areaCounts.compliant + areaCounts.nonCompliant + areaCounts.notApplicable); csvContent += `${escapedAreaName},${score.toFixed(1)}%,${areaCounts.compliant},${areaCounts.nonCompliant},${areaCounts.notApplicable},${calculatedUnanswered}\n`; }
        });
        csvContent += `\n詳細評估結果:\n`;
        csvContent += '"ID","風險領域","評估細項","評估結果"\n';
         answersForExport.forEach(row => { const escapedArea = `"${(row.area || '').replace(/"/g, '""')}"`; const escapedItem = `"${(row.item || '').replace(/"/g, '""')}"`; const escapedAnswer = `"${(row.answer || '').replace(/"/g, '""')}"`; csvContent += `${row.id},${escapedArea},${escapedItem},${escapedAnswer}\n`; });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); const filename = `個資評估結果_${timestamp}.csv`; const mimeType = 'text/csv;charset=utf-8;'; const blob = new Blob([csvContent], { type: mimeType });
        if (window.navigator && window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(blob, filename); }
        else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); showNotification('結果已匯出為 CSV 檔案。', 'success'); }, 100); }
    }
    function parseAndApplyImportedCsv(file) { // (保持不變, import 後重置分頁)
         removeGuidancePopup();
         const reader = new FileReader();
         reader.onload = (e) => {
             const text = e.target.result;
             const importedAnswers = {}; let foundDataSection = false; let parseError = false; let itemsFound = 0; const validAnswers = ['符合', '未符合', '不適用', '未回答']; const validQuestionIds = new Map(assessmentData.map(item => [item.id, true]));
             try {
                 const lines = text.split(/[\r\n]+/); let idIndex = -1, answerIndex = -1; let headerFound = false;
                 for (let i = 0; i < lines.length; i++) { const currentLine = lines[i].trim(); if (!currentLine) continue; const lowerLine = currentLine.toLowerCase(); if (lowerLine.includes('"id"') || lowerLine.startsWith('id,')) { const headers = currentLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase()); idIndex = headers.indexOf('id'); answerIndex = headers.findIndex(h => h === '評估結果'); if (answerIndex < 0) answerIndex = headers.indexOf('answer'); if (answerIndex < 0) answerIndex = headers.indexOf('result'); if (idIndex !== -1 && answerIndex !== -1) { foundDataSection = true; headerFound = true; lines.splice(0, i + 1); console.log(`Header found. ID index: ${idIndex}, Answer index: ${answerIndex}`); break; } } }
                 if (!foundDataSection) { showNotification(`錯誤：CSV 檔案中找不到有效的標頭行 (需包含 "ID" 和 "評估結果")。`, 'error', 6000); parseError = true; }
                 else {
                     lines.forEach((line, lineIndex) => {
                         const trimmedLine = line.trim(); if (!trimmedLine) return;
                         const parts = []; let currentPart = ''; let inQuotes = false; for (let char of trimmedLine) { if (char === '"' && !inQuotes) { inQuotes = true; } else if (char === '"' && inQuotes) { if (currentPart.endsWith('"')) { currentPart = currentPart.slice(0, -1) + '"'; } else { inQuotes = false; } } else if (char === ',' && !inQuotes) { parts.push(currentPart); currentPart = ''; } else { currentPart += char; } } parts.push(currentPart);
                         if (parts.length > Math.max(idIndex, answerIndex)) { const idStr = parts[idIndex]?.trim().replace(/^"|"$/g, ''); let answerStr = parts[answerIndex]?.trim().replace(/^"|"$/g, ''); if (idStr && answerStr !== undefined) { answerStr = answerStr.replace(/""/g, '"'); const id = parseInt(idStr, 10); if (!isNaN(id) && validQuestionIds.has(id) && validAnswers.includes(answerStr)) { importedAnswers[id] = (answerStr === '未回答') ? null : answerStr; itemsFound++; } else { console.warn(`Skipping invalid line ${lineIndex + 1}: ID=${idStr}, Answer=${answerStr}`); } } else { console.warn(`Skipping line ${lineIndex + 1} due to missing ID or Answer field:`, parts); } } else { console.warn(`Skipping line ${lineIndex + 1} due to insufficient parts:`, parts); }
                     });
                     if (itemsFound === 0 && lines.filter(l=>l.trim()).length > 0) { showNotification('警告：未找到有效的評估項目答案。請檢查 CSV 格式與內容。', 'warning', 5000); } else if (itemsFound === 0) { showNotification('警告：CSV 文件數據部分為空或格式不符。', 'warning', 5000); }
                 }
             } catch (error) { console.error("Error parsing CSV:", error); showNotification('解析 CSV 檔案時發生嚴重錯誤。請檢查檔案格式。', 'error', 5000); parseError = true; }

             if (!parseError) {
                 console.log(`CSV Parsed. Found ${itemsFound} valid items.`);
                 currentAnswers = {}; document.querySelectorAll('#questionnaire input[type="radio"]').forEach(radio => { radio.checked = false; }); document.querySelectorAll('.assessment-item').forEach(itemEl => { itemEl.classList.remove('item-non-compliant', 'item-needs-answer-flash', 'hidden-by-search'); itemEl.style.borderLeft = ''; }); document.querySelectorAll('.risk-area').forEach(areaEl => { areaEl.classList.remove('hidden-by-search', 'collapsed', 'visible-area'); areaEl.style.display='none'; areaEl.style.opacity='0'; const title = areaEl.querySelector('h2'); if(title) title.setAttribute('aria-expanded', 'false'); });
                 if (resultsContainer) resultsContainer.style.display = 'none'; destroyAllCharts();
                 for (const idStr in importedAnswers) { const id = parseInt(idStr, 10); const answer = importedAnswers[id]; if (answer) { currentAnswers[id] = answer; const radioToCheck = document.querySelector(`input[name="q${id}"][value="${answer}"]`); if (radioToCheck) { radioToCheck.checked = true; } else { console.warn(`Could not find radio button for question ${id} with value ${answer}`); } } else { delete currentAnswers[id]; } }
                 updateProgressIndicator(); hasUnsavedChanges = false; updateUnsavedIndicator(); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_TIMESTAMP_KEY); if (lastSavedTimeElement) lastSavedTimeElement.textContent = '來自匯入'; if (itemsFound > 0) { showNotification(`成功從 ${file.name} 匯入 ${itemsFound} 個項目的答案。`, 'success'); }
                 // --- MODIFIED: Reset pagination after import ---
                 isShowingAll = false; // 匯入後預設為分頁
                 currentAreaIndex = 0;
                 updatePaginationDisplay(); // Show the first page after import
                 // applySearchFilter(); // Already called by updatePaginationDisplay
                 // --- END MODIFIED ---
             }
             importCsvInput.value = '';
         };
         reader.onerror = (e) => { showNotification(`讀取檔案 "${file.name}" 時發生錯誤。`, 'error'); importCsvInput.value = ''; };
         reader.readAsText(file, 'UTF-8');
    }

    // --- Event Listeners ---
    console.log("Setting up event listeners (including pagination and show all)...");
    if (calculateButton) { calculateButton.addEventListener('click', () => { removeGuidancePopup(); showLoading(); setTimeout(() => { const calculatedData = calculateScoresAndCounts(); if (calculatedData) { displayResults(calculatedData); } else { hideLoading(); } }, 10); }); }
    if (saveButton) saveButton.addEventListener('click', () => { removeGuidancePopup(); saveAnswers(); });
    if (exportCsvButton) exportCsvButton.addEventListener('click', () => { removeGuidancePopup(); exportData(); });
    if (clearButton) clearButton.addEventListener('click', () => { removeGuidancePopup(); clearAnswers(); });
    if (importCsvButton && importCsvInput) { importCsvButton.addEventListener('click', () => importCsvInput.click()); importCsvInput.addEventListener('change', (event) => { removeGuidancePopup(); const file = event.target.files[0]; if (file) { if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv") || file.type === "application/vnd.ms-excel") { if (Object.keys(currentAnswers).length > 0 && !confirm('匯入將覆蓋目前所有答案。確定繼續？')) { importCsvInput.value = ''; return; } parseAndApplyImportedCsv(file); } else { showNotification('請選擇一個 CSV 檔案 (.csv)', 'error'); importCsvInput.value = ''; } } }); }
    if (questionSearchInput) questionSearchInput.addEventListener('input', applySearchFilter);
    if (toggleSidebarButton) toggleSidebarButton.addEventListener('click', toggleSidebar);
    if (expandAllButton) expandAllButton.addEventListener('click', expandAllAreas);
    if (collapseAllButton) collapseAllButton.addEventListener('click', collapseAllAreas);

    // --- MODIFIED: Pagination Event Listeners ---
    if (prevAreaButton) {
        prevAreaButton.addEventListener('click', () => {
            if (!isShowingAll && currentAreaIndex > 0) { // 只在分頁模式下有效
                currentAreaIndex--;
                updatePaginationDisplay();
                 window.scrollTo({ top: paginationControls.offsetTop - 20, behavior: 'smooth' });
            }
        });
    }
    if (nextAreaButton) {
        nextAreaButton.addEventListener('click', () => {
            if (!isShowingAll && currentAreaIndex < orderedAreaNames.length - 1) { // 只在分頁模式下有效
                currentAreaIndex++;
                updatePaginationDisplay();
                window.scrollTo({ top: paginationControls.offsetTop - 20, behavior: 'smooth' });
            }
        });
    }
     if (areaSelect) {
         areaSelect.addEventListener('change', (event) => {
              const selectedValue = event.target.value;
              if (selectedValue === SHOW_ALL_VALUE) {
                   isShowingAll = true;
                   isPaginated = false; // 更新狀態
                   updatePaginationDisplay(); // 更新為顯示全部
                   window.scrollTo({ top: 0, behavior: 'smooth' }); // 滾動到頁首
              } else {
                   isShowingAll = false;
                   isPaginated = true; // 更新狀態
                   goToArea(selectedValue); // 跳轉到特定區域 (這會調用 updatePaginationDisplay)
                   window.scrollTo({ top: paginationControls.offsetTop - 20, behavior: 'smooth' });
              }
         });
     }
     // --- END MODIFIED ---

    if (questionnaireContainer) {
        questionnaireContainer.addEventListener('change', (event) => {
            if (event.target.type === 'radio' && event.target.name.startsWith('q')) {
                removeGuidancePopup();
                const questionIdStr = event.target.name.substring(1);
                const questionId = parseInt(questionIdStr, 10);
                if (!isNaN(questionId)) {
                    const previousValue = currentAnswers[questionId];
                    const newValue = event.target.value;
                    currentAnswers[questionId] = newValue;
                    if (previousValue !== newValue || !localStorage.getItem(STORAGE_KEY)) { hasUnsavedChanges = true; updateUnsavedIndicator(); }
                    updateProgressIndicator();
                    const itemElement = document.getElementById(`item-container-${questionId}`);
                    if(itemElement) { itemElement.style.borderLeft = ''; itemElement.classList.remove('item-needs-answer-flash'); }
                }
            }
        });
    }

    window.addEventListener('beforeunload', (event) => { if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; return ''; } });
     window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { removeGuidancePopup(); } });

    console.log("Event listeners attached.");

    // --- Initialization ---
    console.log('Starting initialization (with pagination and show all)...');
    loadAnswers();
    renderQuestionnaire(); // This now renders all areas, adds "Show All", and sets up initial display
    console.log('Initialization complete.');

}); // End of DOMContentLoaded listener

// --- END OF FILE script.js ---