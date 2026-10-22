import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEYS = {
  TOKEN: '@user_token',
  USER: '@user_data',
  API_URL: '@api_base_url',
};

// Lấy IP máy tính tự động từ Expo Metro Bundler nếu đang chạy trên điện thoại
export function getAutoDetectedHost(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3001`;
      }
    }
  } catch {
    // ignore
  }
  return 'http://192.168.2.165:3001';
}

export const FALLBACK_IPS = [
  'http://192.168.2.165:3001',
  'http://localhost:3001',
  'http://10.0.2.2:3001',
];

// Bộ nhớ đệm trong RAM để phòng trường hợp AsyncStorage native gặp sự cố
const memoryStore = new Map<string, string>();

async function safeGetItem(key: string): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val !== null && val !== undefined) {
      memoryStore.set(key, val);
      return val;
    }
  } catch {
    // Fallback sang memoryStore
  }
  return memoryStore.get(key) || null;
}

async function safeSetItem(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Memory store đã lưu
  }
}

async function safeRemoveItem(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getApiBaseUrl(): Promise<string> {
  try {
    const saved = await safeGetItem(STORAGE_KEYS.API_URL);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
    return getAutoDetectedHost();
  } catch {
    return getAutoDetectedHost();
  }
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  await safeSetItem(STORAGE_KEYS.API_URL, cleanUrl);
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await safeGetItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await safeSetItem(STORAGE_KEYS.TOKEN, token);
  } else {
    await safeRemoveItem(STORAGE_KEYS.TOKEN);
  }
}

export async function getStoredUser(): Promise<any | null> {
  try {
    const raw = await safeGetItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: any | null): Promise<void> {
  if (user) {
    await safeSetItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    await safeRemoveItem(STORAGE_KEYS.USER);
  }
}

interface RequestOptions extends RequestInit {
  data?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const token = await getStoredToken();
  const { data, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const url = `${baseUrl}${endpoint}`;

  let response: Response;
  try {
    // Add timeout to prevent hanging on unreachable IPs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err: any) {
    let msg = `Không thể kết nối đến máy chủ tại: ${baseUrl}`;
    if (err.name === 'AbortError') {
      msg = `Hết thời gian chờ (Timeout). Không thể kết nối tới máy chủ ${baseUrl}`;
    } else if (err.message) {
      msg = `Lỗi mạng (${err.message}). Vui lòng kiểm tra kết nối Wi-Fi và địa chỉ IP máy chủ trong phần Cấu hình.`;
    }
    throw new Error(msg);
  }

  if (!response.ok) {
    let errorMsg = `Lỗi máy chủ (${response.status})`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg.join(', ');
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}

// Kiểm tra kết nối nhanh tới máy chủ
export async function testConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = targetUrl || (await getApiBaseUrl());
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${url}/api/incidents`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      return { success: true, message: `Kết nối thành công tới ${url}` };
    }
    return { success: false, message: `Máy chủ phản hồi mã lỗi HTTP: ${res.status}` };
  } catch (err: any) {
    return {
      success: false,
      message: `Không kết nối được (${err.message || 'Network request failed'}). Kiểm tra IP và Wi-Fi.`,
    };
  }
}

// ================= API DOMAIN METHODS =================

export interface IncidentPayload {
  id?: number;
  userId?: number;
  loaiSuCo: string;
  mucDo: 'Cap bach' | 'Trung binh' | 'Thap' | string;
  tieuDe: string;
  latitude: number;
  longitude: number;
  diaChi: string;
  moTaChiTiet?: string;
  imageUrl?: string;
  trangThai?: string;
  ngayTao?: string;
}

export interface UserProfilePayload {
  id?: number;
  userId?: number;
  hovaten: string;
  soDienThoai?: string;
  diaChi?: string;
  avatar?: string;
}

// Chuẩn hóa đường dẫn ảnh từ backend (thay thế localhost thành IP máy tính thực tế)
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const autoHost = getAutoDetectedHost();
  return url
    .replace('http://localhost:3001', autoHost)
    .replace('http://127.0.0.1:3001', autoHost);
}

export const api = {
  auth: {
    login: async (email: string, matkhau: string) => {
      const cleanEmail = email.trim();
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        data: {
          email: cleanEmail,
          matkhau: matkhau,
          password: matkhau,
        },
      });
      if (res?.token) {
        await setStoredToken(res.token);
      }
      if (res?.user) {
        await setStoredUser(res.user);
      }
      return res;
    },

    register: async (hovaten: string, email: string, matkhau: string) => {
      return apiRequest('/auth/register', {
        method: 'POST',
        data: {
          hovaten: hovaten.trim(),
          email: email.trim(),
          matkhau: matkhau,
        },
      });
    },

    getMe: async () => {
      const res = await apiRequest('/auth/me', { method: 'GET' });
      if (res?.user) {
        await setStoredUser(res.user);
      }
      return res;
    },

    logout: async () => {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      } finally {
        await setStoredToken(null);
        await setStoredUser(null);
      }
    },
  },

  incidents: {
    getAll: (): Promise<IncidentPayload[]> =>
      apiRequest('/api/incidents', { method: 'GET' }),

    create: (data: IncidentPayload): Promise<IncidentPayload> =>
      apiRequest('/api/incidents', { method: 'POST', data }),
  },

  feedback: {
    create: (data: { hovaten: string; email: string; content: string }) =>
      apiRequest('/api/feedback', { method: 'POST', data }),
  },

  profile: {
    getMyProfile: (): Promise<UserProfilePayload> =>
      apiRequest('/api/users/profile/me', { method: 'GET' }),

    updateMyProfile: (data: Partial<UserProfilePayload>): Promise<UserProfilePayload> =>
      apiRequest('/api/users/profile/me', { method: 'PUT', data }),
  },

  upload: {
    uploadImage: async (
      imageUri: string,
      fileName?: string | null,
      mimeType?: string | null
    ): Promise<{ success: boolean; url: string; filename: string }> => {
      const baseUrl = await getApiBaseUrl();
      const token = await getStoredToken();

      let cleanName = fileName;
      if (!cleanName) {
        const lastPart = imageUri.split('/').pop() || 'photo.jpg';
        cleanName = lastPart.includes('.') ? lastPart : `${lastPart}.jpg`;
      }
      cleanName = cleanName.split('?')[0];

      let cleanType = mimeType;
      if (!cleanType) {
        const ext = cleanName.split('.').pop()?.toLowerCase() || 'jpg';
        cleanType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      }
      if (cleanType === 'image/jpg') {
        cleanType = 'image/jpeg';
      }

      // TRƯỜNG HỢP 1: TRÊN NATIVE (Android / iOS)
      // Sử dụng FileSystem.uploadAsync để upload trực tiếp tầng native,
      // KHÔNG sử dụng fetch/FormData của JS -> tránh hoàn toàn lỗi Unsupported FormDataPart implementation
      if (Platform.OS !== 'web') {
        try {
          const uploadResult = await FileSystem.uploadAsync(
            `${baseUrl}/api/upload`,
            imageUri,
            {
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: 'file',
              mimeType: cleanType,
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            }
          );

          if (uploadResult.status < 200 || uploadResult.status >= 300) {
            let errorMsg = `Tải ảnh thất bại (${uploadResult.status})`;
            try {
              const errJson = JSON.parse(uploadResult.body);
              errorMsg = errJson.message || errorMsg;
              if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
            } catch {
              // ignore
            }
            throw new Error(errorMsg);
          }

          const json = JSON.parse(uploadResult.body);
          const savedFilename = json.filename || json.url?.split('/uploads/').pop() || '';
          const finalUrl = `${baseUrl}/uploads/${savedFilename}`;

          return {
            ...json,
            url: finalUrl,
            filename: savedFilename,
          };
        } catch (nativeErr: any) {
          throw new Error(nativeErr.message || 'Không thể tải ảnh lên máy chủ qua Native.');
        }
      }

      // TRƯỜNG HỢP 2: TRÊN TRÌNH DUYỆT (Web)
      // Tạo Blob chuẩn HTML5 và FormData chuẩn web
      try {
        const res = await fetch(imageUri);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('file', blob, cleanName);

        const response = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!response.ok) {
          let errorMsg = `Tải ảnh thất bại (${response.status})`;
          try {
            const err = await response.json();
            errorMsg = err.message || errorMsg;
            if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
          } catch {
            // ignore
          }
          throw new Error(errorMsg);
        }

        const json = await response.json();
        const savedFilename = json.filename || json.url?.split('/uploads/').pop() || '';
        const finalUrl = `${baseUrl}/uploads/${savedFilename}`;

        return {
          ...json,
          url: finalUrl,
          filename: savedFilename,
        };
      } catch (webErr: any) {
        throw new Error(webErr.message || 'Lỗi tải ảnh lên trình duyệt.');
      }
    },
  },
};
