# Anime Website — Báo cáo khởi động Giai đoạn 1

**Trạng thái:** Đang thực hiện — chưa phải là phê duyệt thoát giai đoạn
**Ngày:** 2026-11-14
**Căn cứ khởi động:** Chỉ dẫn mới nhất của chủ dự án: “hãy bắt đầu làm giai đoạn 1”.

## 1. Phân công đã áp dụng

| Vai trò | Phụ trách | Phạm vi |
| --- | --- | --- |
| Điều phối dự án | ChatGPT agent `gpt-6-luna` | Điều phối các giai đoạn, rà soát bằng chứng, tổng hợp và trình chủ dự án phê duyệt. |
| Nghiên cứu API và dữ liệu | ChatGPT agent `gpt-5.6-terra` | Chỉ nghiên cứu, kiểm chứng API/dữ liệu trong Giai đoạn 2 sau khi được ủy quyền; không tự chọn nhà cung cấp. |
| Triển khai | GitHub Copilot | Chỉ triển khai frontend, backend, cơ sở dữ liệu và tích hợp sau khi kiến trúc được phê duyệt. |
| Quyết định cuối cùng | Chủ dự án | Định hướng, xác nhận yêu cầu, phê duyệt thoát từng giai đoạn và phát hành. |

## 2. Bằng chứng rà soát ban đầu

- Khi bắt đầu rà soát, remote cục bộ `origin` trỏ tới `https://github.com/kenmini098-hash/web.git`; `main` và `origin/main` cùng ở commit `a714bfd` (`Initial commit`). Báo cáo này được commit cục bộ sau lần kiểm tra đó và chưa được push.
- Có 24 tệp scaffold, đều có kích thước 0 byte. Vì vậy tên tệp không được dùng làm bằng chứng cho hành vi, công nghệ, hay tính năng đã triển khai.
- `ARCHITECTURE.md`, `API_CONTRACT.md`, và `DATA_MAPPING.md` hiện rỗng. Chưa có kiến trúc, contract API, schema hay nhà cung cấp API nào được xác minh/phê duyệt.
- Ba tài liệu quản trị hiện có (`PROJECT_PLAN.md`, `REQUIREMENTS.md`, `TASK_BOARD.md`) có thay đổi cục bộ chưa commit. Báo cáo này không sửa hoặc ghi đè các thay đổi đó.

## 3. Yêu cầu quản trị đã xác nhận

- Không chuyển sang giai đoạn sau nếu chưa có phê duyệt riêng của chủ dự án.
- Không sử dụng API chưa kiểm chứng, dữ liệu catalog giả trong sản phẩm, nguồn video không có quyền sử dụng, hay cách vượt giới hạn truy cập.
- Không ghi thông tin xác thực vào mã nguồn; mọi thay đổi triển khai phải có bằng chứng kiểm thử và lịch sử Git phù hợp.
- Thay đổi kiến trúc, API contract, database schema hoặc phạm vi phải được điều phối rà soát và chủ dự án phê duyệt.

## 4. Baseline sản phẩm đang được ghi nhận — cần xác nhận lại tại cổng Giai đoạn 1

Các tài liệu hiện có ghi nhận một MVP gồm giao diện tiếng Việt ưu tiên, duyệt/tìm/lọc/xem chi tiết anime, favorites đồng bộ qua tài khoản, frontend responsive, Node.js/Express.js, dữ liệu thật được xác minh, và không nhúng/host video. Đây là baseline được ghi trong tài liệu cục bộ, **không phải** một quyết định kỹ thuật mới do báo cáo này tạo ra.

Các mục vẫn để mở: nhà cung cấp anime API, quyền và nguồn liên kết xem ngoài, database, API style, hosting, cơ chế xác thực/vòng đời tài khoản, chính sách lưu giữ dữ liệu, vùng phát hành, ma trận trình duyệt, traffic và chỉ tiêu hiệu năng.

## 5. Vấn đề cần điều phối

| Mã | Phát hiện | Bằng chứng | Ảnh hưởng | Cách xử lý đề xuất |
| --- | --- | --- | --- | --- |
| P1-I01 | Trạng thái giai đoạn không nhất quán. | `PROJECT_PLAN.md` ghi Phase 1 đã thoát và Phase 2 chờ ủy quyền; phần Phase 2 lại có tiêu đề “active”. `REQUIREMENTS.md` ghi đã ủy quyền sang Phase 2; `TASK_BOARD.md` ghi P1-06 đang chờ. | Không thể dùng các tài liệu đó để tự tuyên bố hoàn thành hay bắt đầu Phase 2. | Coi Giai đoạn 1 là đang thực hiện theo chỉ dẫn mới nhất; chủ dự án xác nhận/cập nhật baseline khi rà soát. |
| P1-I02 | Tài liệu quản trị chưa được commit/push. | `git status --short --branch` báo ba tệp đã sửa cục bộ. | Chưa có lịch sử Git đáng tin cậy cho các thay đổi trước đó. | Bảo toàn các thay đổi hiện có; chỉ commit các tệp do lượt công việc này tạo ra. Việc gộp/push các bản nháp cũ cần chỉ dẫn riêng. |
| P1-I03 | Chưa có bằng chứng triển khai hoặc quyết định kiến trúc. | 24 tệp scaffold và ba tệp thiết kế nêu trên đều rỗng. | Không được suy luận API, database, UI hay luồng video từ tên tệp. | Chỉ chuyển sang kiến trúc ở Giai đoạn 3 sau khi Giai đoạn 2 được kiểm chứng và phê duyệt. |

## 6. Tiến độ checklist Giai đoạn 1

| ID | Công việc | Trạng thái hiện tại | Bằng chứng / bước tiếp theo |
| --- | --- | --- | --- |
| P1-01 | Rà scaffold và tài liệu hiện có. | Hoàn thành | Mục 2 của báo cáo này. |
| P1-02 | Ghi nhận mục tiêu, phạm vi, ràng buộc và yêu cầu. | Bản nháp sẵn sàng rà soát | `REQUIREMENTS.md` đã có baseline; cần chủ dự án xác nhận lại vì trạng thái tài liệu mâu thuẫn. |
| P1-03 | Liệt kê hành trình người dùng, tính năng phát hành, ràng buộc và quyết định mở. | Hoàn thành bản nháp | Mục 4; các chi tiết UX chỉ được thiết kế ở Giai đoạn 3. |
| P1-04 | Ghi nhận quy tắc bàn giao, xung đột, Git và 7 cổng. | Hoàn thành | `PROJECT_PLAN.md` và các yêu cầu quản trị ở mục 3. |
| P1-05 | Trình yêu cầu/checklist để chủ dự án rà soát. | Chờ chủ dự án | Báo cáo này là bản trình rà soát. |
| P1-06 | Phê duyệt thoát Giai đoạn 1 và ủy quyền riêng cho Giai đoạn 2. | Chưa bắt đầu | Chỉ thực hiện sau P1-05; không được suy diễn từ việc khởi động Giai đoạn 1. |

## 7. Tiêu chí nghiệm thu còn lại

Để kết thúc Giai đoạn 1, chủ dự án cần xác nhận rằng baseline ở mục 4 là đúng hoặc cung cấp các chỉnh sửa; đồng thời xác nhận rằng các quyết định mở vẫn được hoãn sang các cổng thích hợp. Sau đó, điều phối viên sẽ cập nhật trạng thái nhất quán, trình checklist nghiệm thu, và chờ một lệnh ủy quyền **riêng** trước khi bắt đầu Giai đoạn 2.

## 8. Kết luận bàn giao

- **Giai đoạn:** 1 — Yêu cầu và phạm vi
- **Agent phụ trách:** ChatGPT điều phối (`gpt-6-luna`), có báo cáo rà soát từ ChatGPT nghiên cứu (`gpt-5.6-terra`)
- **Nhiệm vụ được giao:** Khởi động và kiểm tra phạm vi/điều kiện Giai đoạn 1
- **Công việc đã hoàn thành:** Rà tài liệu, Git, scaffold, phân công và mâu thuẫn trạng thái
- **File tạo hoặc chỉnh sửa:** Báo cáo này
- **Kết quả kiểm thử:** Kiểm tra Git remote/commit/trạng thái và kích thước scaffold; không có mã để chạy kiểm thử chức năng
- **Bằng chứng hoặc nguồn tham khảo:** Các tệp tài liệu trong `docs/`, Git commit `a714bfd`, và chỉ dẫn khởi động mới nhất của chủ dự án
- **Vấn đề phát hiện:** P1-I01 đến P1-I03
- **Công việc còn tồn đọng:** Xác nhận baseline và phê duyệt thoát Giai đoạn 1
- **Đề xuất:** Rà soát mục 4 và quyết định mở trước khi đóng giai đoạn
- **Trạng thái:** Chờ phê duyệt
