// Gedeelde mail-template voor Notify-mailings. Gebruikt door send-announcement
// (testmail + enqueue) en process-mail-queue (wachtrij-verwerker). Wijzig je de
// opmaak, spiegel dan ook NotifyTab/buildEmailHtml (client-side preview).
export const MAIL_WORKER = "https://koerspoule-mail.luuk-loohuis.workers.dev";
export const BASE_URL = "https://koerspoule.nl";
// ?v= cache-bust: na opnieuw uploaden onder dezelfde naam serveert de CDN/mailclient
// anders het oude plaatje. Bump dit nummer bij elke nieuwe upload.
const IMG_V = "4";
const HEADER_IMG = `https://uqjrzozttkbjrdvzeroc.supabase.co/storage/v1/object/public/mailbanner/koerspoule_header_afbeelding.png?v=${IMG_V}`;
const FOOTER_IMG = `https://uqjrzozttkbjrdvzeroc.supabase.co/storage/v1/object/public/mailbanner/koerspoule_footer_strip.png?v=${IMG_V}`;
// Frame-kleuren afgestemd op de header/footer-art zodat body naadloos doorloopt.
const FRAME_EDGE = "#F5D9A7";   // tan rand buiten de gouden lijn (= cap-randen)
const FRAME_GOLD = "#DC9E29";   // gouden kaderlijn
const FRAME_CREAM = "#F5E9D5";  // = crème onderaan de header-PNG → naadloze overloop
const EMAIL_WIDTH = 720;
const EMAIL_INNER_WIDTH = 694;

export function buildHtml(
  body: string,
  unsubscribeUrl: string,
  _titleColor = "#1a1a1a",
  _titleSize = 11,
  includeSteun = false,
  includeCta = true,
): string {
  // Compact: lege regel = alinea (nette marge), enkele regelovergang = <br>.
  // Markdown-bold: **tekst** → vetgedrukt (spiegelt NotifyTab/buildEmailHtml).
  const mdBold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const bodyHtml = body
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => `<p style="margin:0 0 11px 0;">${mdBold(p.replace(/\r\n|\r|\n/g, "<br>"))}</p>`)
    .join("");
  return `<!doctype html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/><title>Koerspoule Communiqué</title></head>
<body style="margin:0;padding:0;background-color:#e9e3d6;">
  <center style="width:100%;background-color:#e9e3d6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background-color:#e9e3d6;margin:0;padding:0;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="${EMAIL_WIDTH}" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:${EMAIL_WIDTH}px;border-collapse:collapse;margin:0 auto;background-color:${FRAME_EDGE};">
          <!-- Header-afbeelding (cap met afgeronde onderkant) -->
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:${FRAME_EDGE};">
            <img src="${HEADER_IMG}" alt="Koerspoule header" width="${EMAIL_WIDTH}" style="display:block;width:100%;max-width:${EMAIL_WIDTH}px;height:auto;border:0;margin:0;" />
          </td></tr>

          <!-- Content: tan-rand → gouden kaderlijn → crème binnenvlak, zodat het
               kader van de header naadloos doorloopt naar de footer. -->
          <tr><td align="center" style="padding:0 13px;background-color:${FRAME_EDGE};">
            <table role="presentation" width="${EMAIL_INNER_WIDTH}" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:${EMAIL_INNER_WIDTH}px;border-collapse:collapse;background-color:${FRAME_CREAM};border-left:2px solid ${FRAME_GOLD};border-right:2px solid ${FRAME_GOLD};">
              <tr><td style="padding:16px 28px 20px 28px;font-family:Georgia,'Times New Roman',serif;color:#2f2a24;">
                <div style="margin:0 0 10px 0;font-size:28px;line-height:34px;font-weight:bold;color:#211d19;">
                  Beste deelnemer,
                </div>
                <div style="margin:0 0 10px 0;font-size:17px;line-height:24px;color:#3d362e;">
                  ${bodyHtml}
                </div>
                ${includeCta !== false ? `<div style="text-align:center;margin:20px 0 22px 0;">
                  <a href="${BASE_URL}" target="_blank" style="display:inline-block;padding:13px 26px;background-color:#d4a62b;color:#1d1916;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;border-radius:6px;">
                    Ga naar Koerspoule
                  </a>
                </div>` : ""}${includeSteun ? `
                <div style="text-align:center;margin:0 0 22px 0;">
                  <a href="https://ko-fi.com/koerspoule" target="_blank" style="display:inline-block;padding:13px 26px;background-color:#1A1612;color:#F5EDE0;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;border-radius:6px;border:1px solid #E1A33A;">
                    <span style="color:#E1A33A;">&#9749;</span>&nbsp; Steun Koerspoule
                  </a>
                </div>` : ""}
                <div style="margin:0;font-size:18px;line-height:30px;color:#3d362e;">
                  Veel koersplezier,<br>
                  <strong>Het Koerspoule team</strong>
                </div>
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid #d8c89d;text-align:center;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2b;margin-bottom:10px;">
                    Volg Koerspoule
                  </div>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td align="center" bgcolor="#1A1612" style="border-radius:10px;border:1px solid #E1A33A;">
                        <a href="https://www.instagram.com/koerspoule" target="_blank" style="display:inline-block;padding:12px 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;color:#F5EDE0;text-decoration:none;border-radius:10px;">
                          <span style="color:#E1A33A;font-size:17px;">&#9673;</span>&nbsp;&nbsp;@koerspoule&nbsp;op Instagram
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="margin-top:10px;font-size:15px;line-height:24px;color:#655847;">
                    Blijf op de hoogte van updates, standen en koerssfeer.
                  </div>
                  <div style="margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#9a8f7c;">
                    <a href="${BASE_URL}" style="color:#9a8f7c;text-decoration:none;">koerspoule.nl</a>
                    &nbsp;·&nbsp;
                    <a href="${unsubscribeUrl}" style="color:#9a8f7c;text-decoration:underline;">uitschrijven</a>
                  </div>
                </div>
              </td></tr>
            </table>
          </td></tr>

          <!-- Footer-afbeelding (cap met afgeronde bovenkant + icoonstrip) -->
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:${FRAME_EDGE};">
            <img src="${FOOTER_IMG}" alt="Koerspoule footer" width="${EMAIL_WIDTH}" style="display:block;width:100%;max-width:${EMAIL_WIDTH}px;height:auto;border:0;margin:0;" />
          </td></tr>
        </table>
      </td></tr>
    </table>
  </center>
</body></html>`;
}
