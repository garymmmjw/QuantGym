# QuantGuide Question

## 838. Largest Inscribed Circle

**Metadata**

- ID: `ZP8HryRdjR3AAggoA3yV`
- URL: https://www.quantguide.io/questions/largest-inscribed-circle
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r round 1
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-11 10:54:21 America/New_York
- Last Edited By: Gabe

### 题干

What is the area of the largest circle that can be inscribed inside a triangle with side lengths of 16, 16, and 24? The answer can be written in the form $\dfrac{p\pi}{q}$, where $\dfrac{p}{q}$ is a simplified fraction. Find $p + q$.

### Hint

Consider the area of the triangle. Can you relate this to the quantity that we want?

### 解答

Recall from euclidean geometry that the area of a triangle can be expressed as the product of its inradius and its semiperimeter. Following routine application of the pythagorean theorem, we find that the altitude of the triangle from the base of length $24$ is $4\sqrt{7}$, so the area is $48\sqrt{7}$. The semiperimeter, being half the perimeter, is $28$, so we can compute the inradius as $\dfrac{12\sqrt{7}}{7}$. The area of the incircle is $\dfrac{144\pi}{7}$, so our answer is $144 + 7 = 151$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "151"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZP8HryRdjR3AAggoA3yV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-11 10:54:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6881612,
    "source": "5r round 1",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Largest Inscribed Circle",
    "topic": "pure math",
    "urlEnding": "largest-inscribed-circle",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "ZP8HryRdjR3AAggoA3yV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Largest Inscribed Circle",
    "topic": "pure math",
    "urlEnding": "largest-inscribed-circle"
  }
}
```
