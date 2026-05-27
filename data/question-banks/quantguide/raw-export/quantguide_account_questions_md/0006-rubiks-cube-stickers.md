# QuantGuide Question

## 6. Rubik's Cube Stickers

**Metadata**

- ID: `sJ2ESe9arGzfZ9GbiEMy`
- URL: https://www.quantguide.io/questions/rubiks-cube-stickers
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Chicago Trading Company, Blackedge Capital, Virtu Financial, Akuna
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-5 10:14:41 America/New_York
- Last Edited By: Gabe

### 题干

A $4 \times 4 \times 4$ Rubik's Cube is composed of $1 \times 1 \times 1$ mini-cubes. The Rubik's Cube has stickers on its outer layer to denote the colors of the cube. How many mini-cubes have at least one sticker on them?

### Hint

Instead of computing how many mini-cubes have stickers on them, an easier approach may be to calculate how many mini-cubes are unseen and thus do not have stickers on them.

### 解答

There are a total of $4^3$ mini-cubes that compose the Rubik's Cube. Of these, the core $2^3$ mini-cubes that make up the inside of the cube and that are not showing do not have stickers on it. Thus, the total number of mini-cubes that do have stickers on it is:

$$4^3-2^3=56$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "56"
    ],
    "companies": [
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Blackedge Capital"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sJ2ESe9arGzfZ9GbiEMy",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:14:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 18,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rubik's Cube Stickers",
    "topic": "brainteasers",
    "urlEnding": "rubiks-cube-stickers",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Blackedge Capital"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "id": "sJ2ESe9arGzfZ9GbiEMy",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rubik's Cube Stickers",
    "topic": "brainteasers",
    "urlEnding": "rubiks-cube-stickers"
  }
}
```
