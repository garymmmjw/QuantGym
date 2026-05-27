# QuantGuide Question

## 539. High or Die

**Metadata**

- ID: `newQuestion`
- URL: https://www.quantguide.io/questions/high-or-die
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Original
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-11-17 14:39:32 America/New_York
- Last Edited By: Kaushik

### 题干

Francisco rolls a fair die and records the value he rolls. Afterwards, he continues rolling the die until he obtains a value at least as large as the first roll. Let $N$ be the number of rolls after the first he performs. Find $\mathbb{E}[N]$.

### Hint

Condition on the value of the first roll. Afterwards, what is the distribution of the number of rolls he must perform to exceed the first value?

### 解答

How likely it is to obtain a value that is at least as large as the first value depends on the first value itself. Therefore, we should condition on $X_1$, the value of the first roll. This means that $\mathbb{E}[N] = \mathbb{E}[\mathbb{E}[N \mid X_1]]$. Given $X_1$, there are $7-X_1$ values on the die at least $X_1$, so the probability of obtaining a value at least $X_1$ any given roll would be $\dfrac{7-X_1}{6}$. Therefore, the expected number of rolls needed to do so is $\dfrac{6}{7-X_1}$. Plugging this in and using LOTUS, $$\mathbb{E}[N] = \mathbb{E}\left[\dfrac{6}{7-X_1}\right] = \displaystyle \sum_{i=1}^6 \dfrac{6}{7-i} \cdot \dfrac{1}{6} = \dfrac{49}{20}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "49/20"
    ],
    "difficulty": "easy",
    "hasEdits": true,
    "id": "newQuestion",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-17 14:39:32 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 4293712,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "High or Die",
    "topic": "probability",
    "urlEnding": "high-or-die"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "newQuestion",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "High or Die",
    "topic": "probability",
    "urlEnding": "high-or-die"
  }
}
```
