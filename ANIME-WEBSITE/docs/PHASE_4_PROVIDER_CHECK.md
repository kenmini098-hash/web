# Phase 4 — Kiểm chứng Wikidata

**Ngày:** 2026-11-15. **Researcher:** GPT-6 Astra. **Trạng thái:** cần sửa và kiểm tra lại; không xác nhận integration pass.

Đã đọc requirements, data mapping, API verification report và adapter `backend/wikidata.js`. Áp dụng ponytail: chỉ kiểm chứng phần public catalog, không chỉnh mã, không mở rộng provider, không tải hàng loạt. Ba API request read-only được thực hiện; không credential, không retry, mỗi request deadline 8 giây. Không persist/cache catalog cho ứng dụng; báo cáo chỉ ghi evidence nghiên cứu rút gọn.

## Kết quả trực tiếp

| UTC ngày 2026-11-15 | Request | Kết quả |
| --- | --- | --- |
| 06:56:32.023 | GET Action API `wbgetentities`, 6 IDs, `props=labels|claims`, `languages=ja|en` | HTTP 200, 1376 ms. Xác nhận classes và dữ liệu mẫu dưới đây. |
| 06:56:33.401 | POST `https://query.wikidata.org/sparql`, query do `buildSparql` sinh; candidate Q21697406, `entityType=anime_film`, `year=2016`, `limit=1` | HTTP 200, 719 ms; `results.bindings=[]`. Không đạt kỳ vọng tìm phim mẫu. |
| 06:56:34.121 | POST cùng endpoint; candidate Q22126305, `entityType=anime_tv`, `year=2013`, `limit=1` | HTTP 200, 633 ms; `results.bindings=[]`. Không đạt kỳ vọng tìm TV mẫu. |

Hai SPARQL request dùng form URL encoded `query`, `format=json`, Accept `application/sparql-results+json`. User-Agent `AnimeWebsite/0.4 (+https://github.com/kenmini098-hash/web)`. Query được lấy nguyên hàm `buildSparql` của adapter bằng module tạm trong bộ nhớ; không sửa file hoặc thay query trước khi gửi. `after=null`; không genre filter. Source hash ghi nhận sau phép thử: SHA256 `A732784FA05BB4389C4A09675B07F2782EEB01120A54980BBA39ECDE3B6F7C0F`. Kết quả này thuộc phiên bản được đọc, không tự áp dụng cho các bản sửa sau.

[URL Action API đầy đủ](https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q63952888%7CQ20650540%7CQ201658%7CQ4178140%7CQ21697406%7CQ22126305&props=labels%7Cclaims&languages=ja%7Cen&format=json).

Các giá trị quan sát từ response Action API:

- Q63952888: English `anime television series`; Japanese `テレビアニメシリーズ`.
- Q20650540: English `anime film`; Japanese `アニメ映画`; chính class này cũng có `P31=Q201658`.
- Q201658: `film genre`; Q4178140: `anime and manga genre`.
- Q21697406: Japanese `君の名は。`; `P31=Q20650540`; `P577=+2016-08-26T00:00:00Z`, precision 11, qualifier `P291=Q17`, normal rank. Có nhiều ngày phát hành ở nơi khác, nên dùng ngày không qualifier không đúng quy tắc Japan đã duyệt.
- Q22126305: Japanese `進撃の巨人`; `P31=Q63952888`; `P580=+2013-04-07T00:00:00Z`, precision 11, normal rank.

Đây là mẫu hai tác phẩm, không chứng minh catalog đầy đủ, freshness giữa Action API và WDQS, Japanese coverage toàn bộ, hay SLO. HTTP 200 của SPARQL chỉ xác nhận transport/JSON hợp lệ; không chứng minh query cho kết quả đúng.

## Findings cần implementation xử lý

**F1 — Year filter chưa đạt trên hai mẫu có ngày phù hợp.** Adapter sinh `FILTER(?type=...)` trong từng nhánh `UNION` của `OPTIONAL`, trong khi `?type` được bind ở group ngoài. Nghi vấn scope/evaluation khiến date branch không bind, sau đó `HAVING(MIN(?yearCandidate)=...)` loại item. Đây là chẩn đoán từ đọc code, chưa cô lập bằng query sửa. Cũng chưa loại trừ độ trễ dữ liệu WDQS. Cần sửa/kiểm tra scope rồi chạy lại đúng hai case; kỳ vọng có year 2016 và 2013. Không được báo empty là do tác phẩm không tồn tại.

**F2 — Genre validation chưa loại media type theo mapping.** `Q20650540` có P31 `Q201658` và nhãn Nhật, nên chỉ kiểm tra genre class hiện tại vẫn chấp nhận chính `anime film` nếu item có P136 trỏ vào đó. Adapter cần loại các media type IDs rõ ràng ở cả output genre và genre-filter validation theo thiết kế đã duyệt. Không thử tạo dữ liệu sai hoặc sửa Wikidata. Đây là khoảng hở được xác định từ code + class live, không phải khẳng định hai tác phẩm mẫu hiện chứa genre sai.

**F3 — Rank của date statement cần làm rõ trong xử lý “valid”.** Đọc date bằng `p:/psv:` không tự loại deprecated như truthy `wdt:`. Query được đọc chưa có điều kiện rank cho ngày; có thể lấy năm từ statement deprecated. Không thấy deprecated date trong hai mẫu. Đề nghị ít nhất loại DeprecatedRank; không tự chuyển sang preferred-only nếu chưa thống nhất semantics. [RDF format chính thức](https://www.mediawiki.org/wiki/Wikibase/Indexing/RDF_Dump_Format#Truthy_statements).

Class IDs đã chọn đúng tên/ý nghĩa trong nguồn chính thức: [anime television series](https://www.wikidata.org/wiki/Q63952888), [anime film](https://www.wikidata.org/wiki/Q20650540). Genre class allowlist và P136 là taxonomy lọc có chủ ý, không bao phủ mọi genre. Ngày Japan phải giữ qualifier P291=Q17; `timePrecision>=9` tương ứng year hoặc chính xác hơn theo model đã duyệt. Mô tả entity không phải synopsis. [Wikibase RDF time representation](https://www.mediawiki.org/wiki/Wikibase/Indexing/RDF_Dump_Format#Time).

## Endpoint, quyền và giới hạn vận hành

`https://query.wikidata.org/sparql` trả HTTP 200 cho hai request trên. Endpoint cấu hình `https://query-next.wikidata.org/sparql` chưa được thử trong đợt này; không coi việc có trong allowlist là proof production-ready. Trang migration chính thức hiện mô tả pilot/initial implementation, dự kiến mở endpoints mới tuần 16/11/2026 và legacy có thể degraded từ 02/2027. Lịch là thông báo dự kiến, không phải bằng chứng endpoint mới đã sẵn sàng. Cần kiểm tra hướng dẫn migration trước triển khai. [Migration](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/WDQS_backend_update), [hướng dẫn chuyển đổi](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/WDQS_backend_update/Migrate).

Wikidata structured data thuộc CC0; đây là quyền dữ liệu có cấu trúc, không trao quyền đối với video hoặc ảnh ở ngoài Wikidata. Không thay đổi chính sách không host/embed/watch link của MVP. [Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing).

Không suy 3 request thành chứng nhận tải 5 requests/s, 25 concurrent users hoặc p95. Chưa xác minh numerical quota/SLO hiện hành trong lượt nhỏ này. Không test tải/rate saturation, frontend, authentication, DB hoặc backup. Không chạy thêm API request sau giới hạn 3 request được giao.

## Handoff

- Hoàn tất kiểm chứng read-only; API entity class/date có evidence live mới.
- Hai year-filter probe trả empty trái kỳ vọng; cần corrective work trước nghiệm thu provider integration.
- Chỉ thêm báo cáo này. Không sửa code, commit/push hoặc phê duyệt Phase 4 exit.
- Sau sửa, implementation cần ghi evidence mới cho TV/year, film/Japan-year và genre exclusion; các kiểm tra browse/search/pagination/end-to-end còn thuộc agent triển khai/review.
