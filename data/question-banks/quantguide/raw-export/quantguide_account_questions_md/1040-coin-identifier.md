# QuantGuide Question

## 1040. Coin Identifier

**Metadata**

- ID: `UkLkhvvZoq7oeIIOV9BL`
- URL: https://www.quantguide.io/questions/coin-identifier
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC
- Source: IMC
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Brian walks to the convenience store with $\$0.60$ in his pocket. His money is made of solely nickels, dimes, and quarters. If Brian has $N$ coins in his pocket, find the smallest value of $N$ such that the quantities of each type of coin in Brian's pocket can't be uniquely identified.

### Hint

Note that $\$0.40$ is the smallest denomination that can be written in two different ways using the same amount of coins.

### 解答

Clearly $N = 1$ and $N = 2$ don't work, as you can't obtain $\$0.60$ from just one or two coins of these denominations. For $N = 3$, we can see that $2$ quarters and $1$ dime work. There are no other ways to obtain the sum besides this.

$$$$

Now, note that $\$0.40$ is the smallest denomination that can be written in two different ways using the same amount of coins. Namely, we can use $4$ coins to write $\$0.40$ as $1$ quarter and $3$ nickels OR $4$ dimes. Therefore, we can just append $2$ dimes to each of these combinations, and we get that $N = 6$ is the smallest value for which this is true. 

$$$$

To verify $\$0.40$ is the smallest value, we know that the number is at least $\$0.25$, as otherwise we can't utilize quarters, so test $\$0.30$ and $\$0.35$ and see that they don't work.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "UkLkhvvZoq7oeIIOV9BL",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8487239,
    "source": "IMC",
    "status": "published",
    "tags": [],
    "title": "Coin Identifier",
    "topic": "brainteasers",
    "urlEnding": "coin-identifier"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "UkLkhvvZoq7oeIIOV9BL",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Coin Identifier",
    "topic": "brainteasers",
    "urlEnding": "coin-identifier"
  }
}
```
