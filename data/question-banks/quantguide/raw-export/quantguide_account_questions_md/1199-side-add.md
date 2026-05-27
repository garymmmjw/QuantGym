# QuantGuide Question

## 1199. Side Add

**Metadata**

- ID: `I2fPCGKdEsQbQeemwbb9`
- URL: https://www.quantguide.io/questions/side-add
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Original
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:13:54 America/New_York
- Last Edited By: Gabe

### 题干

Ab rolls a fair standard $6-$sided die. Afterwards, given he rolls $k$ on the first roll, Ab rolls a fair $(6+k)-$sided die for the second roll with the values $1,2,\dots,6+k$. Find the expected value that appears on Ab's second roll.

### Hint

Condition on the value of the first die roll. What is the average of the first $n$ positive integers?

### 解答

Let $R$ be the value of the second roll. We want $\mathbb{E}[R]$. Clearly the values $R$ can take depend on the value of the first roll, so we should condition on $X_1$, the first roll value. Thus, $\mathbb{E}[R] = \mathbb{E}[\mathbb{E}[R \mid X_1]]$. $\mathbb{E}[R \mid X_1]$ is the expected value of a fair $(6+X_1)-$sided die, which is $\dfrac{(6+X_1) + 1}{2} = \dfrac{7+X_1}{2}$. Therefore, we have $$\mathbb{E}[R] = \mathbb{E}\left[\dfrac{7+X_1}{2}\right] = \dfrac{7}{2} + \dfrac{1}{2}\mathbb{E}[X_1] = \dfrac{7}{2} + \dfrac{7}{4} = \dfrac{21}{4}$$ In the last line, we use the fact that the average value of a fair die roll is $\dfrac{7}{2}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "21/4"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "I2fPCGKdEsQbQeemwbb9",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:13:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9945347,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Side Add",
    "topic": "probability",
    "urlEnding": "side-add",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "I2fPCGKdEsQbQeemwbb9",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Side Add",
    "topic": "probability",
    "urlEnding": "side-add"
  }
}
```
