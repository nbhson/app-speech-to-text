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

---

# Round 2 (2026-10-29) — Enterprise upgrade

## Kết quả Review (audit đợt 2)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| 1 | MAJOR | clipboard API | `navigator.clipboard` không tồn tại/không cho phép ở context không-secure → copy fail im lặng | Fallback textarea + execCommand; báo lỗi rõ khi cả hai fail |
| 2 | MINOR | script.js | Transcript mất khi reload trang | Auto-save localStorage (debounce 500ms) + restore khi load; Clear xóa cả bản lưu |
| 3 | MINOR | index.html | Chỉ có dark palette; thiếu focus-visible | Thêm palette light qua `prefers-color-scheme: light` + `:focus-visible` cho button/select/output |
| 4 | MINOR | script.js | Bấm Start khi recognition đang lỗi khó chịu — chỉ console.error | setStatus lỗi thân thiện thay vì im lặng |
| 5 | MINOR | export/stats | Không có thông tin phiên | Live stats: số từ, ký tự, tổng thời gian ghi (accumulate qua các segment, interval được clear trong onend) |

## Feature mới (đợt 2)

1. **Language selector**: 10 locale (vi/en-US/en-GB/ja/zh-CN/ko/fr/de/es), lưu localStorage; đổi khi đang ghi âm sẽ restart recognition với lang mới.
2. **Export .txt**: tải transcript về file `transcript-<timestamp>.txt` (Blob + revokeObjectURL), kèm header ngày giờ + ngôn ngữ.
3. **Auto-save/restore + live stats**: transcript tự lưu (500ms debounce) và khôi phục sau reload; stats realtime (từ/ký tự/thời lượng ghi).

## Trạng thái (Round 2)

- [x] Deep review + plan
- [x] Fix #1–#5
- [x] Features: language selector, export, auto-save + stats
- [x] `node --check` + self-review

## Review Log (Round 2)

### Vòng 2
- Self-review: `node --check` pass. Giữ nguyên các fix đợt 1 (final/interim tách node, copy chỉ final, aria-live). Timer stats: interval chỉ chạy khi đang ghi (startStatsTimer/stopStatsTimer), tổng thời gian tích lũy qua `totalRecordedMs`. exportTimer debounce — không ghi localStorage mỗi interim. restoreSession() được gọi sau khi bind xong events; clearBtn xóa cả bản auto-save.

