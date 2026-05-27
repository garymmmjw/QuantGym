# QuantGuide Question

## 502. Taxman

**Metadata**

- ID: `LUTryAPrdUA4G1wuWPhO`
- URL: https://www.quantguide.io/questions/taxman
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: IMC
- Source: Kaushik - IMC Trader Round
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-9 18:56:04 America/New_York
- Last Edited By: Gabe

### 题干

We start with the numbers $1-10$ on a board. You pick a number. The taxman then takes all the numbers that divide it evenly. We do this until there are no numbers left. However, you can only pick numbers that have at least one factor that hasn't been taken yet. If there are any unclaimed numbers at the end, the taxman takes them. Your score is the total of the numbers that you take. Following optimal strategy, what is your max possible score?

### Hint

Out of all the prime numbers, which one should you take?

### 解答

Notice that we can only take one prime off the board since all the primes are divisible only by $1$ and themselves. Thus for our first pick, lets choose $7$ (the largest prime on the board). The taxman then takes $1$ and the board becomes $2$, $3$, $4$, $5$, $6$, $8$, $9$, and $10$. We can't choose $2$, $3$, or $5$ since they are prime and don't have any more factors. We should never choose $4$ because we then can't take $8$ later. In this case, the best choice to take is $9$ since it is one of the larger numbers and only has one factor left ($3$). Now the board becomes $2$, $4$, $5$, $6$, $8$, and $10$. Out of this set, $6$ is the only number with only one factor so lets take it. Now the taxman takes $2$. The board is now $4$, $5$, $8$, and $10$. Now it doesn't matter what order we take $8$ and $10$, the taxman will get $4$ and $5$. Thus the numbers we have are $6$, $7$, $8$, $9$, and $10$ which gives you a score of $40$ and the taxman has $1$, $2$, $3$, $4$, $5$ which gives them a score of $15$. You win with a score of $40$!

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "40"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "LUTryAPrdUA4G1wuWPhO",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-9 18:56:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4010901,
    "randomizable": "",
    "source": "Kaushik - IMC Trader Round",
    "status": "published",
    "tags": [],
    "title": "Taxman",
    "topic": "brainteasers",
    "urlEnding": "taxman",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "id": "LUTryAPrdUA4G1wuWPhO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Taxman",
    "topic": "brainteasers",
    "urlEnding": "taxman"
  }
}
```
