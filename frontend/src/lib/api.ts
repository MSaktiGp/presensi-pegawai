const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Debug: hapus setelah koneksi berhasil
if (typeof window !== 'undefined') {
  console.log('[DEBUG] NEXT_PUBLIC_API_URL =', process.env.NEXT_PUBLIC_API_URL);
  console.log('[DEBUG] API_URL yang dipakai =', API_URL);
}

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

/**
 * Get stored JWT token from localStorage.
 */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

/**
 * Minimalist global toast for unhandled network/5xx errors (Ponytail mode)
 */
let toastContainer: HTMLDivElement | null = null;
const showGlobalError = (msg: string) => {
  if (typeof window === 'undefined') return;
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = 'bg-[var(--accent-red,#ef4444)] text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 pointer-events-auto';
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

/**
 * Fetch wrapper with JWT auto-attach and error handling.
 */
export const api = async <T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> => {
  const { method = 'GET', body, headers = {} } = options;

  const token = getToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch (e) {
      const msg = `HTTP ${response.status}: Terjadi kesalahan server.`;
      showGlobalError(msg);
      return { success: false, message: msg };
    }

    if (response.status >= 500) {
      showGlobalError(data.message || 'Terjadi kesalahan server internal.');
    }

    // Handle 401 - redirect to login
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/';
      }
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    const msg = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
    showGlobalError(msg);
    return {
      success: false,
      message: msg,
    };
  }
};
