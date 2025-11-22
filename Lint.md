# Lint.md

Lintとして定めるべきコーディングルール。
以下はTypeScriptコードにのみ適用される。

## スタイル

1. 行区切りのセミコロンは必須
    ```TypeScript
    f(); // セミコロンが必須
    g(); // セミコロンが必須
    h(
      "Hello",
      "World",
    ); // セミコロンが必須
    ```
2. 複数行にわたるカンマ区切りは、末尾の要素にも必ずカンマをつける
    ```TypeScript
    // 関数呼び出し
    f(
      "Hello",
      "Beautiful",
      "World", // カンマが必須
    );
    // 配列の定義
    const array = [
      "Hello",
      "Beautiful",
      "World", // カンマが必須
    ];
    // オブジェクトの定義
    const obj = {
      hello: "Hello",
      beautiful: "Beautiful",
      world: "World", // カンマが必須
    };
    ```
3. インデントは原則として空白2つ
4. エンコーディングはutf-8
5. 改行文字はLF
6. Trailing spacesの禁止
    - コード上意味を持たないスペース・タブ文字が改行文字の前に来ることは禁止

## イミュータビリティ

ミュータブルな変数はなるべく利用しない。
代わりに三項演算子や関数への切り出しを利用する。

```TypeScript
// これはダメ
let hello;
if (lang == "ja") {
    hello = "こんにちは";
} else {
    hello = "Hello";
}

// これはOK
const hello = lang == "ja"
  ? hello = "こんにちは"
  : hello = "Hello";
```

ループ変数としての利用は許可する。

```TypeScript
// これはOK
for (let i = 0; i < 10; ++i) {
    // ...
}
```

varの利用は禁止。
