# QuantGuide Question

## 332. 2D Paths I

**Metadata**

- ID: `5kVtbcWrrxSj1sGMFeeU`
- URL: https://www.quantguide.io/questions/2d-paths-i
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Flow Traders, Citadel, Five Rings
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:07:23 America/New_York
- Last Edited By: Gabe

### 题干

You are playing a 2D game where your character is trapped within a $6 \times 6$ grid. Your character starts at $(0,0)$ and can only move up and right. How many possible paths can your character take to get to $(6,6)$?

### Hint

Your character will take a total of 12 steps, regardless of the path it takes.

### 解答

Your character will take a total of 12 steps, regardless of the path it takes. Of these 12 steps, 6 must be up, and the other 6 must be right. In other words, of the 12 steps, you choose 6 of them to be up, and the rest will be filled in as right. Thus, the total number of paths you character can take is:

$${12 \choose 6} = \frac{12!}{6! \times 6!} = 924$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "924"
    ],
    "companies": [
      {
        "company": "Flow Traders"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5kVtbcWrrxSj1sGMFeeU",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:07:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2557661,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths I",
    "topic": "brainteasers",
    "urlEnding": "2d-paths-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Flow Traders"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "5kVtbcWrrxSj1sGMFeeU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths I",
    "topic": "brainteasers",
    "urlEnding": "2d-paths-i"
  }
}
```
