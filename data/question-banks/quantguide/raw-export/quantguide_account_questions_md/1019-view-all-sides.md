# QuantGuide Question

## 1019. View All Sides

**Metadata**

- ID: `ELoetu6YDEMnAGSxp8TC`
- URL: https://www.quantguide.io/questions/view-all-sides
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Virtu Financial, Akuna, Two Sigma, SIG, Citadel, Squarepoint Capital, IMC, Optiver, DRW, Jane Street, WorldQuant, Old Mission, Hudson River Trading, Chicago Trading Company, Maven Securities, Goldman Sachs, TransMarket Group
- Source: classic
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-8 10:07:19 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many times do you need to roll a standard fair $6-$sided die to observe all of the sides?

### Hint

Let $T_i$ be the number of rolls needed to observe the $i$th distinct side given that $(i-1)$ distinct sides have already appeared. Then $T = T_1 + \dots + T_6$ gives the total number of rolls needed to observe all of the sides of the die.

### 解答

Let $T_i$ be the number of rolls needed to observe the $i$th distinct side given that $(i-1)$ distinct sides have already appeared. Then $T = T_1 + \dots + T_6$ gives the total number of rolls needed to observe all of the sides of the die. We know that $T_1 = 1$, as the first roll always yields a side not seen yet. We also have that $T_2 \sim \text{Geom}(5/6)$, as $5$ of the $6$ remaining sides are not observed yet. More generally, $T_i \sim \text{Geom}\left(\dfrac{7-i}{6}\right)$, as $7-i$ of the sides have not been observed yet. Thus, $\mathbb{E}[T_i] = \dfrac{6}{7-i}$. By linearity of expectation, we get that $$\mathbb{E}[T] = \displaystyle \sum_{i=1}^6 \dfrac{6}{7-i} = 6 \displaystyle \sum_{i=1}^6 \dfrac{1}{i} = 14.7$$ The equality between sums occurs by re-indexing the sum

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14.7"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Old Mission"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Maven Securities"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ELoetu6YDEMnAGSxp8TC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:07:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8262195,
    "source": "classic",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "View All Sides",
    "topic": "probability",
    "urlEnding": "view-all-sides",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Old Mission"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Maven Securities"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "ELoetu6YDEMnAGSxp8TC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "View All Sides",
    "topic": "probability",
    "urlEnding": "view-all-sides"
  }
}
```
