const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const output = document.getElementById('output');

// Kiểm tra trình duyệt có hỗ trợ Web Speech API không
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Trình duyệt của bạn không hỗ trợ Web Speech API');
    startBtn.disabled = true;
}

// Tạo đối tượng nhận dạng giọng nói
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Cấu hình
recognition.lang = 'vi-VN'; // Ngôn ngữ tiếng Việt
recognition.continuous = true; // Liên tục nhận dạng
recognition.interimResults = true; // Hiển thị kết quả tạm thời

// Xử lý sự kiện khi bắt đầu nhận dạng
recognition.onstart = () => {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    output.textContent = 'Đang lắng nghe...';
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

    output.innerHTML = finalTranscript + '<i style="color: #999">' + interimTranscript + '</i>';
};

// Xử lý lỗi
recognition.onerror = (event) => {
    console.error('Lỗi nhận dạng:', event.error);
    output.textContent = 'Có lỗi xảy ra: ' + event.error;
};

// Xử lý khi kết thúc nhận dạng
recognition.onend = () => {
    startBtn.disabled = false;
    stopBtn.disabled = true;
};

// Xử lý sự kiện click nút
startBtn.addEventListener('click', () => {
    recognition.start();
});

stopBtn.addEventListener('click', () => {
    recognition.stop();
}); 