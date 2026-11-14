# Đánh giá API anime — ghi chú researcher

## 1. API nào có khả năng phục vụ MVP và evidence kỹ thuật nào đã có?

### Takeaway

AniList có một probe public thành công; MAL cần credential cho positive test; Jikan public không còn là phương án được maintainer duy trì.

### Cited Findings

- AniList GraphQL POST trả 200 với Page/perPage 2, IDs 1 và 5; header limit 30. Đây là quan sát nhỏ tại 2026-11-14, không phải SLA. — [request-log.json](request-log.json), [body](anilist-probe.txt).
- AniList pagination chỉ nên dựa `hasNextPage`; total/lastPage đang degraded. — [official pagination](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/graphql/pagination.md).
- MAL docs mô tả GET search/detail/ranking/season, client ID header hoặc OAuth và paging; probe không credential trả 403. — [API reference](https://myanimelist.net/apiconfig/references/api/v2), [body](mal-probe-no-credentials.txt).
- Jikan #613 thông báo ngừng public service từ 2026-10-01, trái với README còn quảng bá public API. Thông báo mới, cụ thể được ưu tiên. — [announcement](https://github.com/jikan-me/jikan-rest/issues/613), [README](https://github.com/jikan-me/jikan-rest).

### Inferences

- Chỉ kỹ thuật khả dụng không đủ chọn nguồn; phải đóng quyền dùng và dữ liệu.
- Timeout Jikan một lần không phải bằng chứng độc lập shutdown toàn cầu.

### Gaps

- Không có authenticated MAL positive test; không thử OAuth/mutation, không test rate-limit saturation.
- Chưa đo độ đầy đủ, freshness, duplicate và missing rate bằng sample đại diện; chưa chốt giới hạn perPage AniList từ schema.
- MAL OAuth docs có inconsistency (implicit reference so với auth code PKCE guide; token lifetime/example); cần xác thực trước implementation. — [authorization](https://myanimelist.net/apiconfig/references/authorization).

## 2. Điều khoản, tài khoản/favorites và video có phù hợp không?

### Takeaway

Không thể mặc định metadata miễn phí đồng nghĩa phù hợp toàn MVP hoặc được phát video.

### Cited Findings

- AniList cấm mass collection, dùng làm storage và competing non-complementary list/tracker, áp dụng cả media data. — [terms](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/terms-of-use.md).
- MAL Agreement 3(a)(xii), 3(c), 4(f) có tác động lần lượt đến sửa/dịch content, server-side personal/UGC, thu thập personal info ngoài API; 4(i) cấm scraping. — [Agreement](https://myanimelist.net/static/apiagreement.html).
- Jikan tự mô tả scraper không chính thức; MIT là license source code. — [repo](https://github.com/jikan-me/jikan-rest).
- Link Jikan terms trong spec hiện cho trang Page not found trong bản tải; không xem đó là giấy phép. — [spec](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json), [snapshot](jikan-terms-readable.txt).

### Inferences

- Favorites/tài khoản riêng cần được provider làm rõ bằng văn bản; không đổi nhãn feature để tránh terms.
- External/trailer/streaming URL không tự trao video rights; giữ FR-06 không host/embed, bỏ watch link nếu không có evidence vùng/quyền.
- Self-host Jikan không tự giải quyết quyền dùng MAL metadata hoặc nghĩa vụ scraping.

### Gaps

- Không có sự chấp thuận bằng văn bản cho dự án, provider attribution/ảnh/cache/translation; không nguồn watch link đã xác minh.
- MAL quota RPM cố định và TTL metadata cache chưa được chứng minh. Không nhầm nghĩa vụ xóa trong 24h với TTL cache.
- Launch region, traffic và commercial model chưa chốt.

## 3. Bàn giao và công việc tiếp theo là gì?

### Takeaway

Research deliverable đã sẵn sàng review; giữ Phase 2 mở và không chọn provider thay người dùng.

### Cited Findings

- Plan yêu cầu PM review và user chọn/từ chối nguồn, phê duyệt phase exit/transition. — [PROJECT_PLAN](../../ANIME-WEBSITE/docs/PROJECT_PLAN.md).
- MVP bao gồm tài khoản/favorites, tiếng Việt và không host/embed video. — [REQUIREMENTS](../../ANIME-WEBSITE/docs/REQUIREMENTS.md).
- Báo cáo cung cấp endpoint/auth/pagination, live evidence, mapping đề xuất và test matrix với phần chưa làm được đánh dấu. — [báo cáo](../../reports/Đánh%20giá%20API%20anime.md).

### Inferences

- Đề xuất loại Jikan public, ưu tiên hỏi MAL về quyền sử dụng; AniList giữ có điều kiện. Đây là thứ tự làm rõ, không phải chọn nguồn.
- Normalization chỉ là đề xuất review: identity theo provider/id, lưu raw enums/provenance, giữ null/date precision; không merge theo tên hoặc bịa tiếng Việt.

### Gaps

- PM chưa review độc lập và user chưa quyết định; Phase 3 không được bắt đầu.
- Chưa liên hệ nhà cung cấp, tạo credentials, commit hay push. Không thay đổi ba tài liệu dirty.

Các snapshot tải ngày 14/11/2026 để audit nội bộ, không coi là license tái phát hành dữ liệu. `request-log.json` ghi 10 request của collector; các snapshot bổ sung MAL authorization, AniList Media, Jikan terms được tải cùng phiên qua curl (không phải API live test). Cookies trả về được loại khỏi log. `manifest-sha256.json` cho phép kiểm tra tính toàn vẹn file evidence.
