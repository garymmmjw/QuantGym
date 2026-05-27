# QuantGuide Question

## 1177. Up or Down

**Metadata**

- ID: `JFOYlZpxiB4CYbjWCqeG`
- URL: https://www.quantguide.io/questions/up-or-down
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Virtu Financial
- Source: sig, edited
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-18 11:52:50 America/New_York
- Last Edited By: Gabe

### 题干

If you have an asset that goes up or down $20\%$ each day from its price the day prior with equal probability, what’s the probability that after $10$ days the asset’s price is unchanged?

### Hint

If there was a price rise on $k$ of the days, then for the price to be unchanged, we would need $(1.2)^k(0.8)^{10-k} = 1$

### 解答

If there was a price rise on $k$ of the days, then for the price to be unchanged, we would need $(1.2)^k(0.8)^{10-k} = 1$, as the price went down the other $10-k$ days. Equivalently, this means that $(1.2)^k = (1.25)^{10-k}$, which does not hold for an integer $k$. Therefore, it is impossible for this to occur.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "JFOYlZpxiB4CYbjWCqeG",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-18 11:52:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9795991,
    "source": "sig, edited",
    "status": "published",
    "tags": [],
    "title": "Up or Down",
    "topic": "brainteasers",
    "urlEnding": "up-or-down",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "JFOYlZpxiB4CYbjWCqeG",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Up or Down",
    "topic": "brainteasers",
    "urlEnding": "up-or-down"
  }
}
```
