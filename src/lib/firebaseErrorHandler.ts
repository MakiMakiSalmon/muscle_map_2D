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

export function handleFirebaseError(error: any): FirebaseErrorResponse {
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  const errorMessage = error?.message || 'Unknown Firebase error';

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

export function isRateLimitError(error: any): boolean {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';
  
  return (
    errorCode === 'RESOURCE_EXHAUSTED' ||
    errorMessage.includes('Quota exceeded') ||
    errorMessage.includes('quota')
  );
}
