# QuantGuide Question

## 172. Random Angle I

**Metadata**

- ID: `Uqig8WqWDfvn0k6FUA8N`
- URL: https://www.quantguide.io/questions/random-angle-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Goldman Sachs
- Source: Original
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:45:53 America/New_York
- Last Edited By: Gabe

### 题干

A right triangle is being formed with legs labeled $A$ and $B$. The random lengths of legs $A$ and $B$ are both IID $\text{Unif}(0,1)$. Let $\theta$ be the angle that is opposite of side $A$. Find the probability $\theta > \dfrac{\pi}{4}$.

### Hint

We know that $\tan(\theta) = \dfrac{A}{B}$. If $\theta > \dfrac{\pi}{4}$, then $\tan(\theta) > 1$.

### 解答

We know that $\tan(\theta) = \dfrac{A}{B}$. If $\theta > \dfrac{\pi}{4}$, then $\tan(\theta) > 1$, so $\dfrac{A}{B} > 1$, or $A > B$. Thus, we want $\mathbb{P}[A > B]$, which is just $\dfrac{1}{2}$ as $A$ and $B$ are IID and hence exchangeable.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Uqig8WqWDfvn0k6FUA8N",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:45:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1304356,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Angle I",
    "topic": "probability",
    "urlEnding": "random-angle-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "Uqig8WqWDfvn0k6FUA8N",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Angle I",
    "topic": "probability",
    "urlEnding": "random-angle-i"
  }
}
```
