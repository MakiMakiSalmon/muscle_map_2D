/**
 * Firebase API エラーハンドリングユーティリティ
 * Firestore 無料枠超過時の自動停止に対応
 */

export interface FirebaseErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  isRateLimited: boolean;
}

interface ErrorLike {
  code?: string;
  message?: string;
}

function toErrorLike(error: unknown): ErrorLike {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as ErrorLike;
    return {
      code: typeof maybeError.code === 'string' ? maybeError.code : undefined,
      message: typeof maybeError.message === 'string' ? maybeError.message : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {};
}

export function handleFirebaseError(error: unknown): FirebaseErrorResponse {
  const normalized = toErrorLike(error);
  const errorCode = normalized.code || 'UNKNOWN_ERROR';
  const errorMessage = normalized.message || 'Unknown Firebase error';

  // Firestore 無料枠超過時のエラーパターン
  if (
    errorCode === 'PERMISSION_DENIED' ||
    errorCode === 'RESOURCE_EXHAUSTED' ||
    errorMessage.includes('Quota exceeded') ||
    errorMessage.includes('quota')
  ) {
    return {
      error: 'Service temporarily unavailable due to usage limit. Please try again next month.',
      code: 'SERVICE_LIMIT_EXCEEDED',
      statusCode: 503,
      isRateLimited: true,
    };
  }

  // 認証エラー
  if (errorCode === 'UNAUTHENTICATED' || errorCode === 'AUTHENTICATION_REQUIRED') {
    return {
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
      statusCode: 401,
      isRateLimited: false,
    };
  }

  // 権限エラー
  if (errorCode === 'PERMISSION_DENIED') {
    return {
      error: 'Access denied',
      code: 'FORBIDDEN',
      statusCode: 403,
      isRateLimited: false,
    };
  }

  // その他のエラー
  return {
    error: errorMessage || 'Internal server error',
    code: errorCode,
    statusCode: 500,
    isRateLimited: false,
  };
}

export function isRateLimitError(error: unknown): boolean {
  const normalized = toErrorLike(error);
  const errorCode = normalized.code || '';
  const errorMessage = normalized.message || '';
  
  return (
    errorCode === 'RESOURCE_EXHAUSTED' ||
    errorMessage.includes('Quota exceeded') ||
    errorMessage.includes('quota')
  );
}
