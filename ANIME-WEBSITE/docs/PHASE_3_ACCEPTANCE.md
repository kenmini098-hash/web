# Giai đoạn 3 — Đối chiếu nghiệm thu độc lập

Ngày: 14/11/2026. Phạm vi: tài liệu thiết kế trong working tree tại thời điểm rà soát; không kiểm thử ứng dụng hoặc gọi API. Báo cáo này bổ sung, không thay thế `PHASE_3_ACCEPTANCE_REPORT.md` đang có.

## Kết luận

Bộ tài liệu đủ để chủ dự án xem xét đề xuất, nhưng **chưa đạt điều kiện đóng Giai đoạn 3**. Cần làm rõ các điểm thiết kế dưới đây và nhận quyết định phạm vi/kiến trúc từ chủ dự án. Không có bằng chứng cho phép Giai đoạn 4.

| Tiêu chí theo PROJECT_PLAN | Kết quả | Bằng chứng |
| --- | --- | --- |
| Kiến trúc, contract và mapping thống nhất với yêu cầu | Một phần | Ranh giới Express/Wikidata/PostgreSQL, ID opaque/QID, favorites và lỗi được thống nhất; scope anime-TV/bộ lọc chưa được duyệt. |
| Schema, endpoints, fields và ownership rõ | Một phần | Schema đã có types/nullability/keys; contract có request/success shapes. Cần chốt CSRF sau đăng nhập và trường hợp entity mất nhãn Nhật. |
| Security, errors, responsive và rights được đề cập | Đạt ở mức đề xuất | Có CSRF, session, Argon2id, ownership, secrets, trạng thái UI, responsive/accessibility, không video/ảnh chưa đủ quyền. Không phải chứng nhận bảo mật runtime. |
| Trình tradeoffs và người dùng duyệt phase exit | Chờ phê duyệt | `PHASE_3_DESIGN_REVIEW.md`, mục Open decisions. |
| Cho phép Giai đoạn 4 riêng | Chưa có | `PROJECT_PLAN.md`, tiêu chí Phase 3. |

## Phát hiện cụ thể

1. **P3-R01 — Quyết định phạm vi, chưa phải lỗi triển khai.** `REQUIREMENTS.md:80` yêu cầu browse/search/filter; `ARCHITECTURE.md:27` và `API_CONTRACT.md:14` đề xuất anime-TV-only, chỉ có `entityType=anime_tv`. Với tập kết quả đều anime-TV, đây không tạo bộ lọc có ý nghĩa cho người dùng. Cần chủ dự án chấp nhận phạm vi thu hẹp hoặc yêu cầu thiết kế khả năng lọc bổ sung trước nghiệm thu.
2. **P3-R02 — Khoảng trống contract CSRF.** `API_CONTRACT.md:20`, `DATA_MAPPING.md:47` mô tả GET csrf tạo/refresh session ẩn danh; login xoay session, nhưng chưa quy định endpoint này giữ nguyên session đã đăng nhập, cách cấp lại token sau login/reload và token cũ còn hợp lệ hay không. Bổ sung quy tắc refresh CSRF trên session hiện tại mà không logout người dùng, nhận token mới sau session rotation và hành vi nhiều tab. Không kết luận đây là lỗ hổng đã chạy; hiện là hành vi chưa đủ rõ để triển khai thống nhất.
3. **P3-R03 — Thiếu quy tắc entity không còn nhãn Nhật.** `API_CONTRACT.md:8` yêu cầu title tiếng Nhật và loại record khỏi kết quả; `DATA_MAPPING.md:12` chỉ nói browse/search. Detail/favorite chưa chốt trả 404, unavailable hay dạng khác khi entity vẫn tồn tại và đúng type nhưng mất nhãn Nhật. Cần chọn một hành vi thống nhất để không vi phạm AnimeSummary.title bắt buộc; mất dữ liệu khác với lỗi provider.
4. **P3-R04 — Vai trò trong tài liệu lỗi thời.** `PROJECT_PLAN.md:29` và phần Handoff của `PHASE_3_DESIGN_REVIEW.md` vẫn ghi GPT-5.6 Terra dù người dùng đã đổi nghiên cứu sang GPT-6 Astra. Cần sửa attribution để không giao sai agent. Không ảnh hưởng endpoint nhưng sai quản trị.

5. **P3-R05 — Recent re-authentication chưa có cơ chế.** Contract DELETE `/api/v1/me` yêu cầu recent re-authentication nhưng body là None; chưa chỉ định bước/endpoint xác minh lại, cửa sổ thời gian, hay thuộc tính session để kiểm tra. Có thể quy định login lại là bước xác minh và session mới mang thời điểm xác thực, hoặc bổ sung flow riêng; cần một lựa chọn rõ trước triển khai. Không nên suy `last_seen_at` thành thời điểm xác minh mật khẩu.

## Các quyết định còn mở

### Tái kiểm tra ngày 15/11/2026

Đã đối chiếu lại working tree theo yêu cầu tiếp tục nghiệm thu. Chưa có bằng chứng đóng bất kỳ finding nào trong năm finding trên:

| Finding | Trạng thái | Điều kiện đóng |
| --- | --- | --- |
| R01 | Mở — quyết định phạm vi | Chủ dự án chấp nhận anime-TV và phạm vi lọc thu hẹp, hoặc thiết kế được mở rộng theo yêu cầu đã duyệt. |
| R02 | Mở — thiếu đặc tả | Contract và mapping thống nhất cách lấy CSRF token trên session đã đăng nhập, sau rotation/reload và khi dùng nhiều tab. |
| R03 | Mở — thiếu đặc tả | Quy định detail và favorite khi entity đúng loại nhưng thiếu Japanese title; không tạo AnimeSummary vi phạm title bắt buộc. |
| R04 | Mở — attribution sai | PROJECT_PLAN và PHASE_3_DESIGN_REVIEW dùng GPT-6 Astra theo chỉ dẫn hiện hành. |
| R05 | Mở — thiếu đặc tả | Có bước xác minh lại mật khẩu, thời điểm/cửa sổ xác minh và hành vi từ chối khi quá hạn cho account deletion. |

Các phần đã đạt ở mức đề xuất vẫn giữ nguyên: phân tách backend/provider/database, khóa và ownership của favorites, response/error envelopes, xử lý null và nguyên tắc bảo mật/khôi phục. Việc schema và payload được viết đầy đủ hơn không tự đóng các khoảng trống hành vi trên. Lần này chỉ nghiệm thu tài liệu, không sửa thiết kế, không chạy kiểm thử ứng dụng và không tự phê duyệt giai đoạn. Kết luận vẫn là chưa đạt phase exit; bước kế tiếp là sửa R02/R03/R04/R05 rồi rà soát lại, song song trình R01 cho chủ dự án.

PostgreSQL, session auth, account verification/recovery/deletion, token lifetime, email service, cache, image policy và bộ lọc cần phê duyệt như đã liệt kê trong bản thiết kế. Browser/performance/backup targets cần chốt hoặc ghi rõ mốc chốt trước kiểm thử/phát hành. Chưa có restore thực tế ở Phase 3 không tự động là lỗi: giai đoạn này chỉ yêu cầu nguyên tắc và kế hoạch, bằng chứng thực thi thuộc giai đoạn sau.

## Bàn giao

- Giai đoạn: 3 — nghiệm thu thiết kế.
- Agent phụ trách: reviewer độc lập, không phải người phê duyệt cuối.
- Nhiệm vụ: đối chiếu bảy tài liệu dự án và bản acceptance đã có.
- Hoàn thành: matrix, phân biệt quyết định chủ dự án với điểm thiếu contract, ghi năm findings.
- File tạo: `PHASE_3_ACCEPTANCE.md`; không sửa tài liệu thiết kế/quản trị khác.
- Kiểm thử: rà soát tài liệu; không chạy ứng dụng, không gọi provider, không commit/push.
- Bằng chứng: tên file/mục/dòng tại từng finding; số dòng có thể đổi nếu working tree được cập nhật đồng thời.
- Tồn đọng: R02/R03/R05 làm rõ thiết kế, R04 sửa attribution, R01 và lựa chọn khác chờ chủ dự án.
- Đề xuất: xử lý findings rồi trình lại bộ thiết kế để quyết định nghiệm thu.
- Trạng thái: Chưa đạt phase exit; chưa cho phép Phase 4.
