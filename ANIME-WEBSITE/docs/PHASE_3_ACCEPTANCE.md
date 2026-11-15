# Giai đoạn 3 — Đối chiếu nghiệm thu độc lập

Rà soát ban đầu: 14/11/2026. Phạm vi: tài liệu thiết kế trong working tree tại thời điểm rà soát; không kiểm thử ứng dụng hoặc gọi API. Các kết quả hiện hành sau quyết định chủ dự án ngày 15/11/2026 được ghi ở phần cập nhật bên dưới. Báo cáo này bổ sung, không thay thế `PHASE_3_ACCEPTANCE_REPORT.md` đang có.

## Kết luận

Bộ tài liệu đã được tái nghiệm thu ngày 15/11/2026 trước khi chủ dự án chốt phạm vi anime TV + anime film. Sau quyết định đó, R01 đã được giải quyết về hướng phạm vi; các tài liệu đã được cập nhật và rà soát chéo. Gói thiết kế đầy đủ vẫn chờ chủ dự án phê duyệt. **Chưa đóng Giai đoạn 3 và chưa cho phép Giai đoạn 4.** Các findings ban đầu được giữ làm lịch sử; cập nhật mới nhất ở cuối tài liệu là trạng thái hiện hành.

| Tiêu chí theo PROJECT_PLAN | Kết quả | Bằng chứng |
| --- | --- | --- |
| Kiến trúc, contract và mapping thống nhất với yêu cầu | Được cập nhật, chờ rà soát cuối | Ranh giới Express/Wikidata/PostgreSQL, ID opaque/QID, favorites, loại TV/film và bộ lọc đã được cập nhật theo quyết định; toàn bộ gói vẫn chưa được duyệt. |
| Schema, endpoints, fields và ownership rõ | Đạt ở mức đề xuất sau sửa | Schema có types/nullability/keys; contract có request/success shapes; CSRF, thiếu nhãn Nhật và recent re-authentication đã được đối chiếu lại. |
| Security, errors, responsive và rights được đề cập | Đạt ở mức đề xuất | Có CSRF, session, Argon2id, ownership, secrets, trạng thái UI, responsive/accessibility, không video/ảnh chưa đủ quyền. Không phải chứng nhận bảo mật runtime. |
| Trình tradeoffs và người dùng duyệt phase exit | Chờ phê duyệt | `PHASE_3_DESIGN_REVIEW.md`, mục Open decisions. |
| Cho phép Giai đoạn 4 riêng | Chưa có | `PROJECT_PLAN.md`, tiêu chí Phase 3. |

## Phát hiện cụ thể

1. **P3-R01 — Phát hiện lịch sử, đã giải quyết về hướng phạm vi.** Bản thiết kế ban đầu chỉ có anime-TV nên filter loại nội dung không có ý nghĩa. Ngày 15/11 chủ dự án yêu cầu anime TV + anime film cùng filter thể loại/năm; tài liệu và bằng chứng API đã cập nhật. Việc chấp nhận toàn bộ thiết kế vẫn đang chờ.
2. **P3-R02 — Khoảng trống contract CSRF.** `API_CONTRACT.md:20`, `DATA_MAPPING.md:47` mô tả GET csrf tạo/refresh session ẩn danh; login xoay session, nhưng chưa quy định endpoint này giữ nguyên session đã đăng nhập, cách cấp lại token sau login/reload và token cũ còn hợp lệ hay không. Bổ sung quy tắc refresh CSRF trên session hiện tại mà không logout người dùng, nhận token mới sau session rotation và hành vi nhiều tab. Không kết luận đây là lỗ hổng đã chạy; hiện là hành vi chưa đủ rõ để triển khai thống nhất.
3. **P3-R03 — Thiếu quy tắc entity không còn nhãn Nhật.** `API_CONTRACT.md:8` yêu cầu title tiếng Nhật và loại record khỏi kết quả; `DATA_MAPPING.md:12` chỉ nói browse/search. Detail/favorite chưa chốt trả 404, unavailable hay dạng khác khi entity vẫn tồn tại và đúng type nhưng mất nhãn Nhật. Cần chọn một hành vi thống nhất để không vi phạm AnimeSummary.title bắt buộc; mất dữ liệu khác với lỗi provider.
4. **P3-R04 — Vai trò trong tài liệu lỗi thời.** `PROJECT_PLAN.md:29` và phần Handoff của `PHASE_3_DESIGN_REVIEW.md` vẫn ghi GPT-5.6 Terra dù người dùng đã đổi nghiên cứu sang GPT-6 Astra. Cần sửa attribution để không giao sai agent. Không ảnh hưởng endpoint nhưng sai quản trị.

5. **P3-R05 — Recent re-authentication chưa có cơ chế.** Contract DELETE `/api/v1/me` yêu cầu recent re-authentication nhưng body là None; chưa chỉ định bước/endpoint xác minh lại, cửa sổ thời gian, hay thuộc tính session để kiểm tra. Có thể quy định login lại là bước xác minh và session mới mang thời điểm xác thực, hoặc bổ sung flow riêng; cần một lựa chọn rõ trước triển khai. Không nên suy `last_seen_at` thành thời điểm xác minh mật khẩu.

## Các quyết định còn mở

### Trạng thái ở lần tái nghiệm thu ngày 15/11/2026 — trước quyết định mở rộng phạm vi

Đã đối chiếu lại working tree trước khi chủ dự án chốt anime film và các bộ lọc. Khi đó R01 còn chờ quyết định phạm vi; R02-R05 đã được xử lý ở mức đặc tả:

| Finding | Trạng thái | Điều kiện đóng |
| --- | --- | --- |
| R01 | Đã giải quyết về hướng phạm vi | Chủ dự án yêu cầu anime-TV + anime-film và filter thể loại/năm; cập nhật tài liệu đã được thực hiện, chờ rà soát cuối trong gói Phase 3. |
| R02 | Đóng ở mức đặc tả | Contract/mapping quy định CSRF token trên session hiện tại, sau session rotation và trong nhiều tab. |
| R03 | Đóng ở mức đặc tả | Thiếu nhãn Nhật trả 404 ở detail; favorite giữ reference và hiển thị unavailable, không nhầm lỗi provider. |
| R04 | Đóng | Attribution được cập nhật sang GPT-6 Astra. |
| R05 | Đóng ở mức đặc tả | Có `authenticated_at`, bước đăng nhập lại cùng tài khoản, cửa sổ đề xuất 5 phút và xác nhận lại khi xóa tài khoản. |

Các phần đã đạt ở mức đề xuất vẫn giữ nguyên: phân tách backend/provider/database, khóa và ownership của favorites, response/error envelopes, xử lý null và nguyên tắc bảo mật/khôi phục. Lần rà soát chỉ ở mức tài liệu, không có kiểm thử ứng dụng hoặc tự phê duyệt giai đoạn. Ở thời điểm đó Phase 3 vẫn chờ chủ dự án quyết định R01 và phê duyệt các lựa chọn kiến trúc.

Các hướng PostgreSQL, session auth, không cache catalog và REST/JSON đã được chọn; schema và toàn bộ thiết kế vẫn cần phê duyệt. Account verification/recovery/deletion, token lifetime, email service, facet/year semantics chi tiết và tiêu chí vận hành còn mở. Không dùng media nếu chưa có quyền riêng. Browser/performance/backup targets cần chốt hoặc ghi rõ mốc chốt trước kiểm thử/phát hành. Chưa có restore thực tế ở Phase 3 không tự động là lỗi: giai đoạn này chỉ yêu cầu nguyên tắc và kế hoạch, bằng chứng thực thi thuộc giai đoạn sau.

### Tái nghiệm thu sau sửa ngày 15/11/2026

Đây là kết quả cập nhật sau bảng kiểm tra trước đó; các findings lịch sử phía trên được giữ để truy vết.

| Finding | Kết quả đối chiếu sửa | Bằng chứng hiện hành |
| --- | --- | --- |
| R01 | Đã giải quyết về hướng phạm vi | Chủ dự án yêu cầu anime-TV + anime-film và filter thể loại/năm; tài liệu đã cập nhật, toàn gói vẫn chờ duyệt. |
| R02 | Đóng ở mức đặc tả | HMAC từ raw session ID, không lưu CSRF hash, reissue cùng session, session rotation làm token cũ hết hiệu lực, lỗi 403 CSRF_INVALID không replay. Contract dòng 20 bảo toàn user binding/expiry của session đăng nhập; dòng 26 phân biệt anonymous/expired login với re-auth của authenticated session. |
| R03 | Đóng ở mức đặc tả | API contract, mapping, architecture và UI đều quy định detail thiếu nhãn Nhật trả 404; favorite giữ reference, unavailable/metadata null; không nhầm lỗi provider. |
| R04 | Đóng | Đã đọc lại PROJECT_PLAN dòng 29, REQUIREMENTS dòng 20 và Handoff của PHASE_3_DESIGN_REVIEW: đều ghi GPT-6 Astra. |
| R05 | Đóng ở mức đặc tả | sessions có authenticated_at, chỉ set sau xác minh mật khẩu; DELETE yêu cầu confirm:true và cửa sổ đề xuất 5 phút; 403 REAUTH_REQUIRED dẫn login cùng tài khoản, lấy CSRF mới, xác nhận lại; không dùng last_seen hay tự replay. |

Đóng ở mức đặc tả không phải kiểm thử runtime hoặc phê duyệt kiến trúc. Toàn Giai đoạn 3 vẫn chờ chủ dự án duyệt các lựa chọn và phạm vi.

## Bàn giao

- Giai đoạn: 3 — nghiệm thu thiết kế.
- Agent phụ trách: reviewer độc lập, không phải người phê duyệt cuối.
- Nhiệm vụ: đối chiếu bảy tài liệu dự án và bản acceptance đã có.
- Hoàn thành: đối chiếu nhất quán tài liệu theo quyết định chủ dự án; cập nhật trạng thái findings và phân biệt quyết định đã chọn với các chi tiết còn chờ duyệt.
- File cập nhật trong đợt rà soát này: `REQUIREMENTS.md`, `API_CONTRACT.md`, `DATA_MAPPING.md`, `API_VERIFICATION_REPORT.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`, `TASK_BOARD.md`, `PHASE_3_DESIGN_REVIEW.md` và các acceptance reports. Không sửa application code.
- Kiểm thử: rà soát tài liệu; không chạy ứng dụng, không gọi provider, không commit/push.
- Bằng chứng: tên file/mục/dòng tại từng finding; số dòng có thể đổi nếu working tree được cập nhật đồng thời.
- Tồn đọng hiện hành: chủ dự án duyệt gói Phase 3 và quyết định lifecycle tài khoản; hosting vendor phải được chọn trước triển khai. R01 đã giải quyết về hướng phạm vi, R02/R03/R04/R05 đóng ở mức tài liệu.
- Đề xuất: trình bộ thiết kế đã sửa để chủ dự án quyết định; kiểm chứng runtime ở các giai đoạn triển khai/kiểm thử sau khi được phép.
- Trạng thái: Chưa đạt phase exit; chưa cho phép Phase 4.

## Cập nhật sau quyết định chủ dự án — 15/11/2026

Chủ dự án đã chọn mở rộng yêu cầu catalog gồm anime TV và anime film, đồng
thời yêu cầu bộ lọc loại nội dung, thể loại và năm. Chủ dự án cũng chọn
PostgreSQL, email/password + Argon2id + server-side session, không cache
catalog, và REST/JSON. Đây là quyết định hướng thiết kế, chưa phải phê duyệt
toàn bộ bộ tài liệu hay Phase 3 exit.

R01 đã được giải quyết về hướng phạm vi. API và mapping được cập nhật theo
chứng cứ mẫu: `P31=Q63952888` cho anime TV, `P31=Q20650540` cho anime film;
lọc thể loại dùng `P136` đã xác minh loại entity/nhãn tiếng Nhật; lọc năm dùng
`P580` cho TV và `P577` với qualifier `P291=Q17` cho ngày công chiếu Nhật của
film. Các mẫu không chứng minh độ phủ catalog hoặc taxonomy thể loại đầy đủ.
R02-R05 vẫn chỉ được đóng ở mức đặc tả; không có kiểm thử runtime.

**Trạng thái tại lần cập nhật trước:** Bộ thiết kế đã được rà soát theo
phạm vi TV/film, genre/year; mục tiêu vận hành chi tiết chưa được đặc tả.

## Bắt đầu nghiệm thu theo yêu cầu — 15/11/2026

Đã chốt trong bản thiết kế cách phối hợp các bộ lọc: `entityType`, `genreId`
và `year` kết hợp AND; chỉ lọc theo genre facet đã xác minh và có nhãn Nhật;
TV dùng năm `P580`, phim dùng năm sớm nhất có `P577` với `P291=Q17`. Facet
tối đa 30 giá trị từ trang ứng viên đầu tiên chưa lọc của cùng truy vấn, có
thứ tự ổn định, không đếm và không tuyên bố đầy đủ. Ngày thiếu/không đủ độ
chính xác không khớp filter năm. Các quy tắc đã đồng bộ vào contract,
mapping, architecture và journey UI.

Mục tiêu nghiệm thu đã được chủ dự án phê duyệt: 25 người dùng hoạt động đồng thời; 5 request/s
duy trì, 10 request/s tối đa 60 giây; p95 <=500 ms cho health/auth/favorite
write không gọi provider; catalog và favorite list có metadata p95 <=5 s/p99
<=8 s khi Wikidata phản hồi, deadline provider 8 s; 99.5% khả dụng hàng tháng
cho health/auth/favorite write; LCP <=2.5 s, INP <=200 ms, CLS <=0.1
ở p75. Hỗ trợ bản major hiện tại và trước đó của Chrome/Edge/Firefox/Safari,
iOS Safari và Android Chrome; kiểm tra viewport 320/375/768/1024/1440 CSS px.
Backup PostgreSQL mã hóa hàng đêm, giữ 7 bản ngày, RPO <=24 giờ, RTO <=8 giờ,
diễn tập khôi phục cô lập hàng quý và trước phát hành. Đây là mục tiêu thiết
kế, chưa có kết quả kiểm thử thực tế; Wikidata không có SLO/quota đã xác minh.

**Kết quả nghiệm thu tài liệu:** Đã bắt đầu và hoàn tất rà soát nhất quán ở
mức thiết kế. Chủ dự án đã duyệt kiến trúc, các quy tắc filter và mục tiêu
vận hành nêu trên, API contract, schema và Phase 3 exit; chưa có kiểm thử
runtime. Lifecycle tài khoản và hosting vendor là blockers trước triển khai.
Phase 4 chưa được cho phép.
