export type AsyncPageMeta = {
    loadError: string | null;
    isFallbackData: boolean;
    partialFailures: string[];
    lastUpdated: string | null;
};

export type AsyncBannerTone = "info" | "warning" | "error" | "success";

export type AiErrorCode =
    | "bad_request"
    | "misconfigured"
    | "provider_unavailable"
    | "rate_limited"
    | "unknown";

export type AiApiError = {
    code: AiErrorCode;
    message: string;
    retryable: boolean;
};

export const ASYNC_COPY = {
    loading: "กำลังโหลดข้อมูล...",
    refreshing: "กำลังอัปเดตข้อมูล...",
    empty: "ยังไม่มีข้อมูล",
    fallback: "กำลังแสดงข้อมูลสำรอง",
    retry: "ลองใหม่",
} as const;

export function createAsyncMeta(
    overrides: Partial<AsyncPageMeta> = {},
): AsyncPageMeta {
    return {
        loadError: null,
        isFallbackData: false,
        partialFailures: [],
        lastUpdated: new Date().toISOString(),
        ...overrides,
    };
}

export function formatSupabaseLoadError(
    subject: string,
    error?: unknown,
): string {
    const message =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
            ? error.message
            : "";

    if (message.toLowerCase().includes("failed to fetch")) {
        return `ไม่สามารถเชื่อมต่อเพื่อโหลด${subject}ได้ในขณะนี้`;
    }

    return `ไม่สามารถโหลด${subject}ได้ในขณะนี้`;
}

export function buildPartialFailureMessage(subject: string): string {
    return `บางส่วนของ${subject}โหลดไม่สำเร็จ`;
}

export function normalizeAiError(payload: unknown): AiApiError {
    if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        payload.error &&
        typeof payload.error === "object"
    ) {
        const error = payload.error as Partial<AiApiError>;
        return {
            code: error.code || "unknown",
            message: error.message || "เกิดข้อผิดพลาดจาก AI",
            retryable: Boolean(error.retryable),
        };
    }

    return {
        code: "unknown",
        message: "เกิดข้อผิดพลาดจาก AI",
        retryable: true,
    };
}
