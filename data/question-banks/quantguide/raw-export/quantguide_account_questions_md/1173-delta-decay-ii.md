# QuantGuide Question

## 1173. Delta Decay II

**Metadata**

- ID: `yyZ4vJIf92L4eNI9v1bp`
- URL: https://www.quantguide.io/questions/delta-decay-ii
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:59:16 America/New_York
- Last Edited By: Gabe

### 题干

You currently have a European straddle (not necessary at-the-money) at strike $K = 25$ and with underlying price $S_0 = 27$.

The call option has $\Delta = 0.72$ and the put option has $\Delta = -0.28$. The straddle expires in exactly $1$ hour. Currently, you are delta-hedged by buying (or selling) the underlying such that the overall portfolio $\Delta$ is $0$. The straddle expires in exactly $1$ hour. Let's say $30$ minutes pass and the underlying remains at the same price, how many units of the underlying do you need to buy/sell to remain delta-hedged? Enter $-x$ if your answer is to sell $x$ units. Fractional quantities are allowed. 




### Hint

Assume that the delta will decay equally within the last hour. 

### 解答

At expiry, the $\Delta$ of ITM calls will be $1$ and the $\Delta$ of OTM puts will be $0$. Usually, delta-decay is non-linear, but we are dealing with an extremely small time-frame, so we can assume linearity in decay. This means that the delta of the call option will increase by $.28/2=.14$ in $30$ minutes and the delta of the put option will increase by $0.28/2=.14$ in $30$ minutes. Overall, our $\Delta$ will increase by $0.14 + 0.14 = 0.28$. 

$$\\$$

We were initially delta-hedged, but now we have a $\Delta$ of $0.28$. To remain delta-hedged, we need to short $0.28$ units of the underlying. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-.28"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "yyZ4vJIf92L4eNI9v1bp",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:59:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9766697,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Delta Decay II",
    "topic": "finance",
    "urlEnding": "delta-decay-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "yyZ4vJIf92L4eNI9v1bp",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Delta Decay II",
    "topic": "finance",
    "urlEnding": "delta-decay-ii"
  }
}
```
