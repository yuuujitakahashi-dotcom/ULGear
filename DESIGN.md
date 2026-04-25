# ULoG Design Tokens

## 方針

### トークン設計の考え方
- **App Tokens**（`--primary`, `--surface-*` など）が主役。新しい UI を作るときはまずここから選ぶ。
- **shadcn/ui Tokens**（`--background`, `--muted` など）は shadcn コンポーネント内部で使われる。直接触るのは shadcn を上書きしたい場合のみ。
- ハードコードした色（`#3b82f6` など）は書かない。必ずトークンを使う。

### 色の使い方
```
背景レイヤー   --bg → --surface-1 → --surface-2 → --surface-3 → --surface
テキスト       --on-surface（メイン）/ --on-surface-v（サブ・ラベル）
ボーダー       --outline（visible）/ --outline-v（subtle、区切り線など）
強調・選択     --primary-container + --on-primary-container
破壊的操作     --error / variant="destructive"
```

### サーフェスの積み重ね
```
ページ背景（--bg + gradient）
  └─ カードやパネル（--surface）        shadow: --e1
       └─ インプット・行ホバー（--surface-1）
            └─ バッジ・タグ（--surface-2）
```
同じ elevation に複数のサーフェスを並べるときは --surface-1〜3 で区別する。`--surface` の上に `--surface` を重ねない。

### Elevation の使い方
```
--e1  フラットなカード、リスト行
--e2  ドロップダウン、ツールチップ
--e3  モーダル、ボトムシート
```
shadow はこの3段階のみ。中間値は作らない。

### ボタンの選び方
```
主要アクション（登録・保存）    variant="default"      size="default"
テーブル内の操作               variant="ghost"        size="icon-xs" / "xs"
キャンセル・戻る               variant="outline"
削除・取り消し                 variant="destructive"
テキストリンク的な導線         variant="link"
```

### タイポグラフィ方針
- 数値（重量・個数）は `--font-numeric`（Google Sans）が自動適用される（`font-variant-numeric: tabular-nums` 済み）。
- 日本語は `--font-sans`（Noto Sans JP）。body デフォルトなので明示不要。
- 本文 `text-sm`（14px）、補足・ラベル `text-xs`（12px）を基本とする。

### アニメーション方針
- 要素の登場: `.animate-slide-in`（素早い・UI操作フィードバック）or `.animate-fade-up`（ゆっくり・初期表示）。
- ローディング: `.spin-icon` + `<Loader2>` アイコン。
- 新しいアニメーションを追加する場合は `globals.css` の `@keyframes` セクションに追記する。

---

## Color

### App Tokens（カスタム）
| Token | Value | 用途 |
|---|---|---|
| `--primary` | `oklch(0.205 0 0)` | ボタン・強調要素 |
| `--on-primary` | `#ffffff` | Primary上のテキスト |
| `--primary-container` | `hsl(225,28%,90%)` | タブ・選択状態の背景 |
| `--on-primary-container` | `#000000` | Primary Container上のテキスト |
| `--secondary-container` | `hsl(225,28%,87%)` | セカンダリ選択背景 |
| `--on-secondary-container` | `#000000` | Secondary Container上のテキスト |
| `--error` | `#c0392b` | エラー・削除 |
| `--bg` | `hsl(210,8%,90%)` | ページ背景ベース |
| `--surface` | `#ffffff` | カード・モーダル |
| `--surface-1` | `hsl(225,28%,97%)` | 薄いサーフェス |
| `--surface-2` | `hsl(225,28%,92%)` | 中間サーフェス |
| `--surface-3` | `hsl(225,28%,88%)` | 濃いめサーフェス |
| `--on-surface` | `#000000` | 通常テキスト |
| `--on-surface-v` | `#6b6f80` | サブテキスト・プレースホルダー |
| `--outline` | `hsl(225,28%,79%)` | ボーダー |
| `--outline-v` | `hsl(225,28%,87%)` | 薄いボーダー |

### shadcn/ui Tokens
| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| `--destructive` | `oklch(0.58 0.22 27)` | `oklch(0.704 0.191 22.216)` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |

### Chart Colors
| Token | Value |
|---|---|
| `--chart-1` | `oklch(0.809 0.105 251.813)` |
| `--chart-2` | `oklch(0.623 0.214 259.815)` |
| `--chart-3` | `oklch(0.546 0.245 262.881)` |
| `--chart-4` | `oklch(0.488 0.243 264.376)` |
| `--chart-5` | `oklch(0.424 0.199 265.638)` |

---

## Elevation（Shadow）
| Token | Value | 用途 |
|---|---|---|
| `--e1` | `0 1px 2px rgba(10,14,26,.06), 0 1px 3px 1px rgba(10,14,26,.04)` | カード・軽い浮き |
| `--e2` | `0 1px 2px rgba(10,14,26,.06), 0 2px 6px 2px rgba(10,14,26,.04)` | ドロップダウン |
| `--e3` | `0 1px 3px rgba(10,14,26,.08), 0 4px 8px 3px rgba(10,14,26,.06)` | モーダル・シート |

---

## Border Radius
Base: `--radius: 0.625rem`

| Token | 計算値 | 用途 |
|---|---|---|
| `--radius-sm` | `0.375rem` | 小さい要素 |
| `--radius-md` | `0.5rem` | インプット |
| `--radius-lg` | `0.625rem` | カード（base） |
| `--radius-xl` | `0.875rem` | ダイアログ |
| `--radius-2xl` | `1.125rem` | シート |
| `--radius-3xl` | `1.375rem` | — |
| `--radius-4xl` | `1.625rem` | — |

Button は `rounded-full`（pill形状）。

---

## Typography

### Fonts
| 変数 | フォント | 用途 |
|---|---|---|
| `--font-numeric` | Google Sans | Latin・数値（重量表示など） |
| `--font-sans` | Noto Sans JP | 日本語テキスト |

フォールバック: `'Hiragino Sans'`, `'Hiragino Kaku Gothic ProN'`, `system-ui`, `sans-serif`

数値は `font-variant-numeric: tabular-nums`（等幅数字）。

### Scale
| 用途 | クラス例 |
|---|---|
| Base | `14px`（body） |
| xs ボタン | `text-xs` (12px) |
| sm ボタン | `text-[0.8rem]` (12.8px) |
| Default ボタン | `text-sm` (14px) |
| lg ボタン | `text-base` (16px) |

### Weights
- `400` Regular
- `500` Medium（UI要素）
- `700` Bold（見出し）

---

## Background

ページ背景は fixed な radial gradient:
```
radial-gradient(ellipse 80% 60% at 20% 10%, hsl(210,10%,94%) 0%, transparent 60%),
radial-gradient(ellipse 60% 50% at 80% 80%, hsl(210,10%,87%) 0%, transparent 55%),
hsl(210,8%,90%)
```

---

## Spacing

| Token | Value | 用途 |
|---|---|---|
| `--page-px` | `clamp(14px, 4.5vw, 40px)` | ページ左右パディング（レスポンシブ） |

---

## Button

`rounded-full`（pill）、`transition-all`

| Variant | 外観 |
|---|---|
| `default` | `bg-primary` + white text |
| `outline` | `border-border bg-background`、hover で muted |
| `secondary` | `bg-secondary` |
| `ghost` | 背景なし、hover で muted |
| `destructive` | `bg-destructive/10 text-destructive` |
| `link` | アンダーライン |

| Size | 高さ | 用途 |
|---|---|---|
| `icon-xs` | 28px | テーブル内アクション |
| `xs` | 28px | コンパクトボタン |
| `icon-sm` | 32px | — |
| `sm` | 32px | サブアクション |
| `icon` | 40px | アイコンボタン |
| `default` | 40px | 主要アクション |
| `icon-lg` | 48px | — |
| `lg` | 48px | CTAボタン |

---

## Animation

| クラス | Keyframe | Duration |
|---|---|---|
| `.animate-slide-in` | `slideIn`（X: -8px → 0） | 0.25s ease |
| `.animate-fade-up` | `fadeUp`（Y: 12px → 0） | 0.6s ease |
| `.spin-icon` | `spin`（360°） | 0.8s linear ∞ |
| shimmer | `shimmer`（background-position） | — |

---

## Drag & Drop

| クラス | 効果 |
|---|---|
| `.gear-row-dragging` | `opacity: 0.3` |
| `.gear-row-drop-before` | `border-top: 2px solid #000` |
| `.gear-row-drop-after` | `border-bottom: 2px solid #000` |
| `.cat-group-dragging` | `opacity: 0.6` + black outline |
| `.list-tab-dragging` | `opacity: 0.5` |

---

## Icon Library

Lucide React（Material Icons の代替）。使用アイコン:
`Plus`, `X`, `Share2`, `User2`, `SlidersHorizontal`, `GripVertical`,
`ClipboardCheck`, `Check`, `Mountain`, `Camera`, `ImagePlus`,
`Copy`, `Link2`, `Package`, `Loader2`
