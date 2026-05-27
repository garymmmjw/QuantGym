# QuantGuide Question

## 647. Binary Strangle

**Metadata**

- ID: `XT9NWO8USydmLbZYrgJE`
- URL: https://www.quantguide.io/questions/binary-strangle
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:13:00 America/New_York
- Last Edited By: Gabe

### 题干

Let's define a binary strangle as an option that pays $1$ if $S_T >= K_2$ or if $S_T <= K_1$. Here, we have $K_1 = 15$ and $K_2 = 20$. You have access to the following binary calls. What is the time-$0$ price of the binary strangle? Assume a discount factor of $Z_0 = 0.9$. The binary calls are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(15, 0.73) \\ 
(17.5, 0.34) \\ 
(20, 0.13) 
\end{align*}$$



### Hint

How can we replicate a binary put with a binary call? 

### 解答

We can replicate a binary strangle as a binary call with strike $K = 20$ and a binary put with strike $K = 15$. We don't have a binary put, so we must replicate the $K = 15$ binary put with a $K = 15$ binary call. We know that $P_0 = Z_0 - C_0 = 0.9 - 0.73 = 0.17$. 

Combining it all, we obtain $V_0 = C_0 + P_0 = 0.13 + 0.17 = 0.30$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "XT9NWO8USydmLbZYrgJE",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5203187,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binary Strangle",
    "topic": "finance",
    "urlEnding": "binary-strangle",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "XT9NWO8USydmLbZYrgJE",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binary Strangle",
    "topic": "finance",
    "urlEnding": "binary-strangle"
  }
}
```
