import { supabase } from '../supabase.js';
import { showToast, showLoader, hideLoader } from '../utils.js';
import { renderAdminSubnav } from './dashboard.js';
import { renderSurveyModal } from '../ui/surveyModal.js';

let surveysList = [];
let surveyResponsesList = [];
let activeSurveySubTab = 'studio';
let editingSurveyId = null;
let surveyAutosaveTimeout = null;
let surveyKpiSummary = {
    total_surveys: 0,
    active_surveys: 0,
    total_responses: 0,
    avg_satisfaction: null
};

// Dynamic Question Builder State
let builderQuestions = [
    {
        id: 'q1',
        text: 'How satisfied are you with overall system speed and reliability?',
        type: 'rating',
        scale: 5,
        required: true
    },
    {
        id: 'q2',
        text: 'Which platform section do you use most frequently?',
        type: 'single_choice',
        options: ['POS & Sales Terminal', 'Stock & Inventory Hub', 'Financial Reports Suite', 'Team & Task Manager'],
        required: true
    },
    {
        id: 'q3',
        text: 'What feature or tool would make BMS even better for your workflow?',
        type: 'text',
        placeholder: 'Tell us your suggestions or feature ideas...',
        required: false
    }
];

window.switchSurveySubTab = function(tab) {
    activeSurveySubTab = tab;
    renderFeedbackAndSurveysModule(tab);
};

export async function renderFeedbackAndSurveysModule(subTab = activeSurveySubTab) {
    activeSurveySubTab = subTab;
    const container = document.getElementById('mainContent');
    if (!container) return;

    showLoader('Loading Feedback & Surveys...');
    await loadSurveysData();
    hideLoader();

    const activeCount = surveyKpiSummary.active_surveys || surveysList.filter(s => s.status === 'active').length;
    const subnavHtml = renderAdminSubnav(subTab, [
        { id: 'studio', label: 'Survey Form', icon: 'clipboard-list', badge: 'Creator' },
        { id: 'ledger', label: 'Surveys & Response Ledger', icon: 'bar-chart-2', badge: activeCount ? `${activeCount} live` : null }
    ], 'window.switchSurveySubTab');

    let contentHtml = '';
    if (subTab === 'studio') {
        contentHtml = renderStudioView();
    } else {
        contentHtml = renderLedgerView();
    }

    const totalSurveys = surveyKpiSummary.total_surveys || surveysList.length;
    const activeSurveys = surveyKpiSummary.active_surveys || surveysList.filter(s => s.status === 'active').length;
    const totalResponses = surveyKpiSummary.total_responses || surveyResponsesList.length;
    const avgScoreDisplay = surveyKpiSummary.avg_satisfaction !== null && surveyKpiSummary.avg_satisfaction !== undefined
        ? surveyKpiSummary.avg_satisfaction
        : calculateAverageSatisfaction();

    container.innerHTML = `
    <div class="space-y-4 sm:space-y-6 slide-in w-full pb-24 sm:pb-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3.5">
            <div>
                <h1 class="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm sm:text-base shrink-0">
                        <i data-lucide="clipboard-check" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                    </span>
                    Feedback and Survey
                </h1>
                <p class="hidden sm:block text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Real-Time Multi-Step Questionnaires & Tenant Sentiment Engine</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button onclick="loadSurveysData().then(() => renderFeedbackAndSurveysModule(activeSurveySubTab))" class="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                </button>
                <button onclick="window.resetSurveyBuilder()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Survey
                </button>
            </div>
        </div>

        <!-- Metric KPI Cards (Computed on Supabase Server-Side) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <i data-lucide="clipboard-check" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${totalSurveys}</h3>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 font-bold">Total Surveys</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <i data-lucide="radio" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${activeSurveys}</h3>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 font-bold">Active Realtime</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <i data-lucide="message-square-heart" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${totalResponses}</h3>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 font-bold">Responses</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-amber-50 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <i data-lucide="star" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${avgScoreDisplay || '—'}</h3>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 font-bold">Avg Rating / 5</p>
                </div>
            </div>
        </div>

        <!-- Subnav Tabs -->
        ${subnavHtml}

        <!-- Tab Content -->
        ${contentHtml}
    </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

async function loadSurveysData() {
    try {
        // Fetch survey records and execute server-side KPI computation RPC in parallel
        const [surveysRes, kpiRes] = await Promise.allSettled([
            supabase.from('sys_surveys').select('*').order('created_at', { ascending: false }),
            supabase.rpc('get_sys_survey_kpi_summary')
        ]);

        surveysList = surveysRes.status === 'fulfilled' ? (surveysRes.value.data || []) : [];

        if (kpiRes.status === 'fulfilled' && kpiRes.value.data && !kpiRes.value.error) {
            surveyKpiSummary = kpiRes.value.data;
        } else {
            // Fallback if RPC is pending migration: fetch counts
            const { count: respCount } = await supabase.from('sys_survey_responses').select('*', { count: 'exact', head: true });
            surveyKpiSummary = {
                total_surveys: surveysList.length,
                active_surveys: surveysList.filter(s => s.status === 'active').length,
                total_responses: respCount || 0,
                avg_satisfaction: null
            };
        }
    } catch (e) {
        console.error('[Surveys] Error loading data:', e);
    }
}

function calculateAverageSatisfaction() {
    if (!surveyResponsesList.length) return '—';
    let totalScore = 0;
    let ratingCount = 0;

    surveyResponsesList.forEach(r => {
        if (r.answers && typeof r.answers === 'object') {
            Object.values(r.answers).forEach(val => {
                const num = Number(val);
                if (!isNaN(num) && num >= 1 && num <= 5) {
                    totalScore += num;
                    ratingCount++;
                }
            });
        }
    });

    return ratingCount > 0 ? (totalScore / ratingCount).toFixed(1) : '—';
}

function renderStudioView() {
    return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        <!-- Survey Metadata & Question Studio (8 cols) -->
        <div class="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 space-y-5">
            
            <div class="border-b border-gray-100 dark:border-gray-700/50 pb-3 flex items-center justify-between">
                <div>
                    <h3 class="text-base font-black text-gray-900 dark:text-white">Survey Form</h3>
                </div>
                <div id="surveyAutosaveBadge" class="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                    <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
                    <span>Autosave active (3s)</span>
                </div>
            </div>

            <!-- Campaign Info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Survey Title <span class="text-red-500">*</span></label>
                    <input type="text" id="surveyBuilderTitle" oninput="window.onSurveyBuilderInput()" placeholder="e.g. BMS Q3 Platform Experience Survey" value="${escapeHtml(editingSurveyId ? surveysList.find(s => s.id === editingSurveyId)?.title || '' : 'Platform Experience & Feedback')}" class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                    ${window.renderPremiumSelect ? window.renderPremiumSelect({
                        id: 'surveyAudienceSelect',
                        selectedValue: editingSurveyId ? surveysList.find(s => s.id === editingSurveyId)?.target_audience || 'all' : 'all',
                        options: [
                            { value: 'all', label: 'All Platform Users (Owners & Managers)', icon: 'globe' },
                            { value: 'owners', label: 'Business Owners Only', icon: 'briefcase' },
                            { value: 'managers', label: 'Branch Managers Only', icon: 'store' }
                        ],
                        onChange: 'window.onSurveyBuilderInput()',
                        searchable: false,
                        classes: 'w-full !py-2.5 !text-xs !bg-gray-50 dark:!bg-gray-900 !border-gray-200 dark:!border-gray-700'
                    }) : ''}
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Subtitle / User Incentive (Optional)</label>
                <input type="text" id="surveyBuilderDesc" oninput="window.onSurveyBuilderInput()" placeholder="e.g. Help us tailor new features to your business needs (takes ~30s)" value="${escapeHtml(editingSurveyId ? surveysList.find(s => s.id === editingSurveyId)?.description || '' : 'Help us tailor new features to your business needs')}" class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>

            <!-- Dynamic Question List -->
            <div class="space-y-3 pt-2">
                <div class="flex items-center justify-between">
                    <h4 class="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">Questions (${builderQuestions.length})</h4>
                    <button type="button" onclick="window.addSurveyQuestion()" class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Question
                    </button>
                </div>

                <div id="surveyQuestionsContainer" class="space-y-3.5">
                    ${renderQuestionCards()}
                </div>
            </div>

            <!-- Studio Action Buttons -->
            <div class="pt-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button type="button" onclick="window.previewSurveyInBuilder()" class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i data-lucide="smartphone" class="w-4 h-4"></i> Test & Preview Overlay
                </button>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button type="button" onclick="window.saveSurveyCampaign(false)" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <i data-lucide="save" class="w-3.5 h-3.5"></i> Save Draft
                    </button>
                    <button type="button" onclick="window.saveSurveyCampaign(true)" class="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i> Publish
                    </button>
                </div>
            </div>
        </div>

        <!-- Active Campaigns Sidebar (4 cols) -->
        <div class="lg:col-span-4 space-y-4">

            <!-- Active Campaigns Quick List -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 space-y-3">
                <h4 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Currently Live Surveys</h4>
                <div class="space-y-2">
                    ${surveysList.filter(s => s.status === 'active').length ? surveysList.filter(s => s.status === 'active').map(s => `
                        <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
                            <div class="min-w-0">
                                <h5 class="text-xs font-bold text-gray-900 dark:text-white truncate">${escapeHtml(s.title)}</h5>
                                <p class="text-[10px] text-gray-400 font-medium">${(s.questions || []).length} questions • ${s.target_audience}</p>
                            </div>
                            <button onclick="window.openSurveyAnalyticsModal('${s.id}')" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold hover:bg-indigo-100 shrink-0 cursor-pointer">
                                Stats
                            </button>
                        </div>
                    `).join('') : `
                        <div class="py-6 text-center text-gray-400 text-xs italic">No live surveys running right now.</div>
                    `}
                </div>
            </div>

        </div>

    </div>
    `;
}

function renderQuestionCards() {
    return builderQuestions.map((q, qIdx) => `
        <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/70 space-y-3 relative group">
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 dark:border-gray-700/50 pb-2.5">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                        ${qIdx + 1}
                    </span>
                    <span class="text-xs font-black uppercase text-gray-600 dark:text-gray-300">Question ${qIdx + 1}</span>
                </div>
                
                <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div class="flex-1 sm:flex-none">
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: `surveyQType_${qIdx}`,
                            selectedValue: q.type || 'single_choice',
                            options: [
                                { value: 'single_choice', label: 'Single Choice (Auto-Advance)', icon: 'check-circle' },
                                { value: 'multiple_choice', label: 'Multiple Choice (Multi-Select)', icon: 'check-square' },
                                { value: 'rating', label: '1-5 Star / Emoji Rating Scale', icon: 'star' },
                                { value: 'text', label: 'Open Feedback Text / Comments', icon: 'message-square' }
                            ],
                            onChange: `window.setSurveyQuestionType(${qIdx}, value)`,
                            searchable: false,
                            classes: 'w-full sm:w-56 !py-1.5 !px-2.5 !text-xs !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700'
                        }) : ''}
                    </div>

                    <button type="button" onclick="window.removeSurveyQuestion(${qIdx})" class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0" title="Delete Question">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- Question Text Input -->
            <div>
                <input type="text" placeholder="Enter question prompt..." value="${escapeHtml(q.text || '')}" oninput="window.updateQuestionText(${qIdx}, this.value)" class="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none">
            </div>

            <!-- Options builder for single/multi choice -->
            ${(q.type === 'single_choice' || q.type === 'multiple_choice') ? `
                <div class="space-y-2 pt-1">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selectable Replies / Options</label>
                    <div class="space-y-1.5">
                        ${(q.options || []).map((opt, optIdx) => `
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-gray-400 w-4 text-center">${String.fromCharCode(65 + optIdx)}</span>
                                <input type="text" value="${escapeHtml(opt)}" oninput="window.updateQuestionOption(${qIdx}, ${optIdx}, this.value)" placeholder="Option text..." class="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none">
                                <button type="button" onclick="window.removeSurveyQuestionOption(${qIdx}, ${optIdx})" class="p-1 text-gray-400 hover:text-red-500 cursor-pointer">
                                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" onclick="window.addSurveyQuestionOption(${qIdx})" class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer">
                        <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Add Another Option
                    </button>
                </div>
            ` : ''}

            ${q.type === 'rating' ? `
                <div class="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
                    <i data-lucide="star" class="w-4 h-4 shrink-0"></i>
                    <span>Renders an interactive 5-point rating scale with instant auto-progression upon tap.</span>
                </div>
            ` : ''}

            ${q.type === 'text' ? `
                <div class="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium flex items-center gap-2">
                    <i data-lucide="message-square" class="w-4 h-4 shrink-0"></i>
                    <span>Renders an open-ended multi-line feedback box for written suggestions.</span>
                </div>
            ` : ''}

        </div>
    `).join('');
}

function renderLedgerView() {
    return `
    <div class="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/60 overflow-hidden space-y-4">
        
        <div class="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white">Survey Campaigns & Response Ledger</h2>
                <p class="text-xs text-gray-400 dark:text-gray-500">Audit response rates, tenant feedback insights, and campaign controls</p>
            </div>
            <div class="text-xs font-bold text-gray-500">
                <span>Total Campaigns: <strong>${surveysList.length}</strong></span>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px]">
                <thead>
                    <tr class="bg-gray-50/80 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/50">
                        <th class="py-3.5 px-5 sm:px-6">Campaign Title</th>
                        <th class="py-3.5 px-5 sm:px-6">Audience</th>
                        <th class="py-3.5 px-5 sm:px-6">Status</th>
                        <th class="py-3.5 px-5 sm:px-6 text-center">Questions</th>
                        <th class="py-3.5 px-5 sm:px-6 text-center">Responses</th>
                        <th class="py-3.5 px-5 sm:px-6">Created</th>
                        <th class="py-3.5 px-5 sm:px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700/40 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ${surveysList.length ? surveysList.map(s => {
                        const responses = surveyResponsesList.filter(r => r.survey_id === s.id);
                        const isActive = s.status === 'active';
                        return `
                        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td class="py-4 px-5 sm:px-6 font-bold text-gray-900 dark:text-white">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <span class="truncate block">${escapeHtml(s.title)}</span>
                                        ${s.description ? `<span class="text-[10px] text-gray-400 font-normal block truncate max-w-xs">${escapeHtml(s.description)}</span>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td class="py-4 px-5 sm:px-6">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    ${s.target_audience || 'all'}
                                </span>
                            </td>
                            <td class="py-4 px-5 sm:px-6">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40' : (s.status === 'draft' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' : 'bg-gray-100 text-gray-500 dark:bg-gray-800')}">
                                    ${s.status}
                                </span>
                            </td>
                            <td class="py-4 px-5 sm:px-6 text-center">
                                <span class="font-bold text-xs">${(s.questions || []).length}</span>
                            </td>
                            <td class="py-4 px-5 sm:px-6 text-center">
                                <span class="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                    ${responses.length}
                                </span>
                            </td>
                            <td class="py-4 px-5 sm:px-6 text-[11px] text-gray-400">
                                ${new Date(s.created_at).toLocaleDateString()}
                            </td>
                            <td class="py-4 px-5 sm:px-6 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <button onclick="window.openSurveyAnalyticsModal('${s.id}')" title="View Insights & Analytics" class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer">
                                        <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.previewExistingSurvey('${s.id}')" title="Preview Survey Pop-up" class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors cursor-pointer">
                                        <i data-lucide="play" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.toggleSurveyStatus('${s.id}')" title="${isActive ? 'Close Survey' : 'Reactivate Survey'}" class="p-1.5 rounded-lg ${isActive ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'} transition-colors cursor-pointer">
                                        <i data-lucide="${isActive ? 'pause' : 'radio'}" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.clearSurveyResponses('${s.id}')" title="Wipe Response Activity" class="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer">
                                        <i data-lucide="eraser" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteSurvey('${s.id}')" title="Delete Survey Campaign" class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('') : `
                        <tr>
                            <td colspan="7" class="py-12 text-center text-gray-400 italic text-xs">
                                No survey campaigns created yet. Build one in the Survey Studio!
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>

    </div>
    `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder Handlers, Debounced Autosave (3s) & Window Functions
// ─────────────────────────────────────────────────────────────────────────────

window.onSurveyBuilderInput = function() {
    const badge = document.getElementById('surveyAutosaveBadge');
    if (badge) {
        badge.innerHTML = `<span class="text-amber-500 flex items-center gap-1.5"><i data-lucide="edit-3" class="w-3.5 h-3.5 animate-pulse"></i> Unsaved changes...</span>`;
        if (window.lucide) window.lucide.createIcons();
    }

    clearTimeout(surveyAutosaveTimeout);
    surveyAutosaveTimeout = setTimeout(async () => {
        await executeSurveyAutosave();
    }, 3000); // Wait exactly 3 seconds after user stops typing
};

async function executeSurveyAutosave() {
    const title = document.getElementById('surveyBuilderTitle')?.value?.trim();
    const desc = document.getElementById('surveyBuilderDesc')?.value?.trim() || '';
    const audience = document.getElementById('surveyAudienceSelect')?.value || 'all';

    if (!title) {
        localStorage.setItem('bms_survey_local_backup', JSON.stringify({ title, desc, audience, questions: builderQuestions }));
        return;
    }

    const badge = document.getElementById('surveyAutosaveBadge');
    if (badge) {
        badge.innerHTML = `<span class="text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5 animate-pulse"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Autosaving draft...</span>`;
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        const payload = {
            title: title,
            description: desc,
            target_audience: audience,
            status: 'draft',
            questions: builderQuestions,
            updated_at: new Date().toISOString()
        };

        if (editingSurveyId) {
            await supabase.from('sys_surveys').update(payload).eq('id', editingSurveyId);
        } else {
            const { data, error } = await supabase.from('sys_surveys').insert(payload).select('id').single();
            if (!error && data?.id) {
                editingSurveyId = data.id;
            }
        }

        if (badge) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            badge.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Draft autosaved (${timeStr})</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (e) {
        console.warn('[Surveys] Autosave warning:', e);
        if (badge) {
            badge.innerHTML = `<span class="text-gray-400 flex items-center gap-1"><i data-lucide="cloud-off" class="w-3.5 h-3.5"></i> Saved locally</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

window.addSurveyQuestion = function() {
    builderQuestions.push({
        id: `q_${Date.now().toString(36)}`,
        text: '',
        type: 'single_choice',
        options: ['Option 1', 'Option 2', 'Option 3'],
        required: true
    });
    refreshBuilderDOM();
    window.onSurveyBuilderInput();
};

window.removeSurveyQuestion = function(idx) {
    if (builderQuestions.length <= 1) {
        showToast('Survey must have at least 1 question', 'info');
        return;
    }
    builderQuestions.splice(idx, 1);
    refreshBuilderDOM();
    window.onSurveyBuilderInput();
};

window.setSurveyQuestionType = function(idx, type) {
    if (!builderQuestions[idx]) return;
    builderQuestions[idx].type = type;
    if ((type === 'single_choice' || type === 'multiple_choice') && (!builderQuestions[idx].options || !builderQuestions[idx].options.length)) {
        builderQuestions[idx].options = ['Option 1', 'Option 2', 'Option 3'];
    }
    refreshBuilderDOM();
    window.onSurveyBuilderInput();
};

window.updateQuestionText = function(idx, val) {
    if (builderQuestions[idx]) {
        builderQuestions[idx].text = val;
        window.onSurveyBuilderInput();
    }
};

window.addSurveyQuestionOption = function(qIdx) {
    if (!builderQuestions[qIdx]) return;
    if (!Array.isArray(builderQuestions[qIdx].options)) builderQuestions[qIdx].options = [];
    builderQuestions[qIdx].options.push(`Option ${builderQuestions[qIdx].options.length + 1}`);
    refreshBuilderDOM();
    window.onSurveyBuilderInput();
};

window.removeSurveyQuestionOption = function(qIdx, optIdx) {
    if (!builderQuestions[qIdx] || !builderQuestions[qIdx].options) return;
    if (builderQuestions[qIdx].options.length <= 2) {
        showToast('Choice questions require at least 2 options', 'info');
        return;
    }
    builderQuestions[qIdx].options.splice(optIdx, 1);
    refreshBuilderDOM();
    window.onSurveyBuilderInput();
};

window.updateQuestionOption = function(qIdx, optIdx, val) {
    if (builderQuestions[qIdx] && builderQuestions[qIdx].options) {
        builderQuestions[qIdx].options[optIdx] = val;
        window.onSurveyBuilderInput();
    }
};

function refreshBuilderDOM() {
    const container = document.getElementById('surveyQuestionsContainer');
    if (container) {
        container.innerHTML = renderQuestionCards();
        if (window.lucide) window.lucide.createIcons();
    }
}

window.resetSurveyBuilder = function() {
    clearTimeout(surveyAutosaveTimeout);
    editingSurveyId = null;
    builderQuestions = [
        {
            id: 'q1',
            text: 'How satisfied are you with overall system speed and reliability?',
            type: 'rating',
            scale: 5,
            required: true
        },
        {
            id: 'q2',
            text: 'Which platform section do you use most frequently?',
            type: 'single_choice',
            options: ['POS & Sales Terminal', 'Stock & Inventory Hub', 'Financial Reports Suite', 'Team & Task Manager'],
            required: true
        },
        {
            id: 'q3',
            text: 'What feature or tool would make BMS even better for your workflow?',
            type: 'text',
            placeholder: 'Tell us your suggestions or feature ideas...',
            required: false
        }
    ];
    activeSurveySubTab = 'studio';
    renderFeedbackAndSurveysModule('studio');
};

window.previewSurveyInBuilder = function() {
    const title = document.getElementById('surveyBuilderTitle')?.value?.trim() || 'Feedback Survey';
    const desc = document.getElementById('surveyBuilderDesc')?.value?.trim() || '';

    // Validate
    for (let i = 0; i < builderQuestions.length; i++) {
        if (!builderQuestions[i].text.trim()) {
            showToast(`Question ${i + 1} is missing question text`, 'error');
            return;
        }
    }

    const testSurvey = {
        id: 'preview_mode_id',
        title: title,
        description: desc,
        questions: builderQuestions
    };

    renderSurveyModal(testSurvey);
};

window.saveSurveyCampaign = async function(publishNow = false) {
    clearTimeout(surveyAutosaveTimeout);
    const title = document.getElementById('surveyBuilderTitle')?.value?.trim();
    const desc = document.getElementById('surveyBuilderDesc')?.value?.trim() || '';
    const audience = document.getElementById('surveyAudienceSelect')?.value || 'all';

    if (!title) {
        showToast('Please enter a Survey Title', 'error');
        return;
    }

    for (let i = 0; i < builderQuestions.length; i++) {
        if (!builderQuestions[i].text.trim()) {
            showToast(`Question ${i + 1} is missing prompt text`, 'error');
            return;
        }
    }

    showLoader(publishNow ? 'Publishing survey live in realtime...' : 'Saving survey draft...');
    try {
        const payload = {
            title: title,
            description: desc,
            target_audience: audience,
            status: publishNow ? 'active' : 'draft',
            questions: builderQuestions,
            updated_at: new Date().toISOString()
        };

        let res;
        if (editingSurveyId) {
            res = await supabase.from('sys_surveys').update(payload).eq('id', editingSurveyId).select('*').single();
        } else {
            res = await supabase.from('sys_surveys').insert(payload).select('*').single();
        }

        if (res.error) throw res.error;

        hideLoader();
        showToast(publishNow ? 'Survey published live in real time!' : 'Survey saved as draft!', 'success');
        if (window.broadcastSystemEvent) {
            await window.broadcastSystemEvent('sys_survey_broadcast', { 
                action: publishNow ? 'active' : 'draft', 
                survey: res.data || payload 
            });
        }
        editingSurveyId = null;
        await loadSurveysData();
        renderFeedbackAndSurveysModule('ledger');
    } catch (e) {
        hideLoader();
        console.error('[Surveys] Error saving survey:', e);
        showToast('Failed to save survey: ' + (e.message || e), 'error');
    }
};

window.previewExistingSurvey = function(surveyId) {
    const survey = surveysList.find(s => s.id === surveyId);
    if (!survey) return;
    renderSurveyModal(survey);
};

window.toggleSurveyStatus = async function(surveyId) {
    const survey = surveysList.find(s => s.id === surveyId);
    if (!survey) return;

    const newStatus = survey.status === 'active' ? 'closed' : 'active';
    showLoader(`Setting survey to ${newStatus}...`);

    try {
        const { error } = await supabase.from('sys_surveys').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', surveyId);
        if (error) throw error;

        hideLoader();
        showToast(`Survey status updated to ${newStatus}`, 'success');
        if (window.broadcastSystemEvent) {
            await window.broadcastSystemEvent('sys_survey_broadcast', { 
                action: newStatus, 
                survey: { ...survey, status: newStatus } 
            });
        }
        await loadSurveysData();
        renderFeedbackAndSurveysModule(activeSurveySubTab);
    } catch (e) {
        hideLoader();
        showToast('Error updating status: ' + (e.message || e), 'error');
    }
};

window.clearSurveyResponses = async function(surveyId) {
    const survey = surveysList.find(s => s.id === surveyId);
    if (!survey) return;

    if (!confirm(`Are you sure you want to wipe all recent response activities for "${survey.title}"? This cannot be undone.`)) {
        return;
    }

    showLoader('Clearing response activity...');
    try {
        // Try RPC first
        const { data, error } = await supabase.rpc('clear_sys_survey_responses', { p_survey_id: surveyId });
        if (error) {
            // Fallback direct delete
            const directDel = await supabase.from('sys_survey_responses').delete().eq('survey_id', surveyId);
            if (directDel.error) throw directDel.error;
        }

        hideLoader();
        showToast('Response activity successfully wiped!', 'success');
        await loadSurveysData();
        renderFeedbackAndSurveysModule(activeSurveySubTab);
    } catch (e) {
        hideLoader();
        showToast('Failed to clear responses: ' + (e.message || e), 'error');
    }
};

window.deleteSurvey = async function(surveyId) {
    const survey = surveysList.find(s => s.id === surveyId);
    if (!survey) return;

    if (!confirm(`Permanently delete survey campaign "${survey.title}" and all its records?`)) {
        return;
    }

    showLoader('Deleting survey campaign...');
    try {
        const { error } = await supabase.from('sys_surveys').delete().eq('id', surveyId);
        if (error) throw error;

        hideLoader();
        showToast('Survey campaign deleted!', 'success');
        if (window.broadcastSystemEvent) {
            await window.broadcastSystemEvent('sys_survey_broadcast', { 
                action: 'deleted', 
                survey: { id: surveyId } 
            });
        }
        await loadSurveysData();
        renderFeedbackAndSurveysModule(activeSurveySubTab);
    } catch (e) {
        hideLoader();
        showToast('Failed to delete survey: ' + (e.message || e), 'error');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Analytics & Insights Drawer / Modal (Server-Side Computed)
// ─────────────────────────────────────────────────────────────────────────────

window.openSurveyAnalyticsModal = async function(surveyId) {
    const survey = surveysList.find(s => s.id === surveyId);
    if (!survey) return;

    showLoader('Loading server-computed survey analytics...');

    let analyticsData = null;
    try {
        const { data, error } = await supabase.rpc('get_sys_survey_analytics', { p_survey_id: surveyId });
        if (!error && data) {
            analyticsData = data;
        }
    } catch (e) {
        console.warn('[Surveys] Server analytics RPC failed, falling back:', e);
    }
    hideLoader();

    const totalResponses = analyticsData?.total_responses ?? surveyResponsesList.filter(r => r.survey_id === surveyId).length;
    const breakdowns = analyticsData?.question_breakdowns || [];

    let existing = document.getElementById('surveyAnalyticsModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'surveyAnalyticsModal';
    modal.className = 'fixed inset-0 z-[37000] flex items-center justify-center bg-black/60 p-3 sm:p-4 select-none animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5 max-h-[90vh] flex flex-col overflow-hidden">
            
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 shrink-0">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${escapeHtml(survey.title)}</h3>
                        <p class="text-xs text-gray-400 font-bold">${totalResponses} responses recorded • Audience: ${survey.target_audience}</p>
                    </div>
                </div>
                <button onclick="document.getElementById('surveyAnalyticsModal')?.remove()" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Scrollable Body with Question Breakdowns -->
            <div class="overflow-y-auto flex-1 scroller-custom space-y-5 pr-1">
                ${totalResponses === 0 ? `
                    <div class="py-16 text-center text-gray-400 space-y-2">
                        <i data-lucide="inbox" class="w-10 h-10 opacity-30 mx-auto"></i>
                        <p class="text-xs font-semibold">No responses recorded for this survey yet.</p>
                    </div>
                ` : breakdowns.length > 0 ? breakdowns.map((b, bIdx) => renderServerQuestionAnalyticsBlock(b, bIdx)).join('') : (survey.questions || []).map((q, qIdx) => {
                    const qKey = q.id || `q_${qIdx}`;
                    const responses = surveyResponsesList.filter(r => r.survey_id === surveyId);
                    return renderQuestionAnalyticsBlock(q, qIdx, qKey, responses);
                }).join('')}
            </div>

            <!-- Footer -->
            <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <button onclick="window.clearSurveyResponses('${survey.id}'); document.getElementById('surveyAnalyticsModal')?.remove();" class="px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="eraser" class="w-3.5 h-3.5"></i> Clear Activity
                </button>
                <button onclick="document.getElementById('surveyAnalyticsModal')?.remove()" class="px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all cursor-pointer">
                    Close
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
};

function renderServerQuestionAnalyticsBlock(b, bIdx) {
    // 1. Single or Multiple Choice Breakdown (Computed on Supabase)
    if (b.type === 'single_choice' || b.type === 'multiple_choice') {
        const optionCounts = b.option_counts || {};
        const answeredCount = b.answered_count || 0;

        return `
            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-900 dark:text-white">Q${bIdx + 1}: ${escapeHtml(b.text)}</h4>
                    <span class="text-[10px] font-bold text-gray-400">${answeredCount} answers</span>
                </div>
                <div class="space-y-2">
                    ${Object.entries(optionCounts).map(([opt, count]) => {
                        const countNum = Number(count) || 0;
                        const pct = answeredCount > 0 ? Math.round((countNum / answeredCount) * 100) : 0;
                        return `
                            <div class="space-y-1">
                                <div class="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    <span class="truncate max-w-xs">${escapeHtml(opt)}</span>
                                    <span>${countNum} (${pct}%)</span>
                                </div>
                                <div class="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 2. Rating Scale Breakdown (Computed on Supabase)
    else if (b.type === 'rating') {
        const ratingCounts = b.rating_counts || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        const avg = b.avg_rating !== null && b.avg_rating !== undefined ? b.avg_rating : '—';

        return `
            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-900 dark:text-white">Q${bIdx + 1}: ${escapeHtml(b.text)}</h4>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-black">
                        <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i> Avg: ${avg} / 5
                    </span>
                </div>
                <div class="grid grid-cols-5 gap-2 pt-1">
                    ${[1, 2, 3, 4, 5].map(r => `
                        <div class="text-center p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                            <div class="flex items-center justify-center gap-0.5 text-amber-500 font-black text-xs">
                                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                                <span>${r}</span>
                            </div>
                            <span class="text-[10px] font-bold text-gray-400 block mt-0.5">${ratingCounts[String(r)] || 0} votes</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 3. Open Feedback Stream (Computed on Supabase)
    else if (b.type === 'text') {
        const comments = Array.isArray(b.comments) ? b.comments : [];

        return `
            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-900 dark:text-white">Q${bIdx + 1}: ${escapeHtml(b.text)}</h4>
                    <span class="text-[10px] font-bold text-gray-400">${comments.length} comments</span>
                </div>
                <div class="space-y-2 max-h-48 overflow-y-auto scroller-custom pr-1">
                    ${comments.length ? comments.map(c => `
                        <div class="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs space-y-1">
                            <p class="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">${escapeHtml(c.comment)}</p>
                            <div class="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                                <span>${escapeHtml(c.user_email || 'Anonymous Tenant')} (${c.user_role || 'User'})</span>
                                <span>${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                            </div>
                        </div>
                    `).join('') : `
                        <p class="text-xs text-gray-400 italic">No text comments submitted yet.</p>
                    `}
                </div>
            </div>
        `;
    }

    return '';
}

function renderQuestionAnalyticsBlock(q, qIdx, qKey, responses) {
    const totalResp = responses.length;

    // 1. Single or Multiple Choice Breakdown
    if (q.type === 'single_choice' || q.type === 'multiple_choice' || !q.type) {
        const optionCounts = {};
        (q.options || []).forEach(opt => { optionCounts[opt] = 0; });

        let answeredCount = 0;
        responses.forEach(r => {
            const ans = r.answers?.[qKey];
            if (ans) {
                answeredCount++;
                if (Array.isArray(ans)) {
                    ans.forEach(val => { optionCounts[val] = (optionCounts[val] || 0) + 1; });
                } else {
                    optionCounts[ans] = (optionCounts[ans] || 0) + 1;
                }
            }
        });

        return `
            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-900 dark:text-white">Q${qIdx + 1}: ${escapeHtml(q.text)}</h4>
                    <span class="text-[10px] font-bold text-gray-400">${answeredCount} answers</span>
                </div>
                <div class="space-y-2">
                    ${Object.entries(optionCounts).map(([opt, count]) => {
                        const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                        return `
                            <div class="space-y-1">
                                <div class="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    <span class="truncate max-w-xs">${escapeHtml(opt)}</span>
                                    <span>${count} (${pct}%)</span>
                                </div>
                                <div class="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 2. Rating Scale Breakdown
    else if (q.type === 'rating') {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        let count = 0;

        responses.forEach(r => {
            const val = parseInt(r.answers?.[qKey]);
            if (val >= 1 && val <= 5) {
                counts[val]++;
                sum += val;
                count++;
            }
        });

        const avg = count > 0 ? (sum / count).toFixed(1) : '—';

        return `
            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-900 dark:text-white">Q${qIdx + 1}: ${escapeHtml(q.text)}</h4>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-black">
                        <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i> Avg: ${avg} / 5
                    </span>
                </div>
                <div class="grid grid-cols-5 gap-2 pt-1">
                    ${[1, 2, 3, 4, 5].map(r => `
                        <div class="text-center p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                            <div class="flex items-center justify-center gap-0.5 text-amber-500 font-black text-xs">
                                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                                <span>${r}</span>
                            </div>
                            <span class="text-[10px] font-bold text-gray-400 block mt-0.5">${counts[r]} votes</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 3. Open Feedback Stream
    else if (q.type === 'text') {
        const textAnswers = responses.filter(r => r.answers?.[qKey] && String(r.answers[qKey]).trim().length > 0);

        return `
            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-black text-gray-900 dark:text-white">Q${qIdx + 1}: ${escapeHtml(q.text)}</h4>
                    <span class="text-[10px] font-bold text-gray-400">${textAnswers.length} comments</span>
                </div>
                <div class="space-y-2 max-h-48 overflow-y-auto scroller-custom pr-1">
                    ${textAnswers.length ? textAnswers.map(r => `
                        <div class="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs space-y-1">
                            <p class="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">${escapeHtml(r.answers[qKey])}</p>
                            <div class="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                                <span>${escapeHtml(r.user_email || 'Anonymous Tenant')} (${r.user_role || 'User'})</span>
                                <span>${new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    `).join('') : `
                        <p class="text-xs text-gray-400 italic">No text comments submitted yet.</p>
                    `}
                </div>
            </div>
        `;
    }

    return '';
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

window.renderFeedbackAndSurveysModule = renderFeedbackAndSurveysModule;
