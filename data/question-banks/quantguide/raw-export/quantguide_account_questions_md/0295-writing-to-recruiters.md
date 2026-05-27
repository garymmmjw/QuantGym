# QuantGuide Question

## 295. Writing to Recruiters

**Metadata**

- ID: `bWGniQwWPBt6QlhJpYE8`
- URL: https://www.quantguide.io/questions/writing-to-recruiters
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DRW
- Source: Kaushik - Cut the Knot
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-8 17:41:28 America/New_York
- Last Edited By: Gabe

### 题干

You have $N$ letters for recruiters at $N$ firms. You forgot which recruiter works for which firm so you randomly assign each letter to a firm (only one letter going to each firm). What is the expected number of letters going to their correct firm?


### Hint

Try using indicator variables.

### 解答

This is a classic indicator variable problem. Let $E_{k}$ be the indicator variable for each $k$ letter where it is $1$ if the letter goes to the right firm and $0$ if it doesn’t. Then $T = \displaystyle \sum_{i=1}^N E_i$ gives the total number of letters that go to the correct firm. By linearity of expectation and the fact that the random variables are exchangeable, $\mathbb{E}[T] = N\mathbb{E}[E_1]$. The probability for each of these letters to go to their correct firm is $\dfrac{1}{N}$. Thus, $$\mathbb{E}[T] = N\cdot\dfrac{1}{N} = 1$$ You can double check this is the case for small values $N$, such as $2$ and $3$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "bWGniQwWPBt6QlhJpYE8",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 17:41:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2281991,
    "source": "Kaushik - Cut the Knot",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Writing to Recruiters",
    "topic": "probability",
    "urlEnding": "writing-to-recruiters",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "bWGniQwWPBt6QlhJpYE8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Writing to Recruiters",
    "topic": "probability",
    "urlEnding": "writing-to-recruiters"
  }
}
```
