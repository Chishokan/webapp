// 未参加（参加登録なし）のユーザーに表示する案内。
export function EnrollNotice() {
  return (
    <div className="card border-yellow-200 bg-yellow-50">
      <h2 className="font-semibold text-yellow-800">参加申込が必要です</h2>
      <p className="mt-1 text-sm text-yellow-700">
        おはよう勉強会の出席・リフレクションは、参加申込をした方のみ利用できます。
        参加を希望する場合は、申込フォームから申し込むか、塾の担当者にお問い合わせください。
      </p>
    </div>
  );
}
