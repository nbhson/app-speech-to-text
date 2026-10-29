// Speech to Text — Round 2
// New: language selector, .txt export, auto-save/restore (localStorage),
// live word/char/duration stats, clipboard fallback, focus-visible a11y.
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const langSelect = document.getElementById('langSelect');
const exportBtn = document.getElementById('exportBtn');
const statsEl = document.getElementById('stats');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// Feature detection FIRST — never construct the object unless supported.
// Previously `new SpeechRecognition()` threw "undefined is not a constructor"
// on unsupported browsers, crashing the whole script before UI could bind.
let recognition = null;

// Accumulated FINAL transcript. Interim text is rendered in a separate node so
// re-renders never clobber confirmed results (and Copy only exports final text).
let finalText = '';
let copyFeedbackTimer = null;
let exportTimer = null; // debounce cho auto-save

// Session timer: đếm tổng thời gian ghi (accumulate giữa các lần start/stop)
let recording = false;
let segmentStart = 0;
let totalRecordedMs = 0;
let statsTimer = null;

const LS_TRANSCRIPT_KEY = 'stt.transcript.v1';
const LS_LANG_KEY = 'stt.lang.v1';

const LANGUAGES = [
    { code: 'vi-VN', label: 'Tiếng Việt (vi-VN)' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'ja-JP', label: '日本語 (ja-JP)' },
    { code: 'zh-CN', label: '中文（简体）(zh-CN)' },
    { code: 'ko-KR', label: '한국어 (ko-KR)' },
    { code: 'fr-FR', label: 'Français (fr-FR)' },
    { code: 'de-DE', label: 'Deutsch (de-DE)' },
    { code: 'es-ES', label: 'Español (es-ES)' },
];

function setStatus(message, className) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('listening', 'error', 'unsupported');
    if (className) statusEl.classList.add(className);
}

function clearStatus() {
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('listening', 'error', 'unsupported');
}

function countWords(text) {
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
}

// Auto-save: debounce 500ms để không ghi localStorage mỗi kết quả interim
function scheduleSave() {
    if (exportTimer) clearTimeout(exportTimer);
    exportTimer = setTimeout(() => {
        exportTimer = null;
        try {
            localStorage.setItem(LS_TRANSCRIPT_KEY, finalText);
        } catch (e) { /* storage đầy/bị chặn — không fatal */ }
    }, 500);
}

function updateStats() {
    if (!statsEl) return;
    const chars = finalText.replace(/\s/g, '').length;
    const words = countWords(finalText);
    const secs = Math.floor((totalRecordedMs + (recording ? Date.now() - segmentStart : 0)) / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    statsEl.textContent = `${words} từ · ${chars} ký tự · ${mm}:${ss} ghi âm`;
    if (exportBtn) exportBtn.disabled = !finalText.trim();
}

function startStatsTimer() {
    if (statsTimer) return;
    statsTimer = setInterval(() => {
        updateStats();
    }, 1000);
}

function stopStatsTimer() {
    if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }
    updateStats();
}

function renderOutput(interimText) {
    // Build DOM nodes instead of innerHTML to avoid injecting untrusted
    // transcript content into the page.
    output.textContent = finalText;
    if (interimText) {
        const interim = document.createElement('i');
        interim.className = 'interim';
        interim.textContent = (finalText ? ' ' : '') + interimText;
        output.appendChild(interim);
    }
    updateStats();
    scheduleSave();
}

// Restore transcript + language trước khi bind events
function restoreSession() {
    try {
        const saved = localStorage.getItem(LS_TRANSCRIPT_KEY);
        if (saved) finalText = saved;
        if (langSelect) {
            const savedLang = localStorage.getItem(LS_LANG_KEY);
            if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
                langSelect.value = savedLang;
            }
        }
    } catch (e) { /* private mode — bỏ qua */ }
    if (finalText) renderOutput('');
}

function exportTranscript() {
    const text = finalText.trim();
    if (!text) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    const lang = (langSelect && langSelect.value) || 'vi-VN';
    const header = `# Speech to Text — ${new Date().toLocaleString()} — ${lang}\n\n`;
    try {
        const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
        console.error('Export failed:', e);
        setStatus('Không thể xuất file. Hãy dùng nút Copy thay thế.', 'error');
    }
}

if (!SpeechRecognitionAPI) {
    const msg = 'Trình duyệt của bạn không hỗ trợ Web Speech API. Vui lòng dùng Chrome, Edge hoặc Safari phiên bản mới.';
    if (statusEl) {
        setStatus(msg, 'unsupported');
    } else {
        console.warn(msg);
    }
    startBtn.disabled = true;
    stopBtn.disabled = true;
} else {
    recognition = new SpeechRecognitionAPI();

    // Ngôn ngữ: khôi phục lựa chọn đã lưu, mặc định tiếng Việt
    if (langSelect) {
        LANGUAGES.forEach(({ code, label }) => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = label;
            langSelect.appendChild(opt);
        });
        try {
            const saved = localStorage.getItem(LS_LANG_KEY);
            if (saved && LANGUAGES.some(l => l.code === saved)) langSelect.value = saved;
        } catch (e) { /* ignore */ }
    }

    function applyLanguage() {
        recognition.lang = (langSelect && langSelect.value) || 'vi-VN';
    }
    applyLanguage();

    recognition.continuous = true;     // Liên tục nhận dạng
    recognition.interimResults = true; // Hiển thị kết quả tạm thời

    // Đổi ngôn ngữ: nếu đang ghi âm thì khởi động lại để áp dụng
    if (langSelect) {
        langSelect.addEventListener('change', async () => {
            try { localStorage.setItem(LS_LANG_KEY, langSelect.value); } catch (e) { /* ignore */ }
            if (recording) {
                try { recognition.stop(); } catch (e) { /* ignore */ }
                // start lại với lang mới sau khi stop hoàn tất
                setTimeout(() => {
                    try { recognition.lang = langSelect.value; recognition.start(); } catch (e) { /* ignore */ }
                }, 250);
            } else {
                recognition.lang = langSelect.value;
            }
            setStatus('Ngôn ngữ: ' + (langSelect.selectedOptions[0]?.textContent || langSelect.value), '');
        });
    }

    // Xử lý sự kiện khi bắt đầu nhận dạng
    recognition.onstart = () => {
        recording = true;
        segmentStart = Date.now();
        startBtn.disabled = true;
        stopBtn.disabled = false;
        setStatus('Đang lắng nghe...', 'listening');
        const badge = document.getElementById('micBadge');
        if (badge) badge.classList.add('listening');
        startStatsTimer();
    };

    // Xử lý kết quả nhận dạng
    recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalText += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        renderOutput(interimTranscript);
    };

    // Xử lý lỗi — thông báo rõ ràng theo từng loại lỗi
    recognition.onerror = (event) => {
        if (statusEl) statusEl.classList.remove('listening');
        const messages = {
            'not-allowed': 'Quyền truy cập micro bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt rồi thử lại.',
            'service-not-allowed': 'Dịch vụ nhận dạng giọng nói không khả dụng. Kiểm tra quyền micro của hệ thống.',
            'no-speech': 'Không phát hiện giọng nói. Vui lòng thử lại.',
            'audio-capture': 'Không tìm thấy micro. Vui lòng kiểm tra thiết bị ghi âm.',
            'network': 'Lỗi kết nối mạng khi nhận dạng giọng nói.',
            'aborted': 'Đã dừng ghi âm.'
        };
        const friendly = messages[event.error] || ('Có lỗi xảy ra: ' + event.error);
        setStatus(friendly, 'error');
        const badge = document.getElementById('micBadge');
        if (badge) badge.classList.remove('listening');
    };

    // Xử lý khi kết thúc nhận dạng
    recognition.onend = () => {
        recording = false;
        if (segmentStart) {
            totalRecordedMs += Date.now() - segmentStart;
            segmentStart = 0;
        }
        stopStatsTimer();
        // Luôn cho phép thử lại: người dùng có thể vừa cấp quyền micro
        // trong UI trình duyệt sau lỗi not-allowed.
        renderOutput('');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        if (statusEl && statusEl.classList.contains('listening')) clearStatus();
        const badge = document.getElementById('micBadge');
        if (badge) badge.classList.remove('listening');
    };

    // Xử lý sự kiện click nút — guard phòng khi recognition bị GC/reset
    startBtn.addEventListener('click', () => {
        try {
            recognition.lang = (langSelect && langSelect.value) || 'vi-VN';
            recognition.start();
        } catch (e) {
            console.error('Không thể bắt đầu nhận dạng:', e);
            setStatus('Không thể bắt đầu nhận dạng — thử lại sau.', 'error');
        }
    });

    stopBtn.addEventListener('click', () => {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Không thể dừng nhận dạng:', e);
        }
    });

    // Copy kết quả ra clipboard (kèm fallback execCommand cho context
    // không-secure nơi navigator.clipboard không tồn tại).
    // Chỉ copy phần FINAL — không kèm text tạm thời đang hiển thị xám.
    document.getElementById('copyBtn').addEventListener('click', async () => {
        const text = finalText.trim();
        if (!text) return;
        const btn = document.getElementById('copyBtn');
        let ok = false;
        try {
            await navigator.clipboard.writeText(text);
            ok = true;
        } catch (e) {
            // Fallback: textarea tạm + execCommand (deprecated nhưng vẫn hoạt động)
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                ok = document.execCommand('copy');
                ta.remove();
            } catch (e2) {
                ok = false;
            }
        }
        if (!ok) {
            setStatus('Không thể copy — trình duyệt chặn clipboard.', 'error');
            return;
        }
        const original = btn.textContent;
        btn.textContent = '✅ Đã copy';
        if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
        copyFeedbackTimer = setTimeout(() => { btn.textContent = original; copyFeedbackTimer = null; }, 1500);
    });

    // Export .txt
    if (exportBtn) exportBtn.addEventListener('click', exportTranscript);

    // Xóa nội dung (cả bản auto-save)
    document.getElementById('clearBtn').addEventListener('click', () => {
        finalText = '';
        totalRecordedMs = 0;
        renderOutput('');
        clearStatus();
        try { localStorage.removeItem(LS_TRANSCRIPT_KEY); } catch (e) { /* ignore */ }
    });

    // Khôi phục transcript + ngôn ngữ từ phiên trước
    restoreSession();
    updateStats();
}
