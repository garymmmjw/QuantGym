# QuantGuide Question

## 747. Gamma Review I

**Metadata**

- ID: `lp9eA2dknJcT6qtnFpdK`
- URL: https://www.quantguide.io/questions/gamma-review-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables, Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:08:41 America/New_York
- Last Edited By: Gabe

### 题干

Compute $\dfrac{\Gamma\left(\dfrac{9}{4}\right)}{\Gamma\left(\dfrac{1}{4}\right)}$.

### Hint

Use the reduction property $\Gamma(a+1) = a\Gamma(a)$.

### 解答

Using the reduction property $\Gamma(a+1) = a\Gamma(a)$, we note that $\Gamma\left(\dfrac{9}{4}\right) = \dfrac{5}{4}\cdot \Gamma\left(\dfrac{5}{4}\right) = \dfrac{5}{4} \cdot \dfrac{1}{4} \cdot \Gamma\left(\dfrac{1}{4}\right)$. Therefore, our answer is $\dfrac{5}{16}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/16"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lp9eA2dknJcT6qtnFpdK",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:08:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6107075,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Gamma Review I",
    "topic": "probability",
    "urlEnding": "gamma-review-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "lp9eA2dknJcT6qtnFpdK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Gamma Review I",
    "topic": "probability",
    "urlEnding": "gamma-review-i"
  }
}
```
