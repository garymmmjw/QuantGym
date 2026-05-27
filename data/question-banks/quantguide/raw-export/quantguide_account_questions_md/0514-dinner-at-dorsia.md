# QuantGuide Question

## 514. Dinner at Dorsia

**Metadata**

- ID: `AgAvKtqjxXqGyck90t14`
- URL: https://www.quantguide.io/questions/dinner-at-dorsia
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Belvedere Trading, SIG, Akuna, Jane Street, Citadel, GSA Capital
- Source: common q
- Tags: Continuous Random Variables, Events
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-3 09:36:28 America/New_York
- Last Edited By: Gabe

### 题干

Two quants are planning for dinner at Dorsia. Assume that each independently arrives at some uniformly random time between 8:00pm and 9:00pm, for which they stay for exactly 10 minutes before leaving. What is the probability that they will meet each other and stay for dinner?

### Hint

Note that their arrival times are uniformly distributed. Geometry can be useful for this type of problem. How can you define the sample space and constraint of this problem?

### 解答

Let quant $x$ arrive $X$ minutes after 8:00pm and quant $y$ arrive $Y$ minutes after 8:00pm. The two quants meet if and only if $\vert Y - X\vert \leq 10$. The area covered by this constraint in the sample space $X, Y \in [0, 60]$ is equal to $60^2 - 50^2 = 1100$. Since both $X$ and $Y$ are uniformly distributed, the probability that the two quants meet is $\frac{1100}{3600} = \frac{11}{36}.$ 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/36"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "GSA Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "AgAvKtqjxXqGyck90t14",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 09:36:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4109001,
    "source": "common q",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Dinner at Dorsia",
    "topic": "probability",
    "urlEnding": "dinner-at-dorsia",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "GSA Capital"
      }
    ],
    "difficulty": "medium",
    "id": "AgAvKtqjxXqGyck90t14",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Dinner at Dorsia",
    "topic": "probability",
    "urlEnding": "dinner-at-dorsia"
  }
}
```
