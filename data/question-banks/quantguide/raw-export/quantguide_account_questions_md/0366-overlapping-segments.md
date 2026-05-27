# QuantGuide Question

## 366. Overlapping Segments

**Metadata**

- ID: `i7q99AIbrt4hPSFrMhOr`
- URL: https://www.quantguide.io/questions/overlapping-segments
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Akuna, Virtu Financial, Tower Research Capital
- Source: Tower Glassdoor
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 10:34:11 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X_1,X_2,X_3,X_4 \sim \text{Unif}(0,1)$ IID. Draw two line segments: One between $X_1$ and $X_2$ and one between $X_3$ and $X_4$. Find the probability that there is overlap between the two line segments.

### Hint

We only care about which endpoint is paired with the lowest of the four endpoints. Why?

### 解答

There is a sneaky trick here. We only care about which endpoint is paired with the lowest of the four endpoints (in terms of value). If it is the second smallest, then we get no overlap. Otherwise, we have overlap. As it is equally likely for the remaining three random variables to be ordered in any way with respect to the last three spots, the probability is just $\dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Tower Research Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "i7q99AIbrt4hPSFrMhOr",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:34:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2835755,
    "source": "Tower Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Overlapping Segments",
    "topic": "probability",
    "urlEnding": "overlapping-segments",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Tower Research Capital"
      }
    ],
    "difficulty": "medium",
    "id": "i7q99AIbrt4hPSFrMhOr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Overlapping Segments",
    "topic": "probability",
    "urlEnding": "overlapping-segments"
  }
}
```
