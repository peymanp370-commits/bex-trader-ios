import { ArrowLeft, Loader2, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { deleteCurrentAccount } from "../utils/api";
import { getLanguage, isRTL, tr } from "../utils/i18n";

export function DeleteAccount() {
  const navigate = useNavigate();
  const lang = getLanguage();
  const rtl = isRTL(lang);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const t = (dict: Record<string, string>) => tr(lang, dict);

  async function handleDelete() {
    if (!canDelete || busy) return;
    const ok = window.confirm(
      t({
        en: "This will permanently delete your BEX Trader account. Continue?",
        fa: "این کار حساب BEX Trader شما را برای همیشه حذف می‌کند. ادامه می‌دهید؟",
        ar: "سيؤدي هذا إلى حذف حساب BEX Trader الخاص بك نهائيًا. هل تريد المتابعة؟",
        es: "Esto eliminará permanentemente tu cuenta de BEX Trader. ¿Continuar?",
        "pt-BR": "Isso excluirá permanentemente sua conta BEX Trader. Continuar?",
        hi: "यह आपके BEX Trader खाते को स्थायी रूप से हटा देगा। जारी रखें?",
        tr: "Bu işlem BEX Trader hesabınızı kalıcı olarak siler. Devam edilsin mi?",
        de: "Dadurch wird Ihr BEX Trader Konto dauerhaft gelöscht. Fortfahren?",
        fr: "Cela supprimera définitivement votre compte BEX Trader. Continuer ?",
        zh: "这将永久删除您的 BEX Trader 账户。继续？",
        ko: "BEX Trader 계정이 영구적으로 삭제됩니다. 계속하시겠습니까?",
      })
    );
    if (!ok) return;

    setBusy(true);
    setError("");
    const res = await deleteCurrentAccount();
    setBusy(false);

    if (!res?.ok) {
      setError(res?.message || "Account deletion failed");
      return;
    }

    navigate("/welcome?account_deleted=1", { replace: true });
  }

  return (
    <main className="min-h-screen bg-[#070b14] px-5 py-8 text-white" dir={rtl ? "rtl" : "ltr"} lang={lang}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to="/app/settings" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-yellow-400">
          <ArrowLeft className="h-4 w-4" />
          {t({ en: "Back to Settings", fa: "بازگشت به تنظیمات", ar: "العودة إلى الإعدادات", es: "Volver a Configuración", "pt-BR": "Voltar às configurações", hi: "सेटिंग्स पर वापस", tr: "Ayarlara geri dön", de: "Zurück zu Einstellungen", fr: "Retour aux réglages", zh: "返回设置", ko: "설정으로 돌아가기" })}
        </Link>

        <section className="rounded-3xl border border-red-500/25 bg-gradient-to-br from-[#101827] to-[#080c16] p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-red-500/15 p-3 text-red-400">
              <Trash2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                {t({ en: "Delete Account", fa: "حذف حساب کاربری", ar: "حذف الحساب", es: "Eliminar cuenta", "pt-BR": "Excluir conta", hi: "खाता हटाएँ", tr: "Hesabı Sil", de: "Konto löschen", fr: "Supprimer le compte", zh: "删除账户", ko: "계정 삭제" })}
              </h1>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                {t({ en: "You can permanently delete your BEX Trader account directly inside the app. This removes your profile, sign-in identities, sessions, VIP tokens, and saved account data where available.", fa: "می‌توانید حساب BEX Trader خود را مستقیماً داخل اپ برای همیشه حذف کنید. این کار پروفایل، روش‌های ورود، نشست‌ها، توکن‌های VIP و داده‌های ذخیره‌شده حساب را تا حد امکان حذف می‌کند.", ar: "يمكنك حذف حساب BEX Trader نهائيًا مباشرة داخل التطبيق. يؤدي ذلك إلى إزالة ملفك الشخصي وهويات تسجيل الدخول والجلسات ورموز VIP وبيانات الحساب المحفوظة عند توفرها.", es: "Puedes eliminar permanentemente tu cuenta de BEX Trader directamente en la app. Esto elimina tu perfil, identidades de inicio de sesión, sesiones, tokens VIP y datos guardados cuando sea posible.", "pt-BR": "Você pode excluir permanentemente sua conta BEX Trader diretamente no app. Isso remove seu perfil, identidades de login, sessões, tokens VIP e dados salvos quando disponíveis.", hi: "आप ऐप के अंदर ही अपना BEX Trader खाता स्थायी रूप से हटा सकते हैं। इससे आपकी प्रोफ़ाइल, साइन-इन पहचान, सत्र, VIP टोकन और सेव किया गया खाता डेटा जहाँ उपलब्ध हो हट जाएगा।", tr: "BEX Trader hesabınızı doğrudan uygulama içinde kalıcı olarak silebilirsiniz. Bu işlem profilinizi, giriş kimliklerinizi, oturumlarınızı, VIP tokenlarınızı ve kayıtlı hesap verilerinizi mümkün olduğunda kaldırır.", de: "Sie können Ihr BEX Trader Konto direkt in der App dauerhaft löschen. Dabei werden Profil, Anmeldeidentitäten, Sitzungen, VIP-Tokens und gespeicherte Kontodaten soweit verfügbar entfernt.", fr: "Vous pouvez supprimer définitivement votre compte BEX Trader directement dans l’app. Cela supprime votre profil, vos identités de connexion, vos sessions, vos jetons VIP et les données de compte enregistrées lorsque disponible.", zh: "您可以直接在应用内永久删除您的 BEX Trader 账户。这会尽可能删除您的个人资料、登录身份、会话、VIP 令牌和已保存的账户数据。", ko: "앱 안에서 BEX Trader 계정을 영구적으로 삭제할 수 있습니다. 가능한 경우 프로필, 로그인 ID, 세션, VIP 토큰 및 저장된 계정 데이터가 제거됩니다." })}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-yellow-300" />
              <p>
                {t({ en: "Subscriptions purchased through Apple must still be managed or cancelled in your Apple ID subscription settings.", fa: "اشتراک‌هایی که از طریق Apple خریداری شده‌اند همچنان باید از تنظیمات اشتراک Apple ID مدیریت یا لغو شوند.", ar: "يجب إدارة أو إلغاء الاشتراكات التي تم شراؤها عبر Apple من إعدادات اشتراكات Apple ID.", es: "Las suscripciones compradas mediante Apple deben gestionarse o cancelarse desde los ajustes de suscripciones de tu Apple ID.", "pt-BR": "Assinaturas compradas pela Apple ainda devem ser gerenciadas ou canceladas nas configurações de assinaturas do Apple ID.", hi: "Apple के माध्यम से खरीदी गई सदस्यताओं को Apple ID subscription settings में ही प्रबंधित या रद्द करना होगा।", tr: "Apple üzerinden satın alınan abonelikler Apple ID abonelik ayarlarından yönetilmeli veya iptal edilmelidir.", de: "Über Apple gekaufte Abonnements müssen weiterhin in den Apple-ID-Abonnement-Einstellungen verwaltet oder gekündigt werden.", fr: "Les abonnements achetés via Apple doivent toujours être gérés ou annulés dans les réglages d’abonnement de votre identifiant Apple.", zh: "通过 Apple 购买的订阅仍需在 Apple ID 订阅设置中管理或取消。", ko: "Apple을 통해 구매한 구독은 Apple ID 구독 설정에서 관리하거나 취소해야 합니다." })}
              </p>
            </div>
          </div>

          <label className="mt-6 block text-sm font-bold text-gray-200">
            {t({ en: "Type DELETE to confirm", fa: "برای تأیید DELETE را تایپ کنید", ar: "اكتب DELETE للتأكيد", es: "Escribe DELETE para confirmar", "pt-BR": "Digite DELETE para confirmar", hi: "पुष्टि के लिए DELETE टाइप करें", tr: "Onaylamak için DELETE yazın", de: "Geben Sie DELETE zur Bestätigung ein", fr: "Tapez DELETE pour confirmer", zh: "输入 DELETE 以确认", ko: "확인하려면 DELETE를 입력하세요" })}
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoCapitalize="characters"
            className="mt-2 w-full rounded-2xl border border-yellow-500/20 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-400"
            placeholder="DELETE"
          />

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <XCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={!canDelete || busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {busy ? t({ en: "Deleting account...", fa: "در حال حذف حساب...", ar: "جارٍ حذف الحساب...", es: "Eliminando cuenta...", "pt-BR": "Excluindo conta...", hi: "खाता हटाया जा रहा है...", tr: "Hesap siliniyor...", de: "Konto wird gelöscht...", fr: "Suppression du compte...", zh: "正在删除账户...", ko: "계정 삭제 중..." }) : t({ en: "Permanently Delete Account", fa: "حذف دائمی حساب", ar: "حذف الحساب نهائيًا", es: "Eliminar cuenta permanentemente", "pt-BR": "Excluir conta permanentemente", hi: "खाता स्थायी रूप से हटाएँ", tr: "Hesabı kalıcı olarak sil", de: "Konto dauerhaft löschen", fr: "Supprimer définitivement le compte", zh: "永久删除账户", ko: "계정 영구 삭제" })}
          </button>
        </section>
      </div>
    </main>
  );
}

