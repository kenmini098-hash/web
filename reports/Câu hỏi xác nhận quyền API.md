# Câu hỏi xác nhận quyền API

Trạng thái: bản nháp để chủ dự án duyệt; chưa gửi cho bất kỳ nhà cung cấp nào.

## Mô tả sản phẩm dùng chung

Chúng tôi đang đánh giá nguồn metadata cho website khám phá anime giao diện tiếng Việt, có duyệt/tìm kiếm/chi tiết và favorites đồng bộ qua tài khoản riêng. Không host hoặc nhúng video. Chưa chọn nhà cung cấp; khu vực phát hành, mô hình doanh thu và quy mô truy cập sẽ được cung cấp trước khi xin quyền chính thức.

## Gửi AniList khi chủ dự án chọn hướng này

1. Với mô tả trên, favorites riêng có được xem là competing non-complementary list/tracker theo API Terms không? Những giới hạn sản phẩm nào cho phép sử dụng metadata?
2. Có cho phép cache metadata theo nhu cầu người dùng không; TTL, dung lượng, trường được giữ, xóa/refresh và attribution cần áp dụng là gì?
3. Có cho phép hiển thị URL ảnh từ API, chuẩn hóa enum/ngày/điểm cho hiển thị và bản dịch synopsis không? Nếu không, chúng tôi sẽ giữ nội dung gốc.
4. Mô hình doanh thu dự kiến cần license nào? Xin xác nhận cả trường hợp đúng 150 USD/tháng nếu liên quan.

## Gửi MyAnimeList khi chủ dự án chọn hướng này

1. Xin xác nhận phạm vi client registration/quyền tích hợp cho website metadata và favorites với tài khoản riêng, nhất là API Agreement 3(a)(vii) và 4(f).
2. Có cho phép cache catalog server-side không? Xin phân biệt metadata với dữ liệu cá nhân/UGC của MAL, TTL, deletion, attribution và URL ảnh.
3. Theo 3(a)(xii), có cho phép mapping giá trị cho UI, làm sạch HTML và dịch synopsis không? Giao diện tiếng Việt có thể giữ nguyên nội dung metadata gốc nếu cần.
4. Quota hiện hành, header/retry, mức sử dụng dự kiến, thông báo trước release và quyền thương mại cần thực hiện thế nào?
5. Sau xác nhận quyền, chúng tôi cần client ID hợp lệ để thử search/detail/season/pagination; không cần gửi secret qua kênh công khai.

## Thông tin chủ dự án cần điền trước khi gửi

Tên/URL ứng dụng, vùng phát hành, mục đích học tập hay phát hành công khai, doanh thu dự kiến, traffic dự kiến, trường dữ liệu cần dùng, cache dự kiến và người liên hệ. Chưa tự điền các mục này hoặc đại diện người dùng đồng ý điều khoản.
