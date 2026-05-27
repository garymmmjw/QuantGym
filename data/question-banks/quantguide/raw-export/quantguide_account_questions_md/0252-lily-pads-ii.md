# QuantGuide Question

## 252. Lily Pads II

**Metadata**

- ID: `IF4lCCMELpXDTV1jKQZU`
- URL: https://www.quantguide.io/questions/lily-pads-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Akuna, SIG
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:14:09 America/New_York
- Last Edited By: Gabe

### 题干

Lily pads double in area each day, and each lily pad is one square foot in area. How many days pass until a 20480-square foot pond that initially has 10 lily pads is covered in lily pads? Assume the region each lily pad covers is disjoint from the others.

### Hint

How much area must each lily pad cover in order for the entirety of the pond to be covered?

### 解答

Each lily pad must cover $\frac{20480}{10}$ square feet to cover the entirety of the pond. Since the size of each pad is $2^N$ after $N$ days of growth, then:

$$2^N = \frac{20480}{10} \Rightarrow N=11$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IF4lCCMELpXDTV1jKQZU",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:14:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1987223,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Lily Pads II",
    "topic": "brainteasers",
    "urlEnding": "lily-pads-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "IF4lCCMELpXDTV1jKQZU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Lily Pads II",
    "topic": "brainteasers",
    "urlEnding": "lily-pads-ii"
  }
}
```
