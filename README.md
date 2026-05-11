# Matraph Frontend-First Architecture

Vue 3 tabanlı uygulama, matematik ifadelerini istemci tarafında hesaplar ve grafikten ses üretir.

## Why frontend-first?
- Backend bağımlılığını azaltır.
- Düşük gecikme ile interaktif deneyim sunar.
- Stateless hosting ile operasyon maliyeti düşer.

## Commands
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run build`

## Security
- Expression allowlist + token denylist uygulanır.
- Expression uzunluk limiti vardır.
- `eval` kullanılmaz; `mathjs.compile` kontrollü scope ile çağrılır.
