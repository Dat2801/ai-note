# AI Note — MVP 0.3

Ghi âm cuộc họp / bài giảng → AI chuyển thành văn bản tiếng Việt → tóm tắt, ý chính, danh sách công việc.

```
ai-note/
├── backend/   Node.js + Express + TypeScript — giữ API key, gọi OpenAI
└── mobile/    Expo SDK 58 + React Native + TypeScript + Expo Router (iOS, chạy được cả Android)
```

## 1. Cơ chế hoạt động

```
iPhone (ghi âm .m4a) ──upload──▶ Backend ──▶ OpenAI gpt-transcribe  (giọng nói → chữ)
                                       └──▶ OpenAI gpt-6-luna       (chữ → JSON: tiêu đề, tóm tắt, ý chính, tasks, nhãn)
iPhone ◀── JSON ── Backend
iPhone lưu ghi chú vào AsyncStorage, file audio vào thư mục Documents
```

- **API key chỉ nằm ở backend** — app không bao giờ chứa key.
- **Structured Outputs**: AI bắt buộc trả JSON đúng schema (`backend/src/schema.ts`), nên app không phải đoán/parse văn bản tự do.
- **Chế độ MOCK**: backend không có `OPENAI_API_KEY` thì trả dữ liệu giả → chạy thử UI miễn phí.
- **Chỉ tốn tiền khi phân tích**: ghi âm, nghe lại, tìm kiếm, sửa… đều chạy trên máy.

### Vòng đời một ghi chú

`recorded` (vừa ghi) → `processing` (đang gửi AI) → `done` (có kết quả) hoặc `error` (bấm "Thử lại").
Nếu app bị tắt giữa chừng, lần mở sau ghi chú `processing` tự chuyển thành `error` để thử lại.

## 2. Chức năng

| Màn hình | Chức năng |
|---|---|
| **Trang chủ** | Danh sách ghi chú, tìm kiếm không dấu (“hop” khớp “họp”), lọc “Việc cần làm”, nút ghi âm |
| **Ghi âm** | Đồng hồ, sóng âm, tạm dừng/tiếp tục, huỷ, kết thúc → tự gửi AI |
| **Chi tiết** | Nghe lại (±10s), sửa tiêu đề, tab Tóm tắt / Công việc (tick hoàn thành) / Nội dung; sửa transcript rồi “tóm tắt lại”; menu: chia sẻ văn bản, xuất **biên bản PDF**, xử lý lại, xoá (xoá cả file audio) |
| **Hỏi AI** | Hỏi bằng câu tự nhiên trên toàn bộ ghi chú, AI trả lời + chỉ ra ghi chú liên quan |
| **Cài đặt** | Địa chỉ backend, token, nút kiểm tra kết nối, bật/tắt tự phân tích, thống kê phút & chi phí ước tính, xoá toàn bộ dữ liệu |

### Backend API

| Endpoint | Việc |
|---|---|
| `GET /health` | Trạng thái, có API key chưa, model đang dùng |
| `POST /api/process` | multipart `audio` → transcript + phân tích |
| `POST /api/analyze` | `{ transcript }` → phân tích lại (sau khi sửa transcript) |
| `POST /api/ask` | `{ question, notes[] }` → `{ answer, noteIds }` |

Nếu đặt `APP_TOKEN`, mọi `/api/*` yêu cầu header `x-app-token`. Giới hạn upload 25 MB (ghi âm mono 64 kbps ≈ 50 phút/25 MB).

## 3. Code nằm ở đâu

| File | Vai trò |
|---|---|
| `backend/src/index.ts` | Server Express, các route |
| `backend/src/ai.ts` | Gọi OpenAI (transcribe, analyze, ask) |
| `backend/src/schema.ts` | Kiểu dữ liệu + JSON Schema cho AI |
| `backend/src/mock.ts` | Dữ liệu giả lập |
| `mobile/src/app/*` | Các màn hình (mỗi file = 1 route của Expo Router) |
| `mobile/src/lib/notes-context.tsx` | **Bộ não của app**: state ghi chú, gọi API, lưu trữ |
| `mobile/src/lib/api.ts` | Gọi backend (timeout, token, thông báo lỗi tiếng Việt) |
| `mobile/src/lib/storage.ts` | Lưu/đọc AsyncStorage |
| `mobile/src/lib/export.ts` | Chia sẻ văn bản, xuất PDF |

## 4. Chạy trên Mac

**Backend** (Terminal 1):

```bash
cd backend
npm install
cp .env.example .env      # điền OPENAI_API_KEY, hoặc để trống để chạy MOCK
npm run dev
curl http://localhost:4000/health
```

**Mobile** (Terminal 2):

```bash
cd mobile
npm install
cp env.example .env       # sửa EXPO_PUBLIC_API_URL = IP Mac (ipconfig getifaddr en0)
npx expo start -c
```

Mở **Expo Go** trên iPhone, quét QR (iPhone và Mac cùng Wi-Fi). Cho phép Micro và Local Network.
Có thể đổi địa chỉ backend ngay trong màn hình **Cài đặt** của app mà không cần sửa `.env`.

## 5. Deploy & phát hành

### Backend lên Render (miễn phí)
1. render.com → **New → Blueprint** → chọn repo này (đọc `render.yaml`).
2. Nhập `OPENAI_API_KEY` và `APP_TOKEN` (chuỗi ngẫu nhiên tự đặt) → Deploy.
3. Mở `https://<tên-service>.onrender.com/health` để kiểm tra. Nếu URL khác `ai-note-backend.onrender.com`, sửa `EXPO_PUBLIC_API_URL` trong `mobile/eas.json`.
4. Mỗi lần push lên `main`, Render tự deploy lại. (Gói free ngủ sau 15 phút không dùng, lần gọi đầu chậm ~30–60 giây.)

### App lên EAS (một lần, chạy trên Mac)
```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init                                   # ghi projectId vào app.json → commit lại
npx eas-cli@latest env:create --name EXPO_PUBLIC_APP_TOKEN --value <APP_TOKEN> --environment preview --environment production --visibility plaintext
npx eas-cli@latest build -p android --profile preview      # lần đầu: chọn tạo keystore Android
```

### Tự build APK khi tạo phiên bản (GitHub Actions)
1. expo.dev → Account settings → **Access tokens** → tạo token.
2. GitHub repo → Settings → Secrets → Actions → thêm `TOKEN_EXPO`.
3. Tạo phiên bản:
   ```bash
   git tag v0.3.0 && git push --tags
   ```
4. Action `Release Android APK` build xong sẽ đính `ai-note.apk` vào trang **Releases** → ai cũng tải được.

| Nền tảng | Cách phân phối |
|---|---|
| Android | APK trên GitHub Releases (miễn phí) hoặc Google Play |
| iPhone | Bắt buộc tài khoản Apple Developer (99 USD/năm): `eas build -p ios --profile production` → `eas submit -p ios` → TestFlight public link / App Store |

## 6. Chưa có / bước tiếp theo

- Tài khoản + đồng bộ cloud (Supabase), giới hạn phút miễn phí phía server.
- Thanh toán gói Pro (RevenueCat / StoreKit).
- Upload ghi âm dài theo từng đoạn (> 25 MB), ghi âm chạy nền.
- Deploy backend (Render/Fly/Cloud Run) + HTTPS, rồi EAS Build → TestFlight → App Store.
