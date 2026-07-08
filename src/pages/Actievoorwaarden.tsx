import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";

export default function Actievoorwaarden() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2 text-foreground">
        {t("common.actie.title")}
      </h1>
      <p className="text-xs text-muted-foreground font-sans mb-8">{t("common.actie.lastUpdated")}</p>

      <div className="space-y-10 font-sans text-foreground/90 leading-relaxed text-sm">
        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s1Title")}</h2>
          <p>
            {t("common.actie.s1Body")}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s2Title")}</h2>
          <p>
            {t("common.actie.s2Body")}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s3Title")}</h2>
          <p>
            {t("common.actie.s3Body")}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s4Title")}</h2>
          <p>
            {t("common.actie.s4Body")}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s5Title")}</h2>
          <p>
            {t("common.actie.s5Body")}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s6Title")}</h2>
          <p>
            <Trans
              i18nKey="common.actie.s6Body"
              components={{
                privacyLink: <Link to="/juridisch" className="underline hover:text-foreground transition-colors" />,
              }}
            />
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s7Title")}</h2>
          <p>
            {t("common.actie.s7Body")}
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">{t("common.actie.s8Title")}</h2>
          <p>
            {t("common.actie.s8Body")}
          </p>
        </section>
      </div>

      <div className="vintage-divider mt-12 mb-6" />
      <p className="text-sm text-muted-foreground text-center font-sans">
        <Trans
          i18nKey="common.actie.contact"
          components={{
            mail: <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors" />,
          }}
        />
      </p>
    </div>
  );
}
