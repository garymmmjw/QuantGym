# QuantGuide Question

## 1067. Compound Interest II

**Metadata**

- ID: `P3RLFynWxmmPrAlhmRVZ`
- URL: https://www.quantguide.io/questions/compound-interest-ii
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Five Rings
- Source: 5r
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-25 20:24:11 America/New_York
- Last Edited By: Gabe

### 题干

You start with $\$100$ in your bank account today. You invest in a stock that yields $1\%$ interest that is compounded daily. To the nearest dollar, how much will you have in your bank account after $15$ days?

### Hint

Use the Taylor approximation $e^x \approx 1+x$

### 解答

Using the Taylor approximation $e^x \approx 1+x$, we can see that $100(1.01)^{15} \approx 100(1 + 0.15) = 115$. However, we must adjust up a little bit for the interest that accrues over the $15$ days i.e. it is not exactly $\$1$ per day. Therefore, a natural guess is $\$116$, which is correct. One can see it will not go to $\$117$ by the fact that the absolute maximum that could be attained is $1.15 \cdot 15 = 17.25$, which is if you constantly receive $1.15$ interest a day. However, this is a large overestimate, so $116$ is a better guess.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "116"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "P3RLFynWxmmPrAlhmRVZ",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-25 20:24:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8696732,
    "source": "5r",
    "status": "published",
    "tags": [],
    "title": "Compound Interest II",
    "topic": "brainteasers",
    "urlEnding": "compound-interest-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "P3RLFynWxmmPrAlhmRVZ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Compound Interest II",
    "topic": "brainteasers",
    "urlEnding": "compound-interest-ii"
  }
}
```
