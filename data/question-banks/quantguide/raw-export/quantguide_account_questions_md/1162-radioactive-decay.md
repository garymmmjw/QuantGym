# QuantGuide Question

## 1162. Radioactive Decay

**Metadata**

- ID: `B319fEybXavEMGKWQCSB`
- URL: https://www.quantguide.io/questions/radioactive-decay
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Five Rings
- Source: 5r
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 08:43:19 America/New_York
- Last Edited By: Gabe

### 题干

Plutonium decays at an average rate of $1$ time per second. Find the probability an atom of Plutonium doesn't decay in next 3 seconds. The answer is in the form $e^{a}$ for some $a$. Find $a$.

### Hint

What is the distribution of time between decays?

### 解答

The average rate of decay is $1$ per second, so the time between decays is $T \sim \text{Exp}(1)$. We want $\mathbb{P}[T > 3]$. This is just $\displaystyle \int_3^{\infty} e^{-x}dx = e^{-3}$, so $a = -3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-3"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "B319fEybXavEMGKWQCSB",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 08:43:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9660796,
    "randomizable": "",
    "source": "5r",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Radioactive Decay",
    "topic": "probability",
    "urlEnding": "radioactive-decay",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "B319fEybXavEMGKWQCSB",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Radioactive Decay",
    "topic": "probability",
    "urlEnding": "radioactive-decay"
  }
}
```
