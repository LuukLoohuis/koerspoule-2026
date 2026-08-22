# koerspoule-mail

Cloudflare Worker die alle uitgaande mail verstuurt via **Amazon SES v2**.

De hele app kent maar één mailpad:

```
send-mail (transactioneel) ─┐
process-mail-queue (bulk)  ─┼─→ deze Worker ─→ SES (eu-north-1)
send-announcement          ─┘
```

De Supabase-functies posten `{to, subject, html, listUnsubscribe?}` met een
`X-Worker-Secret`. Die vorm is bewust gelijk gebleven aan de Resend-versie, zodat
van provider wisselen niets aan de Supabase-kant raakt.

## Eenmalig instellen

```bash
npm install -g wrangler
wrangler login
wrangler secret put WORKER_SECRET          # zelfde waarde als MAIL_WORKER_SECRET in Supabase
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler deploy
```

Geheimen horen niet in `wrangler.toml` en niet in git. De niet-geheime instellingen
(regio, afzender, configuratieset) staan wél in `wrangler.toml` onder `[vars]`.

## IAM

Geef de IAM-gebruiker niet meer dan dit:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": [
      "arn:aws:ses:eu-north-1:<account-id>:identity/koerspoule.nl",
      "arn:aws:ses:eu-north-1:<account-id>:configuration-set/koerspoule"
    ]
  }]
}
```

## Testen

De ondertekening en de berichtvorm worden getest vanuit de hoofdrepo:

```bash
npx vitest run src/test/sigv4.test.ts src/test/sesBericht.test.ts
```

`sigv4.test.ts` draait tegen de officiële AWS-testvector `get-vanilla`, dus een
fout in de ondertekening valt daar om en niet pas op een verzendavond.

## Antwoorden

| Situatie | Status | Wat de wachtrij doet |
|---|---|---|
| Verstuurd | 200 + `{ok, id}` | markeert als `sent` |
| Throttling | 429 | wacht en probeert opnieuw |
| Geweigerd door SES | SES-status | telt een poging; na 5 definitief `failed` |
| Verkeerd secret | 401 | telt een poging |
