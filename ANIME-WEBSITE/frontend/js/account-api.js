let csrfToken = null;

export async function accountRequest(path, method = "GET", body) {
  if (method !== "GET" && !csrfToken) {
    const result = await accountRequest("/csrf");
    csrfToken = result.token;
  }
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 || response.status === 202 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.code || "SERVICE_UNAVAILABLE");
    error.code = data?.error?.code;
    if (error.code === "CSRF_INVALID") csrfToken = null;
    throw error;
  }
  if (["/auth/login", "/auth/logout", "/auth/password", "/me"].includes(path) && method !== "GET") csrfToken = null;
  return data;
}

export function accountError(error) {
  return {
    AUTH_REQUIRED: "Hãy đăng nhập để tiếp tục.",
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
    INVALID_REQUEST: "Kiểm tra thông tin đã nhập. Mật khẩu cần ít nhất 12 ký tự.",
    CSRF_INVALID: "Phiên bảo vệ đã thay đổi. Vui lòng thực hiện lại thao tác.",
    REAUTH_REQUIRED: "Nhập lại mật khẩu ở bước xác thực, rồi xác nhận xóa một lần nữa.",
    RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    PROVIDER_TIMEOUT: "Nguồn anime phản hồi quá lâu. Hãy thử tải lại.",
    PROVIDER_UNAVAILABLE: "Nguồn anime tạm thời không hoạt động.",
  }[error.code] || "Chưa thể hoàn tất. Kiểm tra kết nối hoặc cấu hình máy chủ rồi thử lại.";
}
