import { useTranslation, Trans } from "react-i18next";

export default function Legal() {
  const { t } = useTranslation();

  const mailLink = (
    <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors" />
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-4xl md:text-5xl font-bold mb-8 text-foreground">
        {t("common.legal.title")}
      </h1>

      <div className="space-y-12 font-sans text-foreground/90 leading-relaxed">
        {/* Privacyverklaring */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="privacy">
            {t("common.legal.privacyHeading")}
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              {t("common.legal.privacyIntro")}
            </p>
            <p><strong>{t("common.legal.privacyCollectTitle")}</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("common.legal.privacyCollect1")}</li>
              <li>{t("common.legal.privacyCollect2")}</li>
              <li>
                <Trans i18nKey="common.legal.privacyCollect3" />
              </li>
              <li>{t("common.legal.privacyCollect4")}</li>
            </ul>
            <p><strong>{t("common.legal.privacyUseTitle")}</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("common.legal.privacyUse1")}</li>
              <li>{t("common.legal.privacyUse2")}</li>
              <li>{t("common.legal.privacyUse3")}</li>
            </ul>
            <p>
              <Trans
                i18nKey="common.legal.privacyShare"
                components={{
                  anchor: <a href="#verwerkers" className="underline hover:text-foreground transition-colors" />,
                  mail: mailLink,
                }}
              />
            </p>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* Cookiebeleid */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="cookies">
            {t("common.legal.cookiesHeading")}
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              {t("common.legal.cookiesIntro")}
            </p>
            <p><strong>{t("common.legal.cookiesWhichTitle")}</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <Trans i18nKey="common.legal.cookiesFunctional" />
              </li>
              <li>
                <Trans i18nKey="common.legal.cookiesAnalytics" />
              </li>
              <li>
                <Trans i18nKey="common.legal.cookiesAds" />
              </li>
            </ul>
            <p>
              {t("common.legal.cookiesClosing")}
            </p>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* Externe diensten / verwerkers */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="verwerkers">
            {t("common.legal.verwerkersHeading")}
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              {t("common.legal.verwerkersIntro")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Supabase</strong> — {t("common.legal.verwerkersSupabase")}
              </li>
              <li>
                <strong>Vercel</strong> — {t("common.legal.verwerkersVercel")}
              </li>
              <li>
                <strong>Cloudflare</strong> — {t("common.legal.verwerkersCloudflare")}
              </li>
              <li>
                <strong>OpenAI</strong> — {t("common.legal.verwerkersOpenai")}
              </li>
              <li>
                <strong>Google AdSense</strong> — {t("common.legal.verwerkersAdsense")}
              </li>
            </ul>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* Algemene Voorwaarden */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="voorwaarden">
            {t("common.legal.voorwaardenHeading")}
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              {t("common.legal.voorwaardenIntro")}
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>{t("common.legal.voorwaarden1")}</li>
              <li>{t("common.legal.voorwaarden2")}</li>
              <li>{t("common.legal.voorwaarden3")}</li>
              <li>{t("common.legal.voorwaarden4")}</li>
              <li>{t("common.legal.voorwaarden5")}</li>
            </ol>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* AVG / GDPR */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="avg">
            {t("common.legal.avgHeading")}
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              {t("common.legal.avgIntro")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("common.legal.avg1")}</li>
              <li>{t("common.legal.avg2")}</li>
              <li>{t("common.legal.avg3")}</li>
              <li>{t("common.legal.avg4")}</li>
              <li>{t("common.legal.avg5")}</li>
            </ul>
            <p>
              <Trans i18nKey="common.legal.avgContact" components={{ mail: mailLink }} />
            </p>
          </div>
        </section>
      </div>

      <div className="vintage-divider mt-12 mb-6" />
      <p className="text-xs text-muted-foreground text-center font-sans">
        {t("common.legal.lastUpdated")}
      </p>
    </div>
  );
}
