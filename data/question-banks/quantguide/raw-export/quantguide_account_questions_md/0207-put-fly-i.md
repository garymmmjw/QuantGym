# QuantGuide Question

## 207. Put Fly I

**Metadata**

- ID: `TYvzckmOBgkPoU7e6gc7`
- URL: https://www.quantguide.io/questions/put-fly-i
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-31 10:38:00 America/New_York
- Last Edited By: Gabe

### 题干

We have the underlying $S$ with initial price $S_0 = 15$. We have access to the following calls. The calls are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(10, 8.1) \\ 
(15, 4.2) \\ 
(20, 1.4) \\ 
\end{align*}$$
$$\\$$

What is the time-$0$ price of a $10/15/20$ put-fly?




### Hint

Use put-call parity.

### 解答

The put-fly is irrelevant here. A put-fly and a call-fly have the exact same payoff. The only difference is that one uses puts while the other uses calls. By no-arbitrage pricing, they must have the same payoff. A butterfly longs $1$ unit of the wings and shorts $2$ units of the body. So, we have the following:

$$V_0 = 8.1 - 2(4.2) + 1.4 = 1.1$$

We can also use put-call parity to obtain the same value. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "TYvzckmOBgkPoU7e6gc7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 10:38:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1603478,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Fly I",
    "topic": "finance",
    "urlEnding": "put-fly-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "TYvzckmOBgkPoU7e6gc7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Fly I",
    "topic": "finance",
    "urlEnding": "put-fly-i"
  }
}
```
