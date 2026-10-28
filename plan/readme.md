# Plan — app-speech-to-text

> Web app chuyển giọng nói thành văn bản bằng Web Speech API (vanilla JS, 2 files).

## Kết quả Review (audit đợt 1)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| 1 | MAJOR | script.js:44-65 | `onresult` gán `textContent =` rồi append interim → interim bị clobber giữa các lần render | Tách `finalText` tích lũy + render interim vào node riêng |
| 2 | MAJOR | script.js:89-96 | `onend` bật lại start ngay cả sau khi permission bị từ chối → UX rối | Giữ cho phép retry (user có thể cấp quyền rồi bấm lại) — ghi chú quyết định thiết kế |
| 3 | MAJOR | index.html:193 | `#output` thiếu `aria-live` → screen reader không đọc transcript | Thêm `aria-live="polite"` |
| 4 | MAJOR | script.js:124 | Copy feedback `setTimeout` không clear giữa các click → flicker | Lưu timer ID + clearTimeout |
| 5 | MINOR | script.js:117 | Copy bao gồm cả interim text → copy dư/không ổn định | Chỉ copy `finalText` |
| 6 | MINOR | script.js:133 | `clear` không remove class `error`/`listening` cũ | `clearStatus()` gỡ toàn bộ |
| 7 | BUG | index.html:203 | `</div>` đóng sai thẻ `<main class="app">` | Sửa thành `</main>` |
| 8 | MINOR | index.html | Thiếu meta description, favicon; mic-badge thiếu aria-hidden | Bổ sung |

## Quyết định thiết kế

- **Retry sau permission-denied**: không khóa vĩnh viễn nút Start sau lỗi `not-allowed`, vì người dùng có thể cấp quyền micro trong UI trình duyệt rồi bấm lại. Trạng thái khóa vĩnh viễn sẽ tạo dead-end.

## Trạng thái

- [x] Plan
- [x] Fix #1–#8
- [x] Commit + self-review

## Review Log

### Vòng 1
- Self-review: `node --check` pass; flow final/interim đã tách sạch — `onresult` chỉ cộng dồn vào `finalText` khi isFinal; `renderOutput` luôn dựng lại từ finalText nên không còn clobber; copy chỉ dùng finalText; clear reset cả state và class.
