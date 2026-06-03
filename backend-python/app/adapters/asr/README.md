# ASR 适配器开发注意事项

## 阿里云录音文件识别

**重要**：不要使用 `AcsClient` 调用 filetrans API！

原因：
- `AcsClient.set_version()` 设置的是 POP API 版本号（如 `2018-08-17`）
- filetrans SubmitTask 接口还需要业务版本参数 `version: "4.0"`
- 两个 `version` 参数名冲突，导致服务端报 `InvalidVersion`

正确做法：
- 直接发 HTTP 请求
- 手动处理 POP API 签名（HMAC-SHA1）
- POP API 版本用 `Version: 2018-08-17`
- 业务版本用 `ServiceVersion: 4.0`
