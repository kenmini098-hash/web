# Đánh giá API anime — Giai đoạn 2

Ngày kiểm chứng: 14/11/2026. Researcher: GPT-6 Astra; điều phối/review: GPT-6 Luna. Phạm vi: AniList, MyAnimeList API v2 (MAL), Jikan v4 cho MVP tiếng Việt: duyệt, tìm kiếm/lọc, chi tiết, favorites đồng bộ qua tài khoản. Đây là báo cáo nghiên cứu và đề xuất; **chưa chọn nguồn, chưa phê duyệt thoát Giai đoạn 2, chưa bắt đầu Giai đoạn 3**.

## 1. Kết luận phục vụ quyết định

**Chưa ứng viên nào đủ bằng chứng để duyệt tích hợp ngay cho toàn bộ MVP.** Đề xuất tiếp tục làm rõ quyền sử dụng trong Giai đoạn 2:

| Ứng viên | Kết quả | Khuyến nghị nghiên cứu |
| --- | --- | --- |
| AniList | API công khai hoạt động trong một phép thử nhỏ; terms cấm dịch vụ cạnh tranh dạng list/tracker và thu thập hàng loạt. | Chỉ giữ làm ứng viên có điều kiện: xác nhận bằng văn bản tính tương thích của favorites/tài khoản riêng, cache và mục đích thương mại. |
| MAL API v2 | Tài liệu chính thức đáp ứng search/detail/ranking/season; cần client ID. Terms có hạn chế đáng kể về dữ liệu, sửa/dịch nội dung và personal information. | Ưu tiên **làm rõ với MAL**, không đồng nghĩa chọn MAL. Chỉ thử có xác thực khi đã được cấp thông tin hợp lệ và phạm vi sử dụng rõ. |
| Jikan public | Maintainer thông báo ngừng từ 01/10/2026; phép thử riêng timeout. | Đề xuất loại public service khỏi phương án production. Không tự chuyển sang mirror hoặc self-host. |

Căn cứ: [AniList terms](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/terms-of-use.md), [MAL API Agreement](https://myanimelist.net/static/apiagreement.html), [Jikan thông báo #613](https://github.com/jikan-me/jikan-rest/issues/613). Các kết luận về MVP là suy luận đánh giá rủi ro, không phải nhà cung cấp đã chấp thuận hay từ chối dự án.

## 2. Cách kiểm chứng và giới hạn

Đã đọc tài liệu dự án hiện tại và giữ nguyên các tài liệu dirty `PROJECT_PLAN.md`, `REQUIREMENTS.md`, `TASK_BOARD.md`. Nguồn chính là tài liệu/terms hoặc repository của chính nhà cung cấp. Web reader gặp lỗi với một số trang; HTTP trực tiếp tải được MAL docs và repo chính thức AniList. Không dùng snippet làm kết quả live test, không đăng nhập, không credentials, không kiểm tra tải, không bypass và không gọi mutation.

Evidence đặt tại [thư mục nghiên cứu](../research_notes/Đánh%20giá%20API%20anime/). `request-log.json` lưu URL, method, thời điểm UTC, status, header đã bỏ cookie; body được lưu riêng. `collect_evidence.py` tái hiện các probe nhỏ nhưng không cần chạy lại để review. Những ví dụ bên dưới ghi rõ live hoặc sơ đồ tài liệu; không phải dữ liệu production được nhập vào dự án.

| Phép thử thực tế | Kết quả | Chứng minh được / không chứng minh được |
| --- | --- | --- |
| AniList POST, Page 1/perPage 2, search Cowboy Bebop, type ANIME, isAdult false | 200; 2 kết quả; `X-RateLimit-Limit: 30`, remaining 29 | Xác nhận request và JSON này tại thời điểm đo; không chứng minh SLA, độ đầy đủ toàn catalog hoặc quyền dùng cho MVP. |
| MAL GET `/v2/anime?q=Cowboy%20Bebop&limit=1`, không client ID/token | 403, `{"message":"","error":"forbidden"}` | Chỉ là phản hồi không xác thực; không kết luận API hỏng, không suy luận nguyên nhân chính xác từ 403. |
| Jikan GET `/v4/anime/1`, timeout 20 giây | Transport timeout; không có HTTP status/JSON | Không xác nhận shutdown toàn cầu từ timeout. Kết luận public bị ngừng dựa vào thông báo maintainer. |

Nguồn kết quả: [request log](../research_notes/Đánh%20giá%20API%20anime/request-log.json), [AniList body](../research_notes/Đánh%20giá%20API%20anime/anilist-probe.txt), [MAL body](../research_notes/Đánh%20giá%20API%20anime/mal-probe-no-credentials.txt).

## 3. AniList

### Giao diện và dữ liệu

Một endpoint GraphQL `POST https://graphql.anilist.co`, JSON `{query, variables}`. Public anime metadata không cần OAuth; private data/mutations cần OAuth2. `Media(id:...)` lấy một bản ghi; `Page(page:...,perPage:...) { media(search:...,type:ANIME,...) }` dùng cho danh sách. Lọc cần chọn đúng argument/schema; không suy diễn API nội bộ của dự án phải là GraphQL. [Authentication](https://docs.anilist.co/guide/auth/), [pagination chính thức](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/graphql/pagination.md), [probe](../research_notes/Đánh%20giá%20API%20anime/request-log.json).

Ví dụ JSON **rút gọn từ probe thực tế**:

```json
{"data":{"Page":{"pageInfo":{"currentPage":1,"hasNextPage":true,"perPage":2},"media":[{"id":1,"idMal":1,"title":{"romaji":"Cowboy Bebop","english":"Cowboy Bebop","native":"カウボーイビバップ"},"episodes":26,"format":"TV","status":"FINISHED","averageScore":86}]}}}
```

Probe đầy đủ chứa thêm phim điện ảnh ID 5; bản rút gọn không giữ đủ số phần tử. Fields được hỗ trợ gồm `idMal`, title, coverImage, description, genres, episodes, status, dates, score, siteUrl, externalLinks; trường có thể nullable. `idMal` là ánh xạ có sẵn, không phải bảo đảm mọi record có MAL ID. [Media reference](https://raw.githubusercontent.com/AniList/docs/master/docs/reference/object/media.md).

Pagination phải dựa vào `hasNextPage`; docs cảnh báo `total` và `lastPage` hiện không chính xác. Một Page chỉ chứa một loại tập kết quả, ngoại trừ `pageInfo`. Không tuyên bố số bản ghi toàn bộ từ các trường degraded. Giới hạn perPage tối đa chưa được kiểm chứng trong hồ sơ này. [Pagination](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/graphql/pagination.md).

### Quota, terms, chất lượng

Docs nêu mức thường 90 requests/phút nhưng cảnh báo degraded còn **30/phút**, có burst limit và không nhận yêu cầu tăng quota lúc này. Probe thấy 30; không thử gây 429. Xử lý theo header hiện hành, `Retry-After`/`X-RateLimit-Reset`, không hardcode 90. [Rate limiting](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/rate-limiting.md).

Terms cấm dùng làm storage/backup, hoarding/mass collection và competing non-complementary list/tracker, kể cả chỉ dùng media metadata. Có quy tắc tên ứng dụng nếu chứa AniList/AniChart. Commercial dưới 150 USD doanh thu/tháng được miễn phí; trên ngưỡng cần license; câu chữ không giải quyết rõ đúng 150 USD. Không tìm thấy trong terms này TTL cache chung hoặc giấy phép blanket cho tải lại ảnh. [Terms](https://raw.githubusercontent.com/AniList/docs/master/docs/guide/terms-of-use.md).

**Suy luận:** favorites đồng bộ qua tài khoản có thể gần list/tracker; cần mô tả sản phẩm cho AniList xác nhận, không tự gọi nó “bookmark” để bỏ qua điều khoản. Hai bản ghi mẫu không đủ đánh giá tỷ lệ thiếu synopsis, độ mới mùa hiện tại, trùng lặp hay chất lượng tiếng Việt. Không có bằng chứng SLA cập nhật hoặc quyền tạo bản dịch hàng loạt.

## 4. MyAnimeList API v2

### Endpoint, xác thực và pagination

Base `https://api.myanimelist.net/v2`. Metadata endpoint cho phép header `X-MAL-CLIENT-ID` với client ID đăng ký, hoặc OAuth Bearer. Không cung cấp client ID công khai giả để thử. [API reference](https://myanimelist.net/apiconfig/references/api/v2).

| Method/path | Tham số và mục đích được tài liệu hóa |
| --- | --- |
| GET `/anime` | `q`, `limit` tối đa 100, `offset` mặc định 0, `fields`; search. |
| GET `/anime/{anime_id}` | `fields`; lấy chi tiết. |
| GET `/anime/ranking` | `ranking_type` (all/airing/upcoming/tv/ova/movie/special/bypopularity/favorite), limit tối đa 500, offset, fields. |
| GET `/anime/season/{year}/{season}` | winter/spring/summer/fall; sort anime_score hoặc anime_num_list_users; limit tối đa 500, offset, fields. |

Danh sách dùng `data` và `paging.previous/next`; schema nhúng xác định item chứa `node` cho anime list. Detail chọn fields như `id,title,main_picture,alternative_titles,synopsis,mean,genres,status,num_episodes,start_date,end_date,updated_at`. Không yêu cầu fields thì không trả mọi trường. Search endpoint đã đọc không có generic genre/status filter như Jikan: phải chốt UX filter theo khả năng nguồn, không lọc trang cục bộ rồi quảng bá là toàn catalog. [API reference](https://myanimelist.net/apiconfig/references/api/v2).

JSON **sơ đồ hình dạng từ tài liệu, không phải response thành công đã đo**:

```text
list:   { data: [{ node: { id, title, main_picture?, ...selectedFields } }], paging: { previous?, next? } }
detail: { id, title, main_picture?, synopsis?, genres?, ...selectedFields }
```

OAuth user được hướng dẫn Authorization Code + PKCE (docs nói chỉ `plain`), GET `/v1/oauth2/authorize`, POST `/v1/oauth2/token`, refresh token. Trang API reference vẫn ghi flow implicit; trang authorization có ví dụ version cũ và lifetime không nhất quán giữa bảng và example. **Không hardcode lifetime từ ví dụ**; nếu chọn sau này, kiểm tra `expires_in` thực và tài liệu hiện hành. Không cần đồng bộ MAL list để thực hiện favorites riêng trừ khi được duyệt. [Authorization](https://myanimelist.net/apiconfig/references/authorization), [reference](https://myanimelist.net/apiconfig/references/api/v2).

### Terms và vấn đề phải đóng

Agreement bản đang công bố ghi modified 08/08/2019. Các điều khoản có tác động trực tiếp: 2(a) cần client ID và không có implied license; 3(a)(vii) hạn chế integration chưa được cho phép bằng văn bản; 3(a)(ix–xii) hạn chế giả giao diện/nhận diện MAL và sửa, dịch nội dung; 3(a)(xiv) commercial cần chấp thuận bằng văn bản. 3(c) hạn chế lưu/xử lý server-side personal information/UGC của MAL; 3(e) yêu cầu cập nhật/xóa theo yêu cầu trong 24 giờ — **không phải TTL cache metadata 24 giờ**. 4(b) yêu cầu thông báo khi phát hành/thay đổi lớn; 4(f) có wording hạn chế thu thập personal info ngoài API; 4(i) cấm scraping và yêu cầu lấy MAL content qua API được phép. [API Agreement](https://myanimelist.net/static/apiagreement.html).

**Suy luận cho MVP:** tài khoản nội bộ/favorites, metadata cache, việc chuẩn hóa hay dịch synopsis, cách ghi nguồn/ảnh và mô hình doanh thu cần MAL xác nhận phạm vi được phép. Giao diện tiếng Việt không tự đồng nghĩa được dịch MAL content. Điều khoản nhãn hiệu không cho phép tự tuyên bố “được MAL chứng thực”. Chưa xác minh được quota RPM/day công khai cố định, TTL cache catalog, SLA freshness hoặc API permission của dự án; không điền số từ blog. Chưa có authenticated success test. [Agreement](https://myanimelist.net/static/apiagreement.html), [reference](https://myanimelist.net/apiconfig/references/api/v2).

## 5. Jikan v4

Jikan tự mô tả là API không chính thức, scraper MAL, chỉ GET/read-only và không cập nhật user list. Spec công khai còn mô tả base `https://api.jikan.moe/v4`, GET `/anime` (q/page/limit/type/status/genres/sfw/order_by/sort...), `/anime/{id}`, `/anime/{id}/full`, `/top/anime`, `/seasons/{year}/{season}`. Danh sách `{data:[...],pagination:{last_visible_page,has_next_page,current_page,items:{count,total,per_page}}}`; chi tiết `{data:{mal_id,title,titles,images,synopsis,...}}`. Đây là **hợp đồng tài liệu lịch sử**, không chứng nhận public service hiện chạy. [OpenAPI chính thức](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json).

Spec nêu 3 requests/giây, 60/phút, không daily cap, cache upstream 24 giờ, ETag/304; thiếu scalar có thể null, collection trống, score thiếu được quy ước 0. Những mức này không phải quota đang được cung cấp sau shutdown. `page`/`limit` trong spec tải về không ghi maximum, nên không khẳng định max 25 từ trí nhớ. [OpenAPI](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json).

Maintainer thông báo ngày 10/10/2026 rằng public service đã ngừng ngày 01/10/2026. README/spec vẫn nói có public API: **ưu tiên thông báo cụ thể mới hơn**. Repo có license MIT cho mã nguồn; đây không phải quyền tái sử dụng tất cả dữ liệu/ảnh MAL hay quyền phát video. Link terms được spec trỏ tới `https://jikan.moe/terms` hiện trả trang “Page not found” trong lần tải. Không coi thiếu trang terms là cho phép mọi sử dụng. [Thông báo](https://github.com/jikan-me/jikan-rest/issues/613), [repo và disclaimer](https://github.com/jikan-me/jikan-rest), [terms được dẫn](https://jikan.moe/terms).

**Suy luận:** không nên chọn public Jikan; self-host thêm trách nhiệm scraper, vận hành và quyền dữ liệu, không giải quyết quyền bằng MIT. Không có hành động triển khai instance, tìm mirror hay bypass nào trong nghiên cứu.

## 6. Đề xuất chuẩn hóa để xem xét sau khi chọn nguồn

Đây là đề xuất nghiên cứu, **không phải schema/API contract đã duyệt**. Mapping dựa trên [AniList Media](https://raw.githubusercontent.com/AniList/docs/master/docs/reference/object/media.md), [MAL reference](https://myanimelist.net/apiconfig/references/api/v2), [Jikan schema](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json).

| Khái niệm dự kiến | AniList | MAL v2 | Jikan | Quy tắc đề xuất |
| --- | --- | --- | --- | --- |
| Nguồn và ID | id, idMal | id | mal_id | Khóa `(provider,providerId)`; crosswalk explicit; không merge vì trùng tên. |
| Tên | title.romaji/english/native | title, alternative_titles | titles/title/title_english/title_japanese | Giữ ngôn ngữ và tên gốc; tên hiển thị fallback; không bịa tên Việt. |
| Ảnh | coverImage | main_picture | images | URL + nguồn; chưa tải lại/redistribute trước khi rõ quyền. |
| Mô tả | description | synopsis | synopsis | Nullable; làm sạch HTML khi hiển thị; việc sửa nội dung phải hợp terms. |
| Episode/status/format | episodes/status/format | num_episodes/status/media_type | episodes/status/type | Giữ raw value + mapping được review; unknown không đổi thành 0 hoặc FINISHED. |
| Điểm | averageScore (0–100) | mean (0–10) | score (0–10) | Giữ thang gốc, nguồn, sample count nếu có; không so bằng số raw. |
| Ngày | startDate/endDate từng phần | start_date/end_date độ chính xác biến đổi | aired | Giữ độ chính xác năm/tháng/ngày và unknown; không mặc định 01/01. |
| Provenance | siteUrl/updatedAt | MAL URL/updated_at | url/cache headers | fetchedAt khác sourceUpdatedAt; ngày cache không chứng minh ngày nội dung thay đổi. |

Phải tách metadata nguồn và favorites do người dùng tạo, nhưng tách kỹ thuật không tự hóa giải terms. Khi favorite tham chiếu record bị xóa, giữ trạng thái “nguồn không còn khả dụng” thay vì dựng record giả; chính sách retention phải được duyệt sau. Movie, season, recap, remake là thực thể khác nhau cho đến khi có bằng chứng quan hệ. Không có đo tỷ lệ duplicate/missing/freshness toàn bộ từ mẫu hai anime; cần sample đại diện sau khi được phép.

## 7. Metadata và quyền video

FR-06 đã chốt **không host/không embed video**. API có external links, streaming links hoặc trailer URL chỉ chứng minh có một URL, không chứng minh quyền phát, nhúng, tái phân phối hay khả dụng tại Việt Nam. Không nguồn video nào được xác minh/chấp thuận trong đợt này. [AniList Media](https://raw.githubusercontent.com/AniList/docs/master/docs/reference/object/media.md), [MAL Agreement](https://myanimelist.net/static/apiagreement.html), [Jikan spec](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json).

Đề xuất trước khi bật external watch link: xác minh domain của nhà phân phối chính thức, title/region, điều khoản liên kết, thời điểm kiểm tra và hạn chế lãnh thổ. Bỏ link nếu không đủ bằng chứng. Khu vực ra mắt đang mở; không suy từ timezone máy thành launch region. Không liên hệ bên thứ ba hay cấp quyền video trong nghiên cứu này.

## 8. Test matrix đề xuất và phần chưa làm

| Nhóm | Kỳ vọng | Trạng thái |
| --- | --- | --- |
| Request/JSON public AniList | 200, IDs/title/pageInfo đúng hình dạng | Đã chạy mẫu 2 bản ghi; không đại diện toàn catalog. |
| MAL no-auth | Ghi status/body, không bypass | Đã chạy: 403. |
| Jikan transport | Phân biệt timeout và HTTP error | Đã chạy: timeout; đối chiếu thông báo shutdown. |
| MAL authenticated search/detail/season | Credential hợp lệ, fields/paging đúng | Chưa chạy; cần quyền và client ID. |
| Pagination | Trang tiếp theo/cuối, không lặp ID; AniList dùng hasNextPage | Đã thử hai trang không lặp ID (mục 10); chưa đến trang cuối, chưa test tải. |
| Dữ liệu đại diện | TV/movie/OVA/upcoming/ongoing; thiếu ảnh/episodes/date; trùng tựa | Chưa chạy; cần sample có tiêu chí và quyền dùng. |
| Lọc/tiếng Việt | Lọc đúng phạm vi; không bịa bản dịch; case/diacritics/empty search | Chưa chạy; cần UX được duyệt. |
| 400/404/429/timeout/5xx | Error state, retry bounded, respect headers | Không cố gây 429; dự kiến fixture test ở phase được phép. |
| Terms/cache/delete/attribution | Có bằng chứng quyền, retention và xử lý yêu cầu xóa | Chưa đóng; blocker quyết định nguồn. |
| Watch link/region | Chính thức, phù hợp vùng, không embed | Chưa có nguồn đủ bằng chứng; tiếp tục bỏ link. |

## 9. Bàn giao theo mẫu dự án

- **Giai đoạn:** 2 — API và dữ liệu; chưa xin/chưa đạt phase exit.
- **Agent:** GPT-6 Astra (researcher thay Terra); GPT-6 Luna review/điều phối.
- **Nhiệm vụ:** kiểm chứng ba ứng viên, JSON/auth/quota/terms/chất lượng, video rights và đưa khuyến nghị.
- **Đã hoàn thành:** báo cáo, nguồn chính thức, 3 probe nhỏ, phân biệt docs với live, normalization đề xuất, test matrix và gaps.
- **File thay đổi:** báo cáo này và thư mục evidence; không sửa code ứng dụng hay ba tài liệu dirty; không commit/push.
- **Test/kết quả:** AniList 200; MAL no-auth 403; Jikan timeout. Không test có credential hoặc tải.
- **Nguồn:** link tại từng luận điểm; snapshot/raw evidence và request log kèm theo.
- **Vấn đề:** Jikan public đã ngừng; AniList terms có rủi ro với favorites; MAL terms cần làm rõ cho tài khoản, nội dung và cache; thiếu authenticated MAL test và số liệu chất lượng đại diện.
- **Còn lại:** Rà soát độc lập bởi GPT-6 Luna đã hoàn thành, góp ý đã bổ sung ở mục 10. Chủ dự án quyết định hướng xử lý điều kiện sử dụng, chọn/từ chối nguồn và phê duyệt phase exit/transition riêng.
- **Khuyến nghị:** giữ Giai đoạn 2, không tích hợp ngay; soạn mô tả MVP/đề nghị xác nhận quyền cho provider được user chọn để hỏi. Chưa gửi email/tin nhắn nào.
- **Trạng thái:** **Hoàn thành báo cáo nghiên cứu và rà soát độc lập; chờ quyết định nguồn và nghiệm thu của chủ dự án. Giai đoạn 2 chưa được phê duyệt kết thúc.**

## 10. Bổ sung kiểm chứng trước nghiệm thu

Đợt bổ sung bắt đầu lúc **2026-11-14T06:22:20Z**, theo timestamp của request thực. Đã gửi đúng 5 POST read-only nhỏ tới AniList, cách nhau ít nhất 2 giây, không thử vượt quota. Cả 5 trả HTTP 200; payload và response đầy đủ ở [supplement-probes.json](../research_notes/Đánh%20giá%20API%20anime/supplement-probes.json). Script `supplement_probe.py` được chỉnh để mỗi lần chạy sau tạo thư mục run riêng, không ghi đè evidence.

| Kiểm tra bổ sung | Quan sát thực tế | Giới hạn |
| --- | --- | --- |
| Detail ID 1 | Cowboy Bebop, TV, 26 tập, FINISHED; ID/MAL ID khớp search | Không đối chiếu studio/publisher độc lập, không kết luận mọi thuộc tính chính xác |
| Search 2 trang, perPage 1, sort ID | Trang 1 ID 1, trang 2 ID 5; không lặp ID giữa 2 trang; cả hai hasNextPage=true | Chưa đến trang cuối; không chứng minh không trùng toàn catalog |
| NOT_YET_RELEASED, 2 bản ghi | IDs 219866, 219798; english và episodes null; ngày phát hành chỉ có năm hoặc năm/tháng | Null phải giữ nguyên, không bịa tập/ngày/tên Việt |
| RELEASING, 2 bản ghi | IDs 21 và 235; episodes null và endDate chưa có thành phần | Số tập chưa biết không được hiểu thành 0 hoặc đã kết thúc |

Mẫu bổ sung có **6 ID riêng biệt** (TV đã kết thúc, movie, upcoming, ongoing). Đây là mẫu theo trường hợp, chưa phải mẫu thống kê đại diện. Dòng Pagination/Dữ liệu đại diện ở mục 8 được cập nhật bởi kết quả mục này: đã kiểm tra hai trang và các trường hợp null, nhưng OVA, trang cuối, thiếu ảnh, chất lượng tìm kiếm tiếng Việt và độ mới toàn bộ chưa đo. Không cố gây 429 hoặc nhập dữ liệu vào sản phẩm.

### Sàng lọc thêm Kitsu

Kitsu có tài liệu first-party về JSON:API với base `https://kitsu.io/api/edge`, search `/anime?filter[text]=...`, phân trang `page[limit]`/`page[offset]` (mặc định 10, tối đa 20 ở hướng dẫn chung), response `data`/`attributes`/`relationships` và `links`. Public GET phần lớn không cần OAuth. Đây chỉ là đối chiếu tài liệu, chưa có live test Kitsu. [Tài liệu chính thức](https://hummingbird-me.github.io/api-docs/).

Repo chính thức xác nhận Apiary là tài liệu legacy và đang chuyển sang OpenAPI. Link Terms of Service từ docs tới `https://kitsu.io/terms` chỉ trả trang yêu cầu JavaScript trong trình đọc; `https://kitsu.app/terms` trả 403 khi thử đọc. Do chưa thu thập được terms áp dụng, quota hoạt động, quyền cache/thương mại/ảnh, Kitsu chỉ là ứng viên dự phòng chưa đủ điều kiện nâng thành nguồn được khuyến nghị chọn. Apache 2.0 hiển thị trên docs không được suy thành license toàn bộ catalog. Không dùng tài liệu Kitsu sản phẩm studio/VFX ở `kitsu.cloud` vì không xác minh là cùng dịch vụ. [Repo docs](https://github.com/hummingbird-me/api-docs), [terms được docs dẫn](https://kitsu.io/terms).

### Diễn giải điều khoản và quyết định cần thiết

Đối chiếu lại MAL Agreement xác nhận các điều khoản được dẫn ở mục 4 thực sự có trong văn bản. Tuy nhiên, **chưa kết luận favorites nội bộ bị MAL cấm tuyệt đối**: phạm vi áp dụng cho ứng dụng cụ thể cần làm rõ. Tương tự, yêu cầu xác nhận AniList đối với favorites là đề xuất quản lý rủi ro do tính gần list/tracker; không phải tài liệu ghi rằng mọi nút favorite đều phải xin giấy phép riêng. Hai nội dung này là đánh giá của nghiên cứu, không phải phán quyết pháp lý. [MAL Agreement](https://myanimelist.net/static/apiagreement.html), [AniList terms](https://docs.anilist.co/guide/terms-of-use).

Quyền video được xử lý theo FR-06: đề xuất **MVP bỏ external watch links cho tới khi có nguồn cụ thể và vùng được xác minh**. Việc bỏ link đã nằm trong chính sách sản phẩm khi thiếu bằng chứng; không cần tự tìm nguồn không rõ quyền để lấp tính năng. Chưa có quyền phát/nhúng và không đề xuất thêm player.

**Khuyến nghị trình chủ dự án:** từ chối Jikan public cho production; giữ AniList/MAL ở trạng thái ứng viên có điều kiện; ưu tiên làm rõ MAL cho MVP hiện tại, với AniList là phương án thay thế nếu nhà cung cấp xác nhận phù hợp. Kitsu chưa qua sàng lọc terms. [Bản nháp câu hỏi nhà cung cấp](./Câu hỏi xác nhận quyền API.md) đã sẵn sàng nhưng chưa gửi. Nếu chủ dự án muốn tiếp tục với MAL, positive authenticated test cần client ID hợp lệ được cấu hình an toàn; chưa được phép coi 403 là kiểm thử thành công.

Phần nghiên cứu có thể thực hiện không credentials đã hoàn thiện thành hồ sơ review. **Gate cuối vẫn cần chủ dự án chọn/từ chối nguồn và duyệt Phase 2**, với các điều kiện còn tồn đọng được ghi rõ; không biến việc hoàn thành báo cáo thành phê duyệt tích hợp hoặc chuyển Phase 3. Không có email, tài khoản API, mã tích hợp hay quyết định kiến trúc nào được tạo tự động.
