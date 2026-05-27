# QuantGuide Question

## 221. Resell Painting

**Metadata**

- ID: `7c1GMysFoSZ1MUs3kq1B`
- URL: https://www.quantguide.io/questions/resell-painting
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, SIG, Virtu Financial
- Source: Kaushik - JS Glassdoor
- Tags: Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-4 22:51:50 America/New_York
- Last Edited By: Gabe

### 题干

You are currently bidding for a painting. You know that the value of the painting is between $\$0$ and $\$100,000$ uniformly. If your bid is greater than the value of the painting, you win and sell it to an art museum at a price of $1.5$ times the value. What's your bid to max your profit? If you can not profit, bid $\$0$.


### Hint

Do you lose out on anything if your bid doesn't win the painting?

### 解答

If your bid is lower than the value of the painting, you won’t lose anything, so no harm no foul. However, let's say that you do win the painting. This means that you bid higher than the actual value. Let $x$ be your bid. Given you won the bid, we know that the the value is at most $x$. Therefore, the conditional distribution of the value of the painting is $\text{Unif}(0,x)$. On average, the value of the painting will be $\frac{x}{2}$. This means we will be able to sell it, on average, for $ \frac{1.5\cdot x}{2} = \frac{3}{4}x$. However, this is less than $x$, the amount we paid for the painting. So we shouldn’t bid on this painting, thus the answer is $\$0$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "7c1GMysFoSZ1MUs3kq1B",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 22:51:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1768766,
    "source": "Kaushik - JS Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Resell Painting",
    "topic": "probability",
    "urlEnding": "resell-painting",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "7c1GMysFoSZ1MUs3kq1B",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Resell Painting",
    "topic": "probability",
    "urlEnding": "resell-painting"
  }
}
```
