'use client';

interface ServiceErrorProps {
  code?: string;
  error?: string;
  isRateLimited?: boolean;
  onDismiss?: () => void;
}

export function ServiceErrorScreen({ code, error, isRateLimited = false, onDismiss }: ServiceErrorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          サービス一時停止中
        </h1>

        {isRateLimited ? (
          <>
            <p className="text-gray-600 mb-4">
              申し訳ございません。使用量が月間の上限に達しました。
            </p>
            <p className="text-sm text-gray-500 mb-6">
              毎月1日 00:00 UTC にリセットされます。
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              現在サーバーがメンテナンス中です。
            </p>
            <p className="text-sm text-gray-500 mb-6">
              お手数ですが、しばらく経ってからアクセスしてください。
            </p>
          </>
        )}

        {code && (
          <div className="bg-gray-100 rounded p-3 mb-6">
            <p className="text-xs text-gray-600 font-mono">
              エラーコード: {code}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              戻る
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
          >
            再読み込み
          </button>
        </div>
      </div>
    </div>
  );
}
