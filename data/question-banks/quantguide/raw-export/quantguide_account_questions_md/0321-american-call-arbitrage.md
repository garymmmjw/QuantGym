# QuantGuide Question

## 321. American Call Arbitrage

**Metadata**

- ID: `FBfZb1EfIUrtiDuDiPpX`
- URL: https://www.quantguide.io/questions/american-call-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-11 10:26:25 America/New_York
- Last Edited By: Gabe

### 题干

We have $2$ call options on the underlying $S$ with initial price $S_0 = 24$ and strike $K = 21$. One option is European and the other is American. A European option is one where you can only exercise it at expiry while an American option can be exercised any time. The European option is valued at $3.21$ while the American option is valued at $3.15$. You also have access to bonds with discount rate $Z_0 = 0.9$. The underlying pays no dividends. 

$$\\$$

What is the arbitrage? Give the answer in the form of the initial credit you receive (round to $2$ decimal points). Answer $-1$ if there is no arbitrage. 

### Hint

What is the more valuable? The European or American call? 

### 解答

American and European calls on non-dividend paying stocks should have the same value. The rationale is follows: if you can exercise the American option and gain $S-K$ anytime, it must be worth at least the European call for there to be no arbitrage. 

$$\\$$

We will short the European call and long the American call. If the call expires in-the-money, then both options have value $S - K$ and we obtain $0$, but we keep our $0.06$. If the calls expire out-of-the-money, then both options have value $0$ and we once against keep our $0.06$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.06"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "FBfZb1EfIUrtiDuDiPpX",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-11 10:26:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2482991,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "American Call Arbitrage",
    "topic": "finance",
    "urlEnding": "american-call-arbitrage",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "FBfZb1EfIUrtiDuDiPpX",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "American Call Arbitrage",
    "topic": "finance",
    "urlEnding": "american-call-arbitrage"
  }
}
```
