# Giai đoạn 2 — Bàn giao và rà soát

Ngày: 14/11/2026. Nghiên cứu: GPT-6 Astra. Rà soát độc lập: GPT-6 Luna. Tổng hợp: agent chính.

## Kết quả công việc

Đã hoàn thiện báo cáo tại `../../reports/Đánh giá API anime.md`, bằng chứng tại `../../research_notes/Đánh giá API anime/`, và bản nháp câu hỏi nhà cung cấp tại `../../reports/Câu hỏi xác nhận quyền API.md`.

Đã kiểm tra endpoints, JSON, auth, pagination, quotas và điều khoản của AniList/MAL/Jikan; sàng lọc thêm Kitsu. Đã đề xuất chuẩn hóa dữ liệu và kiểm soát null, trùng ID, ngày thiếu thành phần, score scale và provenance. Đây là đề xuất để thiết kế sau khi chọn nguồn, chưa phải contract/schema được duyệt.

## Rà soát độc lập

GPT-6 Luna đối chiếu các điều khoản và evidence, xác nhận cách phân biệt tài liệu với phép thử thực tế. Góp ý đã đưa vào mục 10 báo cáo: không diễn giải favorites thành bị cấm tuyệt đối; xác nhận quyền là khuyến nghị theo rủi ro sản phẩm; thời hạn xóa theo yêu cầu của MAL không phải TTL metadata; bỏ external watch link theo FR-06 khi chưa có bằng chứng quyền/vùng.

## Kết quả kiểm tra

- AniList: phép thử ban đầu và 5 phép thử bổ sung trả 200. Mẫu bổ sung có 6 ID riêng biệt, hai trang search không lặp ID, upcoming/ongoing có trường null. Không suy rộng thành chất lượng toàn catalog.
- MAL: no-auth trả 403; authenticated success chưa kiểm chứng vì chưa có client ID hợp lệ.
- Jikan: probe timeout; kết luận public ngừng dựa trên thông báo maintainer, không dựa trên timeout.
- Manifest evidence ban đầu đã được kiểm tra hash thành công. Các phép thử mới có request/response và timestamp riêng.
- Không có kiểm thử tích hợp ứng dụng vì chưa ở giai đoạn triển khai.

## Checklist và quyết định còn lại

| Công việc | Trạng thái |
| --- | --- |
| Báo cáo nguồn chính thức, endpoint/JSON/limits/terms | Hoàn thành nghiên cứu, các giới hạn bằng chứng được ghi rõ |
| Chuẩn hóa, dữ liệu thiếu, mẫu kiểm thử và quyền video | Hoàn thành đề xuất; link xem ngoài bỏ theo FR-06 |
| Review độc lập và khuyến nghị | Hoàn thành |
| Chọn/từ chối nguồn | Chờ chủ dự án |
| Cho phép liên hệ nhà cung cấp | Chưa có; bản nháp chưa gửi |
| MAL authenticated test nếu chọn hướng MAL | Cần client ID hợp lệ và phạm vi sử dụng rõ |
| Phê duyệt thoát Giai đoạn 2 / bắt đầu Giai đoạn 3 | Chờ chủ dự án; chưa chuyển giai đoạn |

Khuyến nghị: từ chối Jikan public; ưu tiên làm rõ MAL cho MVP hiện tại, AniList là ứng viên thay thế có điều kiện; Kitsu chưa đủ bằng chứng điều khoản để chọn. Không tự đăng ký tài khoản, đồng ý điều khoản hoặc gửi thư đại diện chủ dự án.

## Bàn giao

Nhiệm vụ: hoàn thiện nghiên cứu và kiểm tra Giai đoạn 2. File tạo/sửa: báo cáo, evidence, script probe nghiên cứu, bản nháp hỏi quyền và bản bàn giao này. Không sửa mã ứng dụng hoặc ba tài liệu quản trị đang có thay đổi từ trước. Kiểm chứng kỹ thuật và nguồn tham khảo nằm tại các liên kết trong báo cáo. Còn tồn đọng: quyết định nguồn, điều kiện provider và phê duyệt của chủ dự án. Trạng thái: phần nghiên cứu và review hoàn thành; toàn Giai đoạn 2 chờ quyết định, chưa nghiệm thu.
