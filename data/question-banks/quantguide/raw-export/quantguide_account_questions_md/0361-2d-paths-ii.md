# QuantGuide Question

## 361. 2D Paths II

**Metadata**

- ID: `gD1KJ9TtjRzMv6xZ2Rpu`
- URL: https://www.quantguide.io/questions/2d-paths-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, Flow Traders, Five Rings
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:07:32 America/New_York
- Last Edited By: Gabe

### 题干

You are playing a 2D game where your character is trapped within a $6 \times 6$ grid. Your character starts at $(0,0)$ and can only move up and right. There is a power-up located at $(2,3)$. How many possible paths can your character take to get to $(6,6)$ such that it can collect the power-up?

### Hint

The character has two sub-paths: from $(0,0)$ to $(2,3)$ and from $(2,3)$ to $(6,6)$. Try to solve these separately.

### 解答

The character has two sub-paths: from $(0,0)$ to $(2,3)$ and from $(2,3)$ to $(6,6)$. The total number of paths from $(0,0)$ to $(2,3)$ is ${5 \choose 2}$. The total number of paths from $(2,3)$ to $(6,6)$ is ${7 \choose 4}$. Thus, the total number of paths to $(6,6)$ such that your character can pass through $(2,3)$ is:

$${5 \choose 2} \times {7 \choose 4} = 10 \times 35 = 350$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "350"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Flow Traders"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "gD1KJ9TtjRzMv6xZ2Rpu",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:07:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2782328,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths II",
    "topic": "brainteasers",
    "urlEnding": "2d-paths-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Flow Traders"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "gD1KJ9TtjRzMv6xZ2Rpu",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths II",
    "topic": "brainteasers",
    "urlEnding": "2d-paths-ii"
  }
}
```
