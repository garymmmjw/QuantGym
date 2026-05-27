# QuantGuide Question

## 635. Investment Arbitrage

**Metadata**

- ID: `Mwk8TTn0Rp5ET3IVfA3n`
- URL: https://www.quantguide.io/questions/investment-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: sig
- Tags: Arbitrage
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-28 11:33:27 America/New_York
- Last Edited By: Gabe

### 题干

You are in a market where you can invest in a stock or bet at a casino in $\$100$ increments. Call these increments units. Note that you may not purchase fractions of a unit. If you invest in the stock, then it goes up or down. If it goes up in value, you gain an additional $100$ dollars per unit. If it goes down, you lose $50$ dollars per unit. Additionally, you can bet on whether the stock will go up or down at the casino, where you either win $100$ per unit if you're right or lose all $100$ if not. Devise a strategy where you will always make a profit. Find the guaranteed profit if you hold a minimal amount of total units.

### Hint

We can hedge our position in investing in the stock by betting on it doing down at the casino. Set up a system of equations based on what actually happens.

### 解答

We can hedge our position in investing in the stock by betting on it doing down at the casino. Let $p$ be the profit you make. Suppose you purchase $s$ stocks and purchase $b$ units in the casino to bet on the stock going down. Then $p = 100s - 100b$ if the stock goes up, as you make $100$ per stock if it goes up and lose $100$ in the casino since you bet on it going down. If it goes down, then $p = 100b - 50s$. Equating these, we see that $100s - 100b = 100b - 50s$, which means $s = \dfrac{4b}{3}$. Therefore, to ensure both are integers, we can let $b = 3$ and $a = 4$, which is the minimal position with integer units, yields a profit of $100$ guaranteed.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "100"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Mwk8TTn0Rp5ET3IVfA3n",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 11:33:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5040528,
    "source": "sig",
    "status": "published",
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Investment Arbitrage",
    "topic": "finance",
    "urlEnding": "investment-arbitrage",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "Mwk8TTn0Rp5ET3IVfA3n",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Investment Arbitrage",
    "topic": "finance",
    "urlEnding": "investment-arbitrage"
  }
}
```
