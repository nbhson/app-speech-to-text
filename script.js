const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// Feature detection FIRST — never construct the object unless supported.
// Previously `new SpeechRecognition()` threw "undefined is not a constructor"
// on unsupported browsers, crashing the whole script before UI could bind.
let recognition = null;

// Accumulated FINAL transcript. Interim text is rendered in a separate node so
// re-renders never clobber confirmed results (and Copy only exports final text).
let finalText = '';
let copyFeedbackTimer = null;

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
    // Cấu hình
    recognition.lang = 'vi-VN';        // Ngôn ngữ tiếng Việt
    recognition.continuous = true;     // Liên tục nhận dạng
    recognition.interimResults = true; // Hiển thị kết quả tạm thời

    // Xử lý sự kiện khi bắt đầu nhận dạng
    recognition.onstart = () => {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        setStatus('Đang lắng nghe...', 'listening');
        const badge = document.getElementById('micBadge');
        if (badge) badge.classList.add('listening');
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
            recognition.start();
        } catch (e) {
            console.error('Không thể bắt đầu nhận dạng:', e);
        }
    });

    stopBtn.addEventListener('click', () => {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Không thể dừng nhận dạng:', e);
        }
    });

    // Copy kết quả ra clipboard (kèm fallback cho context không-secure).
    // Chỉ copy phần FINAL — không kèm text tạm thời đang hiển thị xám.
    document.getElementById('copyBtn').addEventListener('click', async () => {
        const text = finalText.trim();
        if (!text) return;
        const btn = document.getElementById('copyBtn');
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            console.error('Không thể copy:', e);
            return;
        }
        const original = btn.textContent;
        btn.textContent = '✅ Đã copy';
        if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
        copyFeedbackTimer = setTimeout(() => { btn.textContent = original; copyFeedbackTimer = null; }, 1500);
    });

    // Xóa nội dung
    document.getElementById('clearBtn').addEventListener('click', () => {
        finalText = '';
        renderOutput('');
        clearStatus();
    });
}
