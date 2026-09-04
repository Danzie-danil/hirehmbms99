import { state } from '../state.js';
import { dbSurveys } from '../db.js';

let currentSurveyChannel = null;
let activeSurveyInstance = null;

/**
 * Initialize Realtime Listener for System Surveys & Feedback
 */
export function initSurveyRealtimeListener() {
    // Check on startup
    checkAndShowActiveSurveys();

    // Listen to global data mutation events for sys_surveys
    if (!currentSurveyChannel) {
        try {
            window.addEventListener('bms_data_mutation', (e) => {
                const table = e.detail?.table;
                if (table === 'sys_surveys') {
                    const survey = e.detail?.record;
                    if (survey && survey.status === 'active') {
                        handleIncomingSurvey(survey);
                    } else if (survey && survey.status !== 'active') {
                        const modal = document.getElementById('bmsSurveyModal');
                        if (modal && activeSurveyInstance?.id === survey.id) {
                            closeSurveyModal();
                        }
                    }
                }
            });
            currentSurveyChannel = true;
        } catch (e) {
            console.warn('[Surveys] Error attaching listener:', e);
        }
    }
}

/**
 * Check if there is an active survey targeting the current user
 */
export async function checkAndShowActiveSurveys() {
    try {
        const userRole = state.userRole || (state.profile?.role === 'owner' ? 'owners' : 'managers');
        
        // Don't interrupt sysadmins automatically
        if (state.userRole === 'sysadmin' || state.role === 'sysadmin' || state.profile?.role === 'sysadmin') {
            return;
        }

        const surveys = await dbSurveys.fetchActive();

        if (!surveys || !surveys.length) return;

        const currentUserId = state.user?.id || state.currentUserUuid || state.profile?.id;

        for (const survey of surveys) {
            const isEligible = isUserEligibleForSurvey(survey, userRole);
            if (!isEligible) continue;

            const seenKey = `survey_dismissed_${survey.id}`;
            if (localStorage.getItem(seenKey)) continue;

            // Check if user already submitted a response
            if (currentUserId) {
                const existingResp = await dbSurveys.checkExistingResponse(survey.id, currentUserId);
                if (existingResp) {
                    localStorage.setItem(seenKey, 'completed');
                    continue;
                }
            }

            // Trigger modal for first eligible survey
            renderSurveyModal(survey);
            break;
        }

    } catch (e) {
        console.warn('[Surveys] Error checking active surveys:', e.message);
    }
}

/**
 * Handle incoming realtime survey event
 */
async function handleIncomingSurvey(survey) {
    if (!survey || survey.status !== 'active') return;

    const userRole = state.userRole || (state.profile?.role === 'owner' ? 'owners' : 'managers');
    if (state.userRole === 'sysadmin' || state.role === 'sysadmin' || state.profile?.role === 'sysadmin') return;

    if (!isUserEligibleForSurvey(survey, userRole)) return;

    const seenKey = `survey_dismissed_${survey.id}`;
    if (localStorage.getItem(seenKey)) return;

    const currentUserId = state.user?.id || state.currentUserUuid || state.profile?.id;
    if (!currentUserId) return;

    const existingResp = await dbSurveys.checkExistingResponse(survey.id, currentUserId);
    if (existingResp) return;

    renderSurveyModal(survey);
}


window.handleIncomingSurvey = handleIncomingSurvey;
window.checkAndShowActiveSurveys = checkAndShowActiveSurveys;
window.closeSurveyModal = closeSurveyModal;

/**
 * Check audience eligibility
 */
function isUserEligibleForSurvey(survey, userRole) {
    if (!survey.target_audience || survey.target_audience === 'all') return true;
    if (survey.target_audience === 'owners' && (userRole === 'owner' || userRole === 'owners')) return true;
    if (survey.target_audience === 'managers' && (userRole === 'branch' || userRole === 'managers')) return true;
    return false;
}

/**
 * Render Interactive Multi-Step Survey Overlay
 * (iOS Bottom Sheet on Mobile / Centered Modal on Desktop)
 */
export function renderSurveyModal(survey) {
    if (!survey || !survey.questions || !survey.questions.length) return;

    activeSurveyInstance = survey;

    // Remove any existing survey modal
    let existing = document.getElementById('clientSurveyFeedbackModal');
    if (existing) existing.remove();

    let currentStep = 0;
    const totalSteps = survey.questions.length;
    const answers = {};

    const modal = document.createElement('div');
    modal.id = 'clientSurveyFeedbackModal';
    modal.className = 'fixed inset-0 z-[36000] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 select-none animate-fade-in';
    
    modal.innerHTML = `
        <div id="surveyCard" class="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] transition-all duration-300">
            
            <!-- iOS Mobile Drag Indicator Handle -->
            <div class="sm:hidden w-full pt-2.5 pb-1 flex justify-center shrink-0">
                <div class="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>

            <!-- Top Header & Progress -->
            <div class="p-5 sm:p-6 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div class="flex items-center justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <i data-lucide="sparkles" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-sm font-black text-gray-900 dark:text-white truncate">${escapeHtml(survey.title)}</h3>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Quick Feedback</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span id="surveyStepBadge" class="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                            1 / ${totalSteps}
                        </span>
                        <button id="surveyDismissBtn" title="Maybe Later" class="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <!-- Animated Progress Bar -->
                <div class="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-3">
                    <div id="surveyProgressBar" class="h-full bg-indigo-600 transition-all duration-300 rounded-full" style="width: ${(1 / totalSteps) * 100}%"></div>
                </div>
            </div>

            <!-- Interactive Question Body Container -->
            <div id="surveyQuestionContainer" class="p-5 sm:p-6 overflow-y-auto flex-1 scroller-custom relative">
                <!-- Question content rendered dynamically with slide transition -->
            </div>

            <!-- Bottom Navigation Bar -->
            <div id="surveyFooter" class="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between gap-3 shrink-0">
                <button id="surveyPrevBtn" class="px-4 py-2 rounded-full text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5" disabled>
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Back</span>
                </button>
                <div class="flex items-center gap-2">
                    <button id="surveySkipBtn" class="px-3 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all cursor-pointer">
                        Skip
                    </button>
                    <button id="surveyNextBtn" class="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                        <span>Continue</span>
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const container = document.getElementById('surveyQuestionContainer');
    const stepBadge = document.getElementById('surveyStepBadge');
    const progressBar = document.getElementById('surveyProgressBar');
    const prevBtn = document.getElementById('surveyPrevBtn');
    const nextBtn = document.getElementById('surveyNextBtn');
    const skipBtn = document.getElementById('surveySkipBtn');
    const dismissBtn = document.getElementById('surveyDismissBtn');

    dismissBtn.onclick = () => {
        localStorage.setItem(`survey_dismissed_${survey.id}`, 'dismissed');
        closeSurveyModal();
    };

    skipBtn.onclick = () => {
        advanceQuestion(true);
    };

    prevBtn.onclick = () => {
        if (currentStep > 0) {
            transitionToStep(currentStep - 1, 'prev');
        }
    };

    nextBtn.onclick = () => {
        advanceQuestion(false);
    };

    // Render first step
    renderStep(currentStep, 'init');

    function renderStep(stepIndex, direction = 'next') {
        const q = survey.questions[stepIndex];
        if (!q) return;

        currentStep = stepIndex;
        stepBadge.textContent = `${stepIndex + 1} / ${totalSteps}`;
        progressBar.style.width = `${((stepIndex + 1) / totalSteps) * 100}%`;
        prevBtn.disabled = stepIndex === 0;

        const isLastStep = stepIndex === totalSteps - 1;
        nextBtn.innerHTML = isLastStep 
            ? `<span>Submit</span><i data-lucide="check" class="w-3.5 h-3.5"></i>` 
            : `<span>Continue</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>`;

        let qHtml = `
            <div class="survey-step-content space-y-4 transition-all duration-300">
                <div class="space-y-1">
                    <h4 class="text-base font-extrabold text-gray-900 dark:text-white leading-snug">${escapeHtml(q.text || q.question || '')}</h4>
                    ${q.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 font-medium">${escapeHtml(q.description)}</p>` : ''}
                </div>
                <div class="pt-1">
        `;

        const savedAnswer = answers[q.id || `q_${stepIndex}`];

        // 1. Single Choice
        if (q.type === 'single_choice' || !q.type) {
            const options = q.options || ['Strongly Agree', 'Agree', 'Neutral', 'Disagree'];
            qHtml += `<div class="space-y-2">`;
            options.forEach((opt, idx) => {
                const isSelected = savedAnswer === opt;
                qHtml += `
                    <button type="button" data-option="${escapeHtml(opt)}" class="survey-option-btn w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected 
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs' 
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-800 dark:text-gray-200'
                    }">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 group-hover:text-indigo-600'
                            }">
                                ${String.fromCharCode(65 + idx)}
                            </span>
                            <span class="text-xs font-semibold truncate">${escapeHtml(opt)}</span>
                        </div>
                        <i data-lucide="${isSelected ? 'check-circle-2' : 'circle'}" class="w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'} shrink-0"></i>
                    </button>
                `;
            });
            qHtml += `</div>`;
        }

        // 2. Multiple Choice
        else if (q.type === 'multiple_choice') {
            const options = q.options || ['Option 1', 'Option 2', 'Option 3'];
            const currentSelected = Array.isArray(savedAnswer) ? savedAnswer : [];
            qHtml += `<div class="space-y-2">`;
            options.forEach((opt) => {
                const isChecked = currentSelected.includes(opt);
                qHtml += `
                    <label class="survey-checkbox-label w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isChecked 
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold' 
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }">
                        <span class="text-xs font-semibold">${escapeHtml(opt)}</span>
                        <input type="checkbox" value="${escapeHtml(opt)}" class="survey-multi-check w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" ${isChecked ? 'checked' : ''}>
                    </label>
                `;
            });
            qHtml += `</div>`;
        }

        // 3. Rating Scale (1 to 5 Stars)
        else if (q.type === 'rating') {
            const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
            const currentRating = parseInt(savedAnswer) || 0;

            qHtml += `
                <div class="flex flex-col items-center justify-center py-4 space-y-4">
                    <div class="flex items-center justify-center gap-2 sm:gap-3">
            `;
            for (let r = 1; r <= 5; r++) {
                const isRated = currentRating >= r;
                const isExact = currentRating === r;
                qHtml += `
                    <button type="button" data-rating="${r}" class="survey-rating-btn flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                        isExact 
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 scale-105 shadow-md shadow-indigo-600/10' 
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }">
                        <i data-lucide="star" class="w-6 h-6 ${isRated ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}"></i>
                        <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">${labels[r - 1]}</span>
                    </button>
                `;
            }
            qHtml += `
                    </div>
                </div>
            `;
        }

        // 4. Open Text
        else if (q.type === 'text') {
            qHtml += `
                <div class="space-y-2">
                    <textarea id="surveyTextInput" rows="4" placeholder="${escapeHtml(q.placeholder || 'Type your honest feedback here...')}" class="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none">${escapeHtml(savedAnswer || '')}</textarea>
                    <div class="flex justify-between items-center text-[10px] text-gray-400 font-medium px-1">
                        <span>Your response is valuable to our development</span>
                        <span id="surveyCharCount">0 chars</span>
                    </div>
                </div>
            `;
        }

        qHtml += `</div></div>`;
        container.innerHTML = qHtml;
        if (window.lucide) window.lucide.createIcons();

        // Bind interactive events
        bindStepInteractions(q, stepIndex);
    }

    function bindStepInteractions(q, stepIndex) {
        const qKey = q.id || `q_${stepIndex}`;

        // Single Choice: Instant auto-advance on click
        container.querySelectorAll('.survey-option-btn').forEach(btn => {
            btn.onclick = () => {
                const optVal = btn.getAttribute('data-option');
                answers[qKey] = optVal;

                // Visual highlight
                container.querySelectorAll('.survey-option-btn').forEach(b => {
                    b.classList.remove('border-indigo-600', 'bg-indigo-50/70', 'dark:bg-indigo-950/40', 'font-bold');
                    b.classList.add('border-gray-200', 'dark:border-gray-800');
                });
                btn.classList.add('border-indigo-600', 'bg-indigo-50/70', 'dark:bg-indigo-950/40', 'font-bold');

                // Smooth ease-out auto-advance
                setTimeout(() => {
                    advanceQuestion(false);
                }, 220);
            };
        });

        // Multiple Choice: Checkbox toggles
        container.querySelectorAll('.survey-multi-check').forEach(chk => {
            chk.onchange = () => {
                const selected = [];
                container.querySelectorAll('.survey-multi-check:checked').forEach(c => selected.push(c.value));
                answers[qKey] = selected;
            };
        });

        // Rating: Instant auto-advance on click
        container.querySelectorAll('.survey-rating-btn').forEach(btn => {
            btn.onclick = () => {
                const rVal = btn.getAttribute('data-rating');
                answers[qKey] = parseInt(rVal);

                container.querySelectorAll('.survey-rating-btn').forEach(b => b.classList.remove('border-indigo-600', 'bg-indigo-50', 'scale-105'));
                btn.classList.add('border-indigo-600', 'bg-indigo-50', 'scale-105');

                setTimeout(() => {
                    advanceQuestion(false);
                }, 220);
            };
        });

        // Open Text: typing listener
        const textInput = document.getElementById('surveyTextInput');
        if (textInput) {
            const charCount = document.getElementById('surveyCharCount');
            textInput.oninput = () => {
                answers[qKey] = textInput.value;
                if (charCount) charCount.textContent = `${textInput.value.length} chars`;
            };
            textInput.focus();
        }
    }

    function advanceQuestion(isSkip = false) {
        const q = survey.questions[currentStep];
        const qKey = q.id || `q_${currentStep}`;

        if (!isSkip && q.type === 'text') {
            const textInput = document.getElementById('surveyTextInput');
            if (textInput) answers[qKey] = textInput.value.trim();
        }

        if (currentStep < totalSteps - 1) {
            transitionToStep(currentStep + 1, 'next');
        } else {
            submitSurvey();
        }
    }

    function transitionToStep(newStep, direction) {
        const currentContent = container.querySelector('.survey-step-content');
        if (currentContent) {
            // Slide ease-out animation
            currentContent.style.transform = direction === 'next' ? 'translateX(-30px)' : 'translateX(30px)';
            currentContent.style.opacity = '0';
        }

        setTimeout(() => {
            renderStep(newStep, direction);
            const newContent = container.querySelector('.survey-step-content');
            if (newContent) {
                newContent.style.transform = direction === 'next' ? 'translateX(30px)' : 'translateX(-30px)';
                newContent.style.opacity = '0';
                setTimeout(() => {
                    newContent.style.transform = 'translateX(0)';
                    newContent.style.opacity = '1';
                }, 20);
            }
        }, 150);
    }

    async function submitSurvey() {
        // Render submitting loader in container
        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <svg 
                    class="animate-spin w-12 h-12 text-indigo-600 dark:text-indigo-400" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2.5" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                >
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <p class="text-xs font-bold text-gray-500 dark:text-gray-400">Submitting your response...</p>
            </div>
        `;
        document.getElementById('surveyFooter').style.display = 'none';

        try {
            const userRole = state.userRole || (state.profile?.role === 'owner' ? 'owner' : 'branch_manager');
            const currentUserId = state.user?.id || state.currentUserUuid || state.profile?.id;
            await dbSurveys.submitResponse({
                p_survey_id: survey.id,
                p_answers: answers,
                p_user_role: userRole,
                p_user_id: currentUserId
            });

            // Render Celebration Screen
            renderCelebrationScreen();
        } catch (e) {
            console.error('[Surveys] Error submitting response:', e);
            container.innerHTML = `
                <div class="py-8 text-center space-y-3">
                    <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                    </div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white">Submission Issue</h4>
                    <p class="text-xs text-gray-400">Failed to save response. Please try again later.</p>
                    <button onclick="document.getElementById('clientSurveyFeedbackModal')?.remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-bold">Close</button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }


    function renderCelebrationScreen() {
        localStorage.setItem(`survey_dismissed_${survey.id}`, 'completed');
        container.innerHTML = `
            <div class="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div class="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                    <i data-lucide="check-circle-2" class="w-8 h-8"></i>
                </div>
                <div class="space-y-1">
                    <h3 class="text-base font-black text-gray-900 dark:text-white">Thank you for your feedback!</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto">Your insights directly shape future enhancements and speed optimizations across BMS.</p>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        // Auto close after 2.2 seconds
        setTimeout(() => {
            closeSurveyModal();
        }, 2200);
    }
}

/**
 * Close Survey Modal with fade-out
 */
export function closeSurveyModal() {
    const modal = document.getElementById('clientSurveyFeedbackModal');
    if (modal) {
        modal.classList.add('opacity-0', 'transition-opacity', 'duration-200');
        setTimeout(() => {
            modal.remove();
            activeSurveyInstance = null;
        }, 200);
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
