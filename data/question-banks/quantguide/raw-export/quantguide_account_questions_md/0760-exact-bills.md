# QuantGuide Question

## 760. Exact Bills I

**Metadata**

- ID: `dmzilkc2VYLBH86yxme3`
- URL: https://www.quantguide.io/questions/exact-bills
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver
- Source: Kaushik - Optiver Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-6 10:34:31 America/New_York
- Last Edited By: Gabe

### 题干

Given the denominations of $\$1$, $\$5$, $\$20$, and $\$100$ dollar bills, what is the fewest amount of bills needed to form any amount from $\$1$ to $\$100$ by taking a subset of the bills? In other words, how many bills do you need to form any number from $\$1$ to $\$100$ where you can reuse bills?

### Hint

The amount that requires the most bills will logically be a high number. 

### 解答

Logically speaking, the most difficult amount to form will be very high. For example, any number from $\$80$ to $\$90$ can be harder to form by just adding $\$10$ to it (requires two more bill). Testing a few possibilities out, you'll see that $\$99$ is the most difficult amount to form as it requires $4$ $\$20$ bills, $3$ $\$5$ bill, and $4$ $\$1$ bills which gives us $11$ bills. However, we can't make $\$100$ yet so we can either another $\$1$ bill to our collection or a $\$100$ bill which brings out total to $12$ bills. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "dmzilkc2VYLBH86yxme3",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-6 10:34:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6206951,
    "source": "Kaushik - Optiver Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Exact Bills I",
    "topic": "brainteasers",
    "urlEnding": "exact-bills",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "dmzilkc2VYLBH86yxme3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Exact Bills I",
    "topic": "brainteasers",
    "urlEnding": "exact-bills"
  }
}
```
