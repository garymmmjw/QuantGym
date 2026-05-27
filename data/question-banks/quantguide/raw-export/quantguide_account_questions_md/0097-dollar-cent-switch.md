# QuantGuide Question

## 97. Dollar Cent Switch

**Metadata**

- ID: `Yjfl2uoguxEF2T9dWW6G`
- URL: https://www.quantguide.io/questions/dollar-cent-switch
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: 536 puzzles
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A man went to his local bank to cash a check. When giving his money to the cashier, by mistake, gave him dollars as cents and cents as dollars. He didn't examine the money and just walked home and spent a nickel on some candy. He then found that he possessed exactly twice as much money as the check was worth. He had no money in his pocket before going to the bank. How much was the check for?

### Hint

Let $y$ be the number of cents and $x$ be the number of dollars on the check. Then the man's check is $x + 0.01y$. The amount the main was paid is $y + 0.01x$. The amount he had that was exactly twice as much as the check was $y + (0.01x - 0.05)$. Therefore, $2x + 0.02y = y + (0.01x - 0.05)$.

### 解答

Let $y$ be the number of cents and $x$ be the number of dollars on the check. Then the man's check is $x + 0.01y$. The amount the main was paid is $y + 0.01x$. The amount he had that was exactly twice as much as the check was $y + (0.01x - 0.05)$. Therefore, $2x + 0.02y = y + (0.01x - 0.05)$.

$$$$

There are two cases to consider here. In the first case, we have that $y < 50$, in which the $0.02y$ term doesn't overflow into another dollar. In this case, we would have that $2x = y$ and $0.02y = 0.01x - 0.05$. If this was true, then $0.04x = 0.01x - 0.05$, which would means that $x < 0$, which is impossible. Therefore, we have that $y \geq 50$, in which $y = 2x + 1$, as we overflow into another dollar. Additionally, we would have that $0.02y - 1 = 0.01x - 0.05$. Substituting in here, $$0.02(2x+1) - 1 = 0.01x - 0.05 \iff 0.03x = 0.99 \iff  x = 31$$ Then we have that $y = 2\cdot 31 + 1 = 63$. Therefore, his check was for $31.63$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "31.63"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "Yjfl2uoguxEF2T9dWW6G",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 681877,
    "source": "536 puzzles",
    "status": "published",
    "tags": [],
    "title": "Dollar Cent Switch",
    "topic": "brainteasers",
    "urlEnding": "dollar-cent-switch"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "Yjfl2uoguxEF2T9dWW6G",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Dollar Cent Switch",
    "topic": "brainteasers",
    "urlEnding": "dollar-cent-switch"
  }
}
```
