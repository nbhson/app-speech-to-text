# Speech to Text — Chuyển giọng nói thành văn bản 🎙️

Công cụ chuyển giọng nói thành văn bản **trực tiếp trên trình duyệt** bằng Web Speech API — không server, không gửi dữ liệu đi đâu, hoàn toàn miễn phí.

## Tính năng

- Nhận giọng nói realtime, hiển thị văn bản ngay khi nói (interim + final tách riêng)
- Nút Copy với feedback rõ ràng (timer được clear đúng giữa các lần bấm)
- Hỗ trợ `aria-live` cho screen reader
- Chọn ngôn ngữ nhận dạng

## Chạy

Không cần cài đặt — mở `index.html` trong trình duyệt:

```bash
open index.html
```

> ⚠️ Web Speech API chỉ hoạt động tốt trên Chrome/Edge và **yêu cầu quyền microphone**. Cần serve qua `http://localhost` hoặc `https` (mở bằng `file://` có thể bị chặn quyền mic):
>
> ```bash
> npx serve .
> ```

## Cấu trúc

```
index.html   # UI chính
script.js    # Logic Web Speech API (final/interim transcript, copy, retry)
```

## License

[MIT](LICENSE)
