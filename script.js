const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// Feature detection FIRST — never construct the object unless supported.
// Previously `new SpeechRecognition()` threw "undefined is not a constructor"
// on unsupported browsers, crashing the whole script before UI could bind.
let recognition = null;

if (!SpeechRecognitionAPI) {
    const msg = 'Trình duyệt của bạn không hỗ trợ Web Speech API. Vui lòng dùng Chrome, Edge hoặc Safari phiên bản mới.';
    if (statusEl) {
        statusEl.textContent = msg;
        statusEl.classList.add('unsupported');
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
        if (statusEl) {
            statusEl.textContent = 'Đang lắng nghe...';
            statusEl.classList.add('listening');
            statusEl.classList.remove('error');
        }
        const badge = document.getElementById('micBadge');
        if (badge) badge.classList.add('listening');
    };

    // Xử lý kết quả nhận dạng
    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Render text safely — build DOM nodes instead of innerHTML to avoid
        // injecting untrusted transcript content into the page.
        output.textContent = finalTranscript;
        if (interimTranscript) {
            const interim = document.createElement('i');
            interim.className = 'interim';
            interim.textContent = interimTranscript;
            output.appendChild(interim);
        }
    };

    // Xử lý lỗi — thông báo rõ ràng theo từng loại lỗi
    recognition.onerror = (event) => {
        if (statusEl) statusEl.classList.remove('listening');
        const messages = {
            'not-allowed': 'Quyền truy cập micro bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.',
            'service-not-allowed': 'Dịch vụ nhận dạng giọng nói không khả dụng. Kiểm tra quyền micro của hệ thống.',
            'no-speech': 'Không phát hiện giọng nói. Vui lòng thử lại.',
            'audio-capture': 'Không tìm thấy micro. Vui lòng kiểm tra thiết bị ghi âm.',
            'network': 'Lỗi kết nối mạng khi nhận dạng giọng nói.',
            'aborted': 'Đã dừng ghi âm.'
        };
        const friendly = messages[event.error] || ('Có lỗi xảy ra: ' + event.error);
        if (statusEl) {
            statusEl.textContent = friendly;
            statusEl.classList.add('error');
        } else {
            console.error('Lỗi nhận dạng:', event.error, friendly);
        }
    };

    // Xử lý khi kết thúc nhận dạng
    // Xử lý khi kết thúc nhận dạng
    recognition.onend = () => {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        if (statusEl) statusEl.classList.remove('listening');
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

    // Copy kết quả ra clipboard (kèm fallback cho context không-secure)
    document.getElementById('copyBtn').addEventListener('click', async () => {
        const text = output.textContent || '';
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const btn = document.getElementById('copyBtn');
            const original = btn.textContent;
            btn.textContent = '✅ Đã copy';
            setTimeout(() => { btn.textContent = original; }, 1500);
        } catch (e) {
            console.error('Không thể copy:', e);
        }
    });

    // Xóa nội dung
    document.getElementById('clearBtn').addEventListener('click', () => {
        output.textContent = '';
        if (statusEl) statusEl.textContent = '';
    });
}
