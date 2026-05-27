# QuantGuide Question

## 930. Deriving Put-Call Parity I

**Metadata**

- ID: `6ee0GO1WtFKvILFa3z1K`
- URL: https://www.quantguide.io/questions/pricing-a-forward
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-15 09:25:22 America/New_York
- Last Edited By: Gabe

### 题干

A forward contract is a derivative that pays $S_T - K$ at expiration, where $K$ is the strike price. More specifically, you will get paid if $S_T > K$. If $S_T < K$, then you must pay the other party. 

You have access to the underlying $S$, which has an initial price $S_0 = 3$. You also have access to bonds, which pay $1$ at time-$T$. The interest rates are $0.04$ continuously compounded. 

Find the time-$0$ price of the forward contract with strike $K = 2$ and $T = 1$. Round to $2$ decimal points. 

### Hint

Find the replication.

### 解答

To find the replication, we can see that $S_T - K$ and $S$ have the same slope of $1$. However, the forward product has a shift of $-K$. We can replicate these "shifts" by using bonds. However, we need to discount the bond to time-$0$. We know that the $2$ bonds pays $2$ at time-$T$. Discounting, we get $2e^{-.04}=1.92$. 

Combining everything, we get $F_0 = 3 - 2e^{-.04} \approx 1.08$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.08"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6ee0GO1WtFKvILFa3z1K",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-15 09:25:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7607794,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Deriving Put-Call Parity I",
    "topic": "finance",
    "urlEnding": "pricing-a-forward",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "6ee0GO1WtFKvILFa3z1K",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Deriving Put-Call Parity I",
    "topic": "finance",
    "urlEnding": "pricing-a-forward"
  }
}
```
