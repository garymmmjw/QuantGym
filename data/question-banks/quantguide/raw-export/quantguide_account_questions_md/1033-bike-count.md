# QuantGuide Question

## 1033. Bike Count

**Metadata**

- ID: `006Ec0FQD6dEvLHCUJpU`
- URL: https://www.quantguide.io/questions/bike-count
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://braineaser.com/brainteasers/7-quant-interview-questions-and-answers/
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-16 18:04:23 America/New_York
- Last Edited By: Gabe

### 题干

You know that a bike shop has some weird bikes $-$ their bikes are identical, and each bike’s front and back wheels has at least one spoke each, but front and back wheels may or may not have different numbers of spokes. You know there are between $200$ and $300$ spokes in total in the shop and at least $2$ bikes.

If you were told the exact number of spokes, you would be able to figure out the number of bikes. Unfortunately, you do not know the exact number of spokes, but just knowing that you could figure it out with this information is sufficient for you to deduce the answer. How many bikes are in the shop?

### Hint

The key is knowing you could figure out the number of bicycles if you knew the total number of spokes. What can you say about the number of spokes relative to the number of bikes? Think about primes as well.

### 解答

The key is knowing you could figure out the number of bicycles if you knew the total number of spokes. Note that the this implies that the number of spokes must equal the number of bikes, as otherwise, to get some combination with $xy$ total spokes, you could have $x$ bikes and $y$ spokes or vice versa. Even if it were perfect square, it would have to be prime, as with say $225$, you could $9$ bikes with $25$ spokes or $15$ bikes with $15$ spokes. Since each bike has at least $2$ spokes, we don't need to worry about the case with $1$ spoke/$1$ bike. The only prime whose square is in the range $200$ to $300$ is $289$, so there are $17$ bikes with $17$ spokes each.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "006Ec0FQD6dEvLHCUJpU",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 18:04:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8434906,
    "source": "https://braineaser.com/brainteasers/7-quant-interview-questions-and-answers/",
    "status": "published",
    "tags": [],
    "title": "Bike Count",
    "topic": "brainteasers",
    "urlEnding": "bike-count",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "006Ec0FQD6dEvLHCUJpU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Bike Count",
    "topic": "brainteasers",
    "urlEnding": "bike-count"
  }
}
```
